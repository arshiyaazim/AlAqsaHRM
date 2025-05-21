====================================================
      AL-AQSA HRM - DEPLOYMENT & USAGE GUIDE
====================================================

Table of Contents:
-----------------
1. Application Overview
2. Key Features
3. Setup Instructions
   a. Local Development
   b. Production Deployment (Hostinger)
4. Environment Configuration
5. Building Executable (.exe) File
6. User Guide
7. Troubleshooting
8. Contact & Support

====================================================
1. APPLICATION OVERVIEW
====================================================

Al-Aqsa HRM is a comprehensive human resource management system designed 
for workforce management of daily laborers with an emphasis on attendance 
tracking, payroll processing, and employee management. The application is 
built using a modern stack with Flask/Python backend and React/TypeScript 
frontend for optimal performance and user experience.

====================================================
2. KEY FEATURES
====================================================

- Employee Management: Complete employee database with profile management
- Attendance Tracking: GPS-based location tracking with photo verification
- Payroll Processing: Automated wage calculation based on attendance
- Project Management: Track employees assigned to different projects
- Ship Duty Management: Special tracking for shipping-related duties
- Financial Management: Expenditure and income tracking
- Bill Generation: Create and manage bills for services
- Role-Based Access: Admin, HR, and Viewer permission levels
- Mobile-Responsive Interface: Works on all devices
- Offline Mode: Progressive Web App (PWA) for offline access
- Reporting: Generate reports in various formats (PDF, Excel)
- Data Import/Export: Easy data migration tools

====================================================
3. SETUP INSTRUCTIONS
====================================================

