"""
Field Attendance Tracker - CLI Commands

This file provides command-line interface tools for database management.
"""
import os
import click
from flask.cli import with_appcontext
from flask import current_app
from models import db, User, Admin
from werkzeug.security import generate_password_hash

@click.command('init-db')
@with_appcontext
def init_db_command():
    """Initialize database tables and create admin user."""
    try:
        # Create database tables
        db.create_all()
        click.echo('Database tables created successfully.')
        
        # Create admin user in both tables if they don't exist
        admin_username = os.environ.get('ADMIN_USERNAME', 'admin')
        admin_password = os.environ.get('ADMIN_PASSWORD', 'admin123')
        
        # Create in users table if not exists
        admin_user = User.query.filter_by(username=admin_username, role='admin').first()
        if not admin_user:
            admin_user = User()
            admin_user.username = admin_username
            admin_user.password = generate_password_hash(admin_password)
            admin_user.name = 'Administrator'
            admin_user.role = 'admin'
            
            db.session.add(admin_user)
            try:
                db.session.commit()
                click.echo(f"Admin user '{admin_username}' created successfully in users table.")
            except Exception as e:
                db.session.rollback()
                click.echo(f"Error creating admin user in users table: {str(e)}")
        else:
            click.echo("Admin user already exists in users table.")
            
        # Create in admins table if not exists
        admin_legacy = Admin.query.filter_by(username=admin_username).first()
        if not admin_legacy:
            admin_legacy = Admin()
            admin_legacy.username = admin_username
            admin_legacy.password = generate_password_hash(admin_password)
            admin_legacy.name = 'Administrator'
            
            db.session.add(admin_legacy)
            try:
                db.session.commit()
                click.echo(f"Admin user '{admin_username}' created successfully in admins table.")
            except Exception as e:
                db.session.rollback()
                click.echo(f"Error creating admin user in admins table: {str(e)}")
        else:
            click.echo("Admin user already exists in admins table.")
            
    except Exception as e:
        click.echo(f"Error initializing database: {str(e)}")

@click.command('reset-admin')
@with_appcontext
def reset_admin_command():
    """Reset the admin user password."""
    try:
        admin_username = os.environ.get('ADMIN_USERNAME', 'admin')
        admin_password = os.environ.get('ADMIN_PASSWORD', 'admin123')
        
        # Update in users table
        admin_user = User.query.filter_by(username=admin_username, role='admin').first()
        if admin_user:
            admin_user.password = generate_password_hash(admin_password)
            db.session.commit()
            click.echo(f"Admin user password reset in users table.")
        
        # Update in admins table
        admin_legacy = Admin.query.filter_by(username=admin_username).first()
        if admin_legacy:
            admin_legacy.password = generate_password_hash(admin_password)
            db.session.commit()
            click.echo(f"Admin user password reset in admins table.")
            
        if not admin_user and not admin_legacy:
            click.echo("Admin user not found. Run init-db to create it.")
            
    except Exception as e:
        click.echo(f"Error resetting admin password: {str(e)}")

def register_commands(app):
    """Register CLI commands with the Flask app."""
    app.cli.add_command(init_db_command)
    app.cli.add_command(reset_admin_command)