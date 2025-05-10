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
   pip install -r requirements.txt
   ```
3. Initialize the database:
   ```
   python init_database.py
   ```
4. Run the application:
   ```
   python app.py
   ```
5. Access the application at http://localhost:8080

#### Troubleshooting Installation Issues

If you encounter database initialization errors:
1. Ensure the `instance` directory exists and is writable
2. Manually create required directories:
   ```
   mkdir -p instance logs exports uploads
   ```
3. Reset the admin password:
   ```
   flask reset-admin
   ```
4. Check log files in the `logs` directory for detailed error messages

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

### Data Import
- `/api/import` - Import data from uploaded Excel files
- `/api/import-path` - Import data from a specified file path
- `/api/employees` - Retrieve employee data
- `/api/history` - Get import history

### System
- `/api/sync-errors` - Synchronize offline error logs
- `/api/system-health` - Check system status

## Data Import Utilities

The application includes a comprehensive data import system that can handle:

1. **Employee Data Import**: Import employee records from Excel files
   ```
   python import_utils.py employees path/to/excel.xlsx
   ```

2. **Company Financial Data Import**: Import cash receives and payments
   ```
   python import_utils.py company path/to/excel.xlsx
   ```

3. **Web Interface Import**: Upload and import via the application's web interface

### Import File Requirements

#### Employee Excel Format
- Must contain an "Employee ID" column
- Other recognized columns: First Name, Last Name, Position, Department, etc.
- Rows with empty Employee ID will be skipped

#### Company Financial Excel Format
- Should contain sheets named: EmployeeDetails, CashReceive, CashPayments
- Each sheet should have relevant columns for the data type

## Development

### Project Structure

```
.
├── app.py                  # Main application entry point
├── app_auth_routes.py      # Authentication routes and functions
├── app_error_routes.py     # Error handling and logging routes
├── app_init.py             # Application initialization and configuration
├── app_main.py             # Application bootstrapping
├── init_database.py        # Standalone database initialization script
├── client/                 # Frontend React/TypeScript application
│   ├── src/                # Source code
│   │   ├── components/     # UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility functions and helpers
│   │   ├── pages/          # Page components
│   │   └── App.tsx         # Main React application
├── data/                   # Data storage directory
├── instance/               # Flask instance directory
├── migrations/             # Database migration scripts
├── server/                 # Backend server code
│   ├── middleware/         # Express middleware
│   ├── routes.ts           # API routes
│   ├── storage.ts          # Storage interface implementations
│   └── vite.ts             # Vite frontend integration
├── shared/                 # Shared code between frontend and backend
│   └── schema.ts           # Database schema definitions
├── static/                 # Static assets
│   ├── css/                # CSS stylesheets
│   ├── js/                 # JavaScript files
│   └── icons/              # Application icons
├── templates/              # HTML templates
├── uploads/                # File upload directory
├── render.yaml             # Render.com deployment configuration
├── requirements.txt        # Python dependencies
└── .env.example            # Example environment variables
```

### Customization

- Update icons in static/icons/
- Modify CSS in static/css/style.css
- Configure database in app.py
- React component styling in client/src/components/
- Page layouts in client/src/pages/

### Google Maps Integration

Replace the API key in templates/index.html with your own Google Maps API key for proper map functionality.

### Adding New Features

1. Backend Routes:
   - Add new routes to app.py or create a new module
   - Register routes in app_init.py

2. Frontend Components:
   - Create new components in client/src/components/
   - Add new pages in client/src/pages/
   - Update navigation in client/src/components/layout/

3. Database Changes:
   - Create a migration script in migrations/
   - Apply changes to shared/schema.ts

## Deployment Options

### Desktop Application (.exe)

The Field Attendance Tracker can be packaged as a standalone desktop application using PyInstaller, which includes all the necessary components for offline operation.

#### Creating a Desktop Application

1. Install PyInstaller:
   ```
   pip install pyinstaller
   ```

2. Generate the executable:
   ```
   pyinstaller --onefile --add-data "static;static" --add-data "templates;templates" --add-data "migrations;migrations" --hidden-import=flask_sqlalchemy app.py
   ```

3. The executable will be created in the `dist` directory
   
#### System Requirements for Desktop App

- Windows 10 or later (64-bit)
- 4GB RAM minimum (8GB recommended)
- 500MB free disk space
- Camera and GPS hardware for full functionality
- Internet connection for initial setup and synchronization

#### Offline Capabilities

The desktop application supports:
- Local database for attendance records
- Offline camera capture
- GPS location caching
- Automatic synchronization when internet is restored
- IndexedDB storage for form data

### Web Deployment Options

#### Render.com Deployment

The application is preconfigured for easy deployment to Render.com using the included `render.yaml` file:

1. Push the code to a GitHub repository:
   ```
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. In your Render.com dashboard:
   - Create a new Web Service
   - Connect to your GitHub repository
   - Select "Use render.yaml"
   - Review settings and click "Create Web Service"

