# Al-Aqsa HRM - Field Attendance Tracker

A comprehensive HR and Payroll Management System designed for tracking field employees with location tracking capabilities.

## Features

- User authentication with role-based access (admin, HR, viewer)
- Employee management with profile information
- GPS-based attendance tracking
- Location verification with map visualization
- Interactive form validation with character responses
- Comprehensive reporting and data export
- Mobile-responsive interface
- Offline capability via Progressive Web App

## Technology Stack

- **Frontend**: React, TypeScript, Shadcn/UI, TailwindCSS
- **Backend**: Flask (Python), SQLite
- **Authentication**: JWT + Session-based
- **Location**: Geolocation API, Google Maps integration
- **Data Visualization**: Recharts
- **Deployment**: Dokploy, Hostinger VPS

## Setup and Installation

### Prerequisites

- Node.js 20.x or higher
- Python 3.11 or higher
- SQLite 3.x

### Local Development

1. Clone the repository
   ```
   git clone https://github.com/your-username/alaqsa-hrm.git
   cd alaqsa-hrm
   ```

2. Install backend dependencies
   ```
   pip install -r requirements.txt
   ```

3. Install frontend dependencies
   ```
   npm install
   ```

4. Set up environment variables
   - Copy `.env.example` to `.env`
   - Configure database connection and API keys

5. Initialize the database
   ```
   python init_database.py
   ```

6. Start the development server
   ```
   npm run dev
   ```

## Deployment to Hostinger VPS with Dokploy

### Prerequisites

1. A Hostinger VPS account with SSH access
2. Dokploy installed on your VPS
3. Git installed on your VPS

### Deployment Steps

1. **Initial VPS Setup**

   - Connect to your Hostinger VPS via SSH
   ```
   ssh username@your-vps-ip
   ```

   - Install Dokploy if not already installed
   ```
   curl -fsSL https://get.dokploy.com/install.sh | sh
   ```

   - Verify installation
   ```
   dokploy --version
   ```

2. **Create Project and Service in Dokploy**

   - Create the project
   ```
   dokploy projects create AndroidBasedApp
   ```

   - Navigate to project directory
   ```
   cd /var/lib/dokploy/projects/AndroidBasedApp
   ```

   - Create the service for AlAqsaHRM
   ```
   dokploy services create AlAqsaHRM
   ```

3. **Configure Deployment**

   - Edit service configuration
   ```
   dokploy services edit AlAqsaHRM
   ```

   - Configure the following settings:
     - Set repository URL
     - Set branch (main/master)
     - Set environment variables (DATABASE_URL, SECRET_KEY, etc.)
     - Set build command: `npm install && python -m pip install -r requirements.txt`
     - Set run command: `gunicorn --bind 0.0.0.0:8000 wsgi:app`
     - Set port: 8000

4. **Deploy the Application**

   - Deploy the service
   ```
   dokploy services deploy AlAqsaHRM
   ```

   - Check deployment status
   ```
   dokploy services logs AlAqsaHRM
   ```

5. **Access the Application**

   - The application will be available at:
   ```
   http://<your-vps-ip>:8000
   ```

   - For production, configure a domain name and SSL certificate

### Updating the Application

To update the application after making changes:

1. Push changes to your Git repository
2. Connect to your VPS
3. Run the deploy command
   ```
   dokploy services deploy AlAqsaHRM
   ```

### Environment Configuration

The application requires the following environment variables:

- `DATABASE_URL`: SQLite database URL (sqlite:///instance/attendance.db)
- `SECRET_KEY`: Secret key for session encryption
- `GOOGLE_MAPS_API_KEY`: Google Maps API key for location mapping
- `PORT`: Port to run the application (default: 8000)

## Additional Deployment Notes

### Nixpacks Configuration

This application uses a `.nixpacks.toml` file for Dokploy compatibility. The file contains:

```toml
[phases.setup]
nixPkgs = ["nodejs", "python311", "python311Packages.pip", "sqlite"]

[phases.build]
cmds = [
  "npm install",
  "python -m pip install -r requirements.txt"
]

[phases.start]
cmd = "gunicorn --bind 0.0.0.0:$PORT wsgi:app"
```

### Database Migration

On first deployment, initialize the database by connecting to your service's container:

```
dokploy services exec AlAqsaHRM
cd /app
python init_database.py
```

### Persistent Data

Configure volume mounts in your Dokploy service to preserve data between deployments:

```
dokploy services edit AlAqsaHRM
```

Add volume mounts:
```yaml
volumes:
  - host_path: /var/lib/dokploy/data/AlAqsaHRM/instance
    container_path: /app/instance
```

## Troubleshooting

- **Login Issues**: Ensure the database has been properly initialized with default users
- **Location Tracking**: Check that the Google Maps API key is correctly configured
- **Database Connection**: Verify the SQLite database path is correct and writable
- **Service Not Starting**: Check the logs with `dokploy services logs AlAqsaHRM`

## License

This software is proprietary and confidential.
Copyright © 2025 Al-Aqsa Security. All rights reserved.