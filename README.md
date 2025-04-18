# Field Attendance Tracker

A mobile-friendly web application for tracking employee attendance in the field with GPS location and photo verification.

## Features

- **Mobile-optimized interface** using Bootstrap 5
- **Clock-in/Clock-out** functionality
- **GPS location tracking** for attendance verification
- **Photo capture** option for visual verification
- **Admin dashboard** for attendance management
- **PWA support** for offline capabilities

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
4. Access the application at http://localhost:5000

### Default Admin Credentials

- **Username:** admin
- **Password:** admin

**Note:** Change these credentials in production!

## Usage

### Employees

1. Open the application in a mobile browser
2. Allow location access when prompted
3. Enter your Employee ID
4. Select "Clock In" or "Clock Out"
5. Optionally take a photo for verification
6. Submit the form

### Administrators

1. Access the admin panel at /admin/login
2. Login with admin credentials
3. View and filter attendance records
4. Export data as needed

## Security Features

- Password hashing for admin authentication
- Attendance duplication prevention (15-minute window)
- Photo storage with secure filenames

## API Endpoints

- `/api/submit` - JSON endpoint for submitting attendance data
  - Accepts: employee_id, action, latitude, longitude
  - Returns: success/failure with message

## Development

### Customization

- Update icons in static/icons/
- Modify CSS in static/css/style.css
- Configure database in app.py

### Google Maps Integration

Replace the API key in templates/index.html with your own Google Maps API key for proper map functionality.