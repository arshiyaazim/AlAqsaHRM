"""
Field Attendance Tracker - Database Models

This file defines the SQLAlchemy models for the application.
"""
import os
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model):
    """User model for authentication and authorization"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    email = db.Column(db.String(120), unique=True)
    name = db.Column(db.String(120))
    role = db.Column(db.String(20), default='viewer', nullable=False)
    active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime)
    last_login = db.Column(db.DateTime)
    
    @staticmethod
    def create_admin():
        """Create admin user if it doesn't exist"""
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            admin_password = os.environ.get('ADMIN_PASSWORD', 'admin123')
            admin = User(
                username='admin',
                password=generate_password_hash(admin_password),
                name='Administrator',
                role='admin'
            )
            db.session.add(admin)
            try:
                db.session.commit()
                print("Admin user created successfully")
                return True
            except Exception as e:
                db.session.rollback()
                print(f"Error creating admin user: {str(e)}")
                return False
        return True
    
    def verify_password(self, password):
        """Verify that the provided password matches the stored hash"""
        return check_password_hash(self.password, password)

class Admin(db.Model):
    """Legacy Admin model for backward compatibility"""
    __tablename__ = 'admins'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    email = db.Column(db.String(120), unique=True)
    name = db.Column(db.String(120))
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime)
    last_login = db.Column(db.DateTime)
    
    @staticmethod
    def create_admin():
        """Create admin user in legacy admins table if it doesn't exist"""
        admin = Admin.query.filter_by(username='admin').first()
        if not admin:
            admin_password = os.environ.get('ADMIN_PASSWORD', 'admin123')
            admin = Admin(
                username='admin',
                password=generate_password_hash(admin_password),
                name='Administrator'
            )
            db.session.add(admin)
            try:
                db.session.commit()
                print("Admin user created in legacy admins table")
                return True
            except Exception as e:
                db.session.rollback()
                print(f"Error creating admin in legacy table: {str(e)}")
                return False
        return True
    
    def verify_password(self, password):
        """Verify that the provided password matches the stored hash"""
        return check_password_hash(self.password, password)

# Add initialization function to create tables and admin user
def init_db_models():
    """Initialize database tables and create admin user"""
    try:
        db.create_all()
        User.create_admin()
        Admin.create_admin()
        return True
    except Exception as e:
        print(f"Error initializing database models: {str(e)}")
        return False