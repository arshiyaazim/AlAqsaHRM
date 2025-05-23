"""
Main Flask application file.
Contains routes and API endpoints.
"""
from flask import Flask, jsonify, render_template, send_from_directory, request
from auth import login_required, role_required, get_current_user
from models import Employee, Attendance, db
import app_config
from datetime import datetime, timedelta
import os
import random

# Define API routes
def setup_routes(app):
    """Set up routes for the Flask application."""
    
    # Frontend routes - catch-all for React Router
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def catch_all(path):
        """Serve the frontend application."""
        # Check if path is an API route
        if path.startswith('api/'):
            # Let the API routes handle this
            return app.view_functions['api_health']()
        
        # Serve the React app for all other routes
        return send_from_directory(app.static_folder, 'index.html')
    
    # API routes
    @app.route('/api/health', methods=['GET'])
    def api_health():
        """Health check endpoint for application status monitoring."""
        return jsonify({
            "status": "ok",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0"
        })
    
    @app.route('/api/dashboard', methods=['GET'])
    @login_required
    def dashboard():
        """Dashboard information endpoint."""
        user = get_current_user()
        
        # Count employees, active attendance, etc.
        employee_count = Employee.query.count()
        today = datetime.utcnow().date()
        today_start = datetime.combine(today, datetime.min.time())
        today_end = datetime.combine(today, datetime.max.time())
        
        today_attendance = Attendance.query.filter(
            Attendance.date.between(today_start, today_end)
        ).count()
        
        # Get some basic statistics
        stats = {
            "employee_count": employee_count,
            "today_attendance": today_attendance,
            "user": user.to_dict() if user else None,
            "company": {
                "name": app_config.COMPANY_NAME,
                "tagline": app_config.COMPANY_TAGLINE
            }
        }
        
        return jsonify(stats)
    
    @app.route('/api/employees', methods=['GET'])
    @login_required
    def get_employees():
        """Get all employees."""
        # Get query parameters for pagination
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        # Limit per_page to a reasonable value (1-50)
        per_page = max(1, min(per_page, 50))
        
        # Query employees with pagination
        employees_query = Employee.query.paginate(page=page, per_page=per_page)
        
        # Convert to dict
        employees = [emp.to_dict() for emp in employees_query.items]
        
        # If no employees and this is the first page, create dummy data for testing
        if not employees and page == 1:
            seed_dummy_employees()
            employees_query = Employee.query.paginate(page=page, per_page=per_page)
            employees = [emp.to_dict() for emp in employees_query.items]
        
        return jsonify({
            "employees": employees,
            "pagination": {
                "total": employees_query.total,
                "pages": employees_query.pages,
                "page": page,
                "per_page": per_page,
                "has_next": employees_query.has_next,
                "has_prev": employees_query.has_prev
            }
        })
    
    @app.route('/api/employees/<int:employee_id>', methods=['GET'])
    @login_required
    def get_employee(employee_id):
        """Get a specific employee by ID."""
        employee = Employee.query.get(employee_id)
        
        if not employee:
            return jsonify({"error": "Employee not found"}), 404
        
        return jsonify(employee.to_dict())
    
    @app.route('/api/attendance', methods=['GET'])
    @login_required
    def get_attendance():
        """Get attendance records."""
        # Query parameters
        employee_id = request.args.get('employee_id', type=int)
        date_str = request.args.get('date')
        
        # Base query
        query = Attendance.query
        
        # Filter by employee_id if provided
        if employee_id:
            query = query.filter(Attendance.employee_id == employee_id)
        
        # Filter by date if provided
        if date_str:
            try:
                date = datetime.strptime(date_str, '%Y-%m-%d').date()
                start_of_day = datetime.combine(date, datetime.min.time())
                end_of_day = datetime.combine(date, datetime.max.time())
                query = query.filter(Attendance.date.between(start_of_day, end_of_day))
            except ValueError:
                return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
        
        # Default to last 30 days if no filters
        if not employee_id and not date_str:
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            query = query.filter(Attendance.date >= thirty_days_ago)
        
        # Execute query and convert to list of dicts
        attendance_records = [record.to_dict() for record in query.all()]
        
        return jsonify({
            "attendance": attendance_records,
            "count": len(attendance_records)
        })
    
    @app.route('/api/maps/apikey', methods=['GET'])
    @login_required
    def get_maps_api_key():
        """Get the Google Maps API key."""
        return jsonify({
            "apiKey": app_config.GOOGLE_MAPS_API_KEY
        })
    
    @app.route('/api/company', methods=['GET'])
    def get_company_info():
        """Get company information."""
        return jsonify({
            "name": app_config.COMPANY_NAME,
            "tagline": app_config.COMPANY_TAGLINE,
            "logo": app_config.COMPANY_LOGO
        })

def seed_dummy_employees():
    """
    Seed the database with dummy employee data for testing.
    Only used when no employees exist in the database.
    """
    # Check if employees already exist
    if Employee.query.count() > 0:
        return
    
    # Sample data
    departments = ["Engineering", "Marketing", "Sales", "Human Resources", "Finance"]
    positions = ["Manager", "Senior Developer", "Junior Developer", "Analyst", "Specialist", "Director"]
    
    # Create 10 dummy employees
    for i in range(1, 11):
        first_name = f"Employee{i}"
        last_name = f"Sample{i}"
        employee = Employee(
            employee_id=f"EMP{i:03d}",
            first_name=first_name,
            last_name=last_name,
            email=f"{first_name.lower()}.{last_name.lower()}@example.com",
            phone=f"+1 555-{random.randint(100, 999)}-{random.randint(1000, 9999)}",
            position=random.choice(positions),
            department=random.choice(departments),
            hire_date=datetime.utcnow() - timedelta(days=random.randint(30, 1000)),
            salary=random.randint(50000, 150000),
            active=True,
            address=f"{random.randint(100, 999)} Main St, Anytown, State {random.randint(10000, 99999)}"
        )
        db.session.add(employee)
    
    db.session.commit()
    print("Added 10 dummy employees to the database.")