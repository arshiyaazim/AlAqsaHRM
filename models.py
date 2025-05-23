"""
Database models for the Flask application.
"""
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    """User model for authentication and authorization."""
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    password_hash = Column(String(128), nullable=False)
    role = Column(String(20), nullable=False, default='viewer')  # admin, hr, viewer
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __init__(self, username, email, password, role='viewer'):
        self.username = username
        self.email = email
        self.set_password(password)
        self.role = role
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'active': self.active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<User {self.username}>'

class Employee(db.Model):
    """Employee model for HR management."""
    __tablename__ = 'employees'
    
    id = Column(Integer, primary_key=True)
    employee_id = Column(String(20), unique=True, nullable=False)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    email = Column(String(120), unique=True)
    phone = Column(String(20))
    position = Column(String(50))
    department = Column(String(50))
    hire_date = Column(DateTime)
    salary = Column(Float)
    active = Column(Boolean, default=True)
    address = Column(Text)
    
    # Relationships
    attendance = relationship('Attendance', back_populates='employee')
    
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
    
    def to_dict(self):
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'email': self.email,
            'phone': self.phone,
            'position': self.position,
            'department': self.department,
            'hire_date': self.hire_date.isoformat() if self.hire_date else None,
            'salary': self.salary,
            'active': self.active,
            'address': self.address
        }
    
    def __repr__(self):
        return f'<Employee {self.employee_id}: {self.full_name()}>'

class Attendance(db.Model):
    """Attendance model for tracking employee attendance."""
    __tablename__ = 'attendance'
    
    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey('employees.id'), nullable=False)
    date = Column(DateTime, nullable=False, default=datetime.utcnow)
    check_in = Column(DateTime)
    check_out = Column(DateTime)
    status = Column(String(20), default='present')  # present, absent, late
    location_in = Column(String(100))  # Latitude,Longitude
    location_out = Column(String(100))  # Latitude,Longitude
    notes = Column(Text)
    
    # Relationships
    employee = relationship('Employee', back_populates='attendance')
    
    def to_dict(self):
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'date': self.date.isoformat() if self.date else None,
            'check_in': self.check_in.isoformat() if self.check_in else None,
            'check_out': self.check_out.isoformat() if self.check_out else None,
            'status': self.status,
            'location_in': self.location_in,
            'location_out': self.location_out,
            'notes': self.notes,
            'employee_name': self.employee.full_name() if self.employee else None
        }
    
    def __repr__(self):
        return f'<Attendance {self.id}: {self.employee_id} on {self.date}>'