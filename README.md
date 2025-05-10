# Al-Aqsa Security - Field Attendance Tracker

A comprehensive mobile-friendly web application for tracking employee attendance in the field with GPS location and photo verification, built with advanced features for workforce management.

## Features

- **Mobile-optimized interface** using Bootstrap 5
- **Clock-in/Clock-out** functionality with offline support
- **GPS location tracking** for attendance verification
- **Photo capture** option for visual verification
- **Admin dashboard** for comprehensive management
- **PWA support** for offline capabilities
- **Role-based access control** system
- **Field connection logic** for customizable data relationships
- **Error logging and management** system
- **Advanced reporting** capabilities

## Pages and Functionality

The application consists of the following pages:

1. **Login/Authentication Pages**
   - Login page
   - Registration page (admin-restricted)
   - Forgot password page (resets via asls.guards@gmail.com)

2. **User Interface Pages**
   - Dashboard (role-based view)
   - Mobile Attendance interface
   - Projects management
   - Employees management
   - Reports and analytics

3. **Admin Pages**
   - Admin Dashboard
   - User Management
   - Field/Form Management
   - Field Connections configuration
   - Custom Styling editor
   - System Health monitoring
   - Error Logs viewer

4. **Settings Pages**
   - Application settings
   - Theme customization
   - Profile management

## User Roles & Access

### Admin
- Full access to all features and functionality
- Can manage users, permissions, and system configuration
- Access to theme settings, system health monitoring
- Can configure field connections and reporting
- Full control over all administrative functions

### HR
- Can manage attendance records
- Access to employee data and project assignments
- Can view and generate reports
- Cannot access user management or system configuration
- Limited access to field-level configuration

### Viewer
- Read-only access to dashboards and reports
- Can view attendance records
- Cannot modify any system settings or data
- Restricted to viewing information only

## Getting Started

### Prerequisites

- Python 3.6+
- Flask and dependencies
- Web browser with location services

### Installation

1. Clone the repository
2. Install required packages:
   ```
   pip install flask flask-sqlalchemy flask-wtf python-dotenv werkzeug cairosvg
   ```
3. Run the application:
   ```
   python app.py
   ```
4. Access the application at http://localhost:8080

### Default Admin Credentials

- **Username:** admin
- **Password:** admin

**Note:** Change these credentials in production!

## Field Tracker Usage

### Admin Side
- **Field Configuration**: Admins can configure which fields to track and how they should appear in forms
- **Connection Logic**: Set up relationships between fields (e.g., calculations, dependencies)
- **Form Builder**: Create and modify attendance forms with custom fields
- **Project Assignment**: Link fields to specific projects or departments
- **Data Validation**: Set up rules for field validation and data integrity

### Employee Side
- **Mobile Check-in/out**: Employees can clock in/out via mobile interface
- **GPS Tracking**: Automatic location capture during check-in/out
- **Camera Integration**: Optional photo verification
- **Offline Support**: Data is cached locally and synced when online
- **Auto-save**: Partial entries are saved automatically

## Authentication System

### Login / Logout
1. Users access the login page and enter credentials
2. Role-based redirect to appropriate dashboard
3. Session timeout after period of inactivity
4. Secure logout process clearing session data

### Registration
- Admin users can create new accounts for HR and Viewers
- Employees can be registered by admins or through batch import
- Registration requires approval for certain roles

### Password Recovery
- "Forgot Password" functionality sends reset codes to asls.guards@gmail.com
- Time-limited reset codes
- Secure password reset process

## Security Features

- **Role-based access control**: Strict permission enforcement
- **Password hashing**: Secure credential storage
- **Session management**: Proper session handling and timeout
- **Input validation**: Protection against injection attacks
- **Error logging**: Comprehensive error tracking
- **Attendance verification**: GPS, timestamp, and optional photo verification
- **Data integrity checks**: Prevent duplicate or invalid entries

## API Endpoints

### Authentication
- `/api/login` - Authenticate users
- `/api/logout` - End user session
- `/api/user` - Get current user information

### Attendance
- `/api/submit` - Submit attendance data
  - Accepts: employee_id, action, latitude, longitude, photo
  - Returns: success/failure with message
- `/api/attendance` - Retrieve attendance records

### Field Management
- `/api/form-fields` - Get form field configurations
- `/api/field-connections` - Manage field relationships

### System
- `/api/sync-errors` - Synchronize offline error logs
- `/api/system-health` - Check system status

## Development

### Customization

- Update icons in static/icons/
- Modify CSS in static/css/style.css
- Configure database in app.py

### Google Maps Integration

Replace the API key in templates/index.html with your own Google Maps API key for proper map functionality.

## Deployment

### Render.com Deployment

The application can be deployed to Render.com using the included render.yaml configuration file:

1. Push the code to a GitHub repository
2. Connect your Render.com account to GitHub
3. Create a new Web Service and select the repository
4. Render will automatically detect the configuration and deploy the application

### Environment Variables

The following environment variables should be set in production:

- `SECRET_KEY`: A secure random string for session encryption
- `DATABASE_URL`: The PostgreSQL database connection string (when using PostgreSQL)
- `ADMIN_EMAIL`: The email address for system notifications (asls.guards@gmail.com)
- `GOOGLE_MAPS_API_KEY`: Your Google Maps API key for location services

## Support and Contact

For support with this application, please contact the system administrator at asls.guards@gmail.com.