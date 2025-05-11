"""
Field Attendance Tracker - Authentication Module

This file handles user authentication and login functionality.
"""
import logging
from functools import wraps
from flask import request, session, redirect, url_for, flash, render_template, g
from models import User, Admin, db
from werkzeug.security import check_password_hash
from app_config import ADMIN_USERNAME, ADMIN_PASSWORD

def login_required(view):
    """View decorator that redirects anonymous users to the login page."""
    @wraps(view)
    def wrapped_view(**kwargs):
        if g.user is None:
            return redirect(url_for('login'))
        return view(**kwargs)
    return wrapped_view

def role_required(roles):
    """View decorator that requires specific role(s) for access."""
    def decorator(view):
        @wraps(view)
        def wrapped_view(**kwargs):
            if g.user is None:
                return redirect(url_for('login'))
            
            # If string is passed, convert to list
            role_list = [roles] if isinstance(roles, str) else roles
            
            if g.user.role not in role_list:
                flash('You do not have permission to access this page.', 'danger')
                return redirect(url_for('index'))
                
            return view(**kwargs)
        return wrapped_view
    return decorator

def admin_required(view):
    """Decorator for routes that require admin privileges."""
    @wraps(view)
    def wrapped_view(**kwargs):
        # Legacy admin check
        if session.get('admin_logged_in'):
            return view(**kwargs)
        
        # New user model check
        if g.user and g.user.role == 'admin':
            return view(**kwargs)
            
        flash('Admin login required.', 'danger')
        return redirect(url_for('admin_login'))
    return wrapped_view

def load_logged_in_user():
    """Load the current user based on session data."""
    user_id = session.get('user_id')
    
    if user_id is None:
        g.user = None
    else:
        try:
            g.user = User.query.get(user_id)
        except Exception as e:
            logging.error(f"Error loading user: {str(e)}")
            g.user = None

def do_login(username, password):
    """
    Perform login authentication against both User and Admin models.
    Returns tuple (success, user, is_admin)
    """
    # Try exact match with hardcoded admin credentials
    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        # Direct admin login - find/create user and bypass hash check
        try:
            user = User.query.filter_by(username=ADMIN_USERNAME, role='admin').first()
            
            if not user:
                # Try to create admin if doesn't exist
                from werkzeug.security import generate_password_hash
                user = User(
                    username=ADMIN_USERNAME,
                    password=generate_password_hash(ADMIN_PASSWORD),
                    name='Administrator',
                    role='admin'
                )
                db.session.add(user)
                try:
                    db.session.commit()
                    logging.info(f"Admin user created during login")
                except Exception as e:
                    db.session.rollback()
                    logging.error(f"Failed to create admin user: {str(e)}")
                    
                # Try to fetch again
                user = User.query.filter_by(username=ADMIN_USERNAME, role='admin').first()
                
            if user:
                return True, user, True
        except Exception as e:
            logging.error(f"Error during direct admin login: {str(e)}")
    
    # Normal user login
    error = None
    user = None
    is_admin = False
    
    try:
        # First check the User model (modern approach)
        user = User.query.filter_by(username=username).first()
        
        if user and user.verify_password(password):
            return True, user, (user.role == 'admin')
        
        # Then check Admin model for backward compatibility
        admin = Admin.query.filter_by(username=username).first()
        
        if admin and check_password_hash(admin.password, password):
            # For admin model login, try to find/create corresponding user
            user = User.query.filter_by(username=username).first()
            if not user:
                try:
                    user = User(
                        username=admin.username,
                        password=admin.password,  # Already hashed
                        name=admin.name,
                        role='admin',
                        email=admin.email
                    )
                    db.session.add(user)
                    db.session.commit()
                    user = User.query.filter_by(username=username).first()
                except Exception as ue:
                    logging.error(f"Error creating user from admin: {str(ue)}")
                    # Just use the admin data
                    from types import SimpleNamespace
                    user = SimpleNamespace(
                        id=admin.id,
                        username=admin.username,
                        role='admin'
                    )
            return True, user, True
    except Exception as e:
        logging.error(f"Error during login: {str(e)}")
        error = "Database error during login"
    
    return False, None, False