3. Render will automatically:
   - Install dependencies from requirements.txt
   - Create necessary directories (instance, logs, exports, uploads)
   - Initialize the database if it doesn't exist
   - Start the application with `python app.py`

4. Deployment includes:
   - Comprehensive pre-deployment script to verify and create directories
   - Database initialization with required tables
   - Permission verification to ensure database is writable
   - Detailed logging of the deployment process
   
5. Required environment variables (already configured in .env.render):
   - SECRET_KEY: Automatically generated by Render
   - ADMIN_USERNAME: Default is 'admin'
   - ADMIN_PASSWORD: Default is 'admin'
   - EMAIL_FOR_RESET: For password reset codes (defaults to asls.guards@gmail.com)
   
6. Post-deployment steps:
   - Change the default admin password via the web interface
   - Verify database initialization in the Render logs
   - If needed, run `flask reset-admin` via the Render shell

#### Replit Deployment (Development/Testing)

For quick testing or development environments:

1. Import the repository into Replit
2. Replit will automatically detect Python requirements
3. Set the run command to `python app.py`
4. Set necessary environment variables in the Replit Secrets tab
5. Click "Run" to start the application

### Environment Variables

The following environment variables should be set in production:

- `SECRET_KEY`: A secure random string for session encryption
- `DATABASE_URL`: The PostgreSQL database connection string (when using PostgreSQL)
- `ADMIN_EMAIL`: The email address for system notifications (asls.guards@gmail.com)
- `GOOGLE_MAPS_API_KEY`: Your Google Maps API key for location services
- `FLASK_ENV`: Set to "production" for production deployments

## Production Readiness Checklist

Before deploying to production, ensure the following:

- [ ] Default admin password has been changed
- [ ] SECRET_KEY is set to a strong random value (automatic with Render.com)
- [ ] Database has been properly initialized (verify via init_database.py)
- [ ] Required directories exist and have proper permissions
- [ ] Form fields and connections are properly configured
- [ ] Error logging is properly configured (check logs directory)
- [ ] Backup strategy is in place for the database
- [ ] SSL/TLS is enabled (automatic with Render.com)
- [ ] Email for password resets is verified (asls.guards@gmail.com)
- [ ] Mobile and desktop views are tested
- [ ] Offline functionality is verified
- [ ] GPS and camera permissions are working correctly

## Support and Contact

For support with this application, please contact the system administrator at asls.guards@gmail.com.

## Release Notes

### Version 1.1.0 (May 2025)

This production-ready release of the Al-Aqsa Field Attendance Tracker includes significant improvements to deployment stability and database initialization. Major updates include:

#### Features
- Complete web-based attendance tracking system with GPS location and photo verification
- Progressive Web App (PWA) support for offline operation
- React/TypeScript admin dashboard with role-based access
- Financial modules for payroll, expenditures and income tracking
- Advanced reporting system with customizable templates
- Comprehensive error logging and system health monitoring
- Excel data import capabilities for employees and financial data

#### Technical Enhancements
- **New!** Robust database initialization system with automatic table verification
- **New!** Enhanced deployment script with comprehensive pre-deployment checks
- **New!** Admin password reset CLI command for easy recovery
- **New!** Standalone init_database.py script for simple database setup
- **New!** Improved error handling for database operations
- Role-based sidebar with organized admin tools section
- Import utilities combined into a single comprehensive module
- Desktop executable support via PyInstaller
- One-click deployment via Render.com

#### Security
- Comprehensive authentication system
- Role-based access control
- Secure password reset functionality
- Input validation and sanitization

### Deployment Status
- ✓ All features implemented and tested
- ✓ Enhanced Render.yaml configuration with comprehensive deployment checks
- ✓ Environment variables documented and included in .env.render
- ✓ Directory structure verification and automatic creation
- ✓ Database initialization fully automated
- ✓ Desktop application packaging instructions provided
- ✓ Ready for one-click deployment with improved reliability