-------------------
A. LOCAL DEVELOPMENT
-------------------

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/alaqsa-hrm.git
   cd alaqsa-hrm
   ```

2. Set up environment variables:
   ```
   cp .env.example .env
   ```
   Edit the .env file with your configuration (see section 4)

3. Install backend dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Initialize the database:
   ```
   python manage.py init-db
   ```

5. Install frontend dependencies:
   ```
   cd client
   npm install
   cd ..
   ```

6. Run the development server:
   ```
   npm run dev
   ```

7. Access the application at http://localhost:5000

-------------------------
B. PRODUCTION DEPLOYMENT
-------------------------

=== HOSTINGER VPS DEPLOYMENT ===

1. Log in to your Hostinger VPS via SSH:
   ```
   ssh username@your-server-ip
   ```

2. Install required dependencies:
   ```
   sudo apt update
   sudo apt install -y python3-pip python3-venv nginx git
   ```

3. Clone the repository:
   ```
   git clone https://github.com/yourusername/alaqsa-hrm.git
   cd alaqsa-hrm
   ```

4. Create and activate a virtual environment:
   ```
   python3 -m venv venv
   source venv/bin/activate
   ```

5. Install dependencies:
   ```
   pip install -r requirements.txt
   pip install gunicorn
   ```

6. Build the frontend:
   ```
   npm install
   npm run build
   ```

7. Create environment variables:
   ```
   cp .env.example .env
   nano .env
   ```
   Edit the configuration as needed (especially set FLASK_ENV=production)

8. Set up the database:
   ```
   python manage.py init-db
   ```

9. Create a systemd service for the application:
   Create file: /etc/systemd/system/alaqsa-hrm.service
   ```
   [Unit]
   Description=Al-Aqsa HRM Gunicorn Service
   After=network.target

   [Service]
   User=your-username
   Group=your-username
   WorkingDirectory=/path/to/alaqsa-hrm
   Environment="PATH=/path/to/alaqsa-hrm/venv/bin"
   ExecStart=/path/to/alaqsa-hrm/venv/bin/gunicorn --workers 3 --bind 127.0.0.1:8000 wsgi:app
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```

10. Configure Nginx:
    Create file: /etc/nginx/sites-available/alaqsa-hrm
    ```
    server {
        listen 80;
        server_name your-domain.com www.your-domain.com;
        
        location / {
            proxy_pass http://127.0.0.1:8000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        location /static {
            alias /path/to/alaqsa-hrm/static;
        }
        
        location /uploads {
            alias /path/to/alaqsa-hrm/uploads;
        }
    }
    ```

11. Enable the site and restart Nginx:
    ```
    sudo ln -s /etc/nginx/sites-available/alaqsa-hrm /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl restart nginx
    ```

12. Start and enable the service:
    ```
    sudo systemctl start alaqsa-hrm
    sudo systemctl enable alaqsa-hrm
    ```

13. Set up SSL with Certbot:
    ```
    sudo apt install certbot python3-certbot-nginx
    sudo certbot --nginx -d your-domain.com -d www.your-domain.com
    ```

=== HOSTINGER SHARED HOSTING DEPLOYMENT ===

1. Log in to your Hostinger Control Panel

2. Go to "Files" > "File Manager" or use FTP access

3. Create a Python application (if supported by your plan):
   - Go to "Website" > "Python" in your hosting panel
   - Create a new Python application
   - Select Python 3.9+ version

4. Upload your application files:
   - Build your frontend first: `npm run build`
   - Upload all files to the directory specified in your Python app settings

5. Configure environment variables:
   - Create or upload .env file
   - Make sure to set FLASK_ENV=production

6. Set up the database:
   - If using MySQL, create a database through Hostinger panel
   - Update DATABASE_URL in your .env file
   - Run database initialization through Hostinger's SSH or console access

7. Configure the application entry point:
   - Set the entry point to wsgi.py in the Hostinger Python app settings

8. Set up a custom domain if needed:
   - Go to "Domains" > "Manage" > "DNS"
   - Add an A record pointing to your Hostinger server IP

Note: Specific Hostinger panel options may vary based on your hosting plan.

====================================================
4. ENVIRONMENT CONFIGURATION
====================================================

The application uses environment variables for configuration. Copy .env.example 
to .env and configure the following:

DATABASE_URL:         Connection string for database
SECRET_KEY:           Secret key for session security
GOOGLE_MAPS_API_KEY:  API key for Google Maps integration
ADMIN_USERNAME:       Default admin username
ADMIN_PASSWORD:       Default admin password
ADMIN_EMAIL:          Default admin email
COMPANY_NAME:         Your company name
SESSION_TIMEOUT:      Session timeout in seconds
[and other variables as listed in .env.example]

Important: Always change default credentials in production!

====================================================
5. BUILDING EXECUTABLE (.EXE) FILE
====================================================

For Windows-based deployments, you can build a standalone executable:

1. Install PyInstaller:
   ```
   pip install pyinstaller
   ```

2. Run the build script:
   ```
   python build_exe.py
   ```

3. The executable will be created in the dist/ directory

4. Distribute the entire dist folder, which contains:
   - alaqsa-hrm.exe - Main executable
   - Required libraries and resources
   - config.ini - Configuration file to edit before running

5. On the target machine, edit config.ini to set up database and other parameters

6. Run alaqsa-hrm.exe to start the application

====================================================
6. USER GUIDE
====================================================

DEFAULT ACCOUNTS
---------------
Admin:  admin@example.com / admin123
HR:     hr@example.com / hr1234
Viewer: viewer@example.com / view789

IMPORTANT: Change passwords immediately after deployment!

LOGIN AND NAVIGATION
-------------------
1. Access the application URL in your browser
2. Login with your credentials
3. Use the sidebar to navigate between sections

LOCATION TRACKING SETUP
----------------------
1. Enable location permissions in your browser
2. For mobile devices, allow location access when prompted
3. For accurate tracking, use a device with GPS capabilities

EMPLOYEE MANAGEMENT
-----------------
- Add employees with required fields (Employee ID is mandatory)
- Upload employee photos for verification
- Edit employee details as needed
- View employee attendance history

ATTENDANCE RECORDING
------------------
- Use the "Record Attendance" feature
- Verify location is within permitted radius
- Capture photo for verification if required
- Submit attendance record

PAYROLL PROCESSING
----------------
- Select date range for payroll period
- Review attendance records
- Process payroll calculations
- Generate payroll reports
- Export to Excel or PDF

====================================================
7. TROUBLESHOOTING
====================================================

LOGIN ISSUES
-----------
- If you cannot login, check the users table in the database
- Reset admin password using: python fix_login.py
- Verify database connection is working

LOCATION TRACKING PROBLEMS
------------------------
- Ensure Google Maps API key is valid and has required permissions
- Check browser/device location permissions
- Test location in an area with good GPS signal
- Try the "Location Test" page to verify functionality

DATABASE ERRORS
-------------
- Run python check_tables.py to verify database structure
- Ensure database file has proper permissions
- Check disk space if using SQLite

APPLICATION NOT STARTING
---------------------
- Check log files in the logs/ directory
- Verify all dependencies are installed
- Ensure correct Python version (3.9+)

====================================================
8. CONTACT & SUPPORT
====================================================

For support, please contact:

Technical Support: 
- Email: [Your Email]
- Phone: [Your Phone]

Documentation & Updates:
- [Your Website/GitHub]

Report bugs or request features through our support channels.

====================================================