# AlAqsaHRM Deployment Guide

This document outlines the deployment process for the AlAqsaHRM application, focusing on deployment to Render.com.

## Prerequisites

- A Render.com account
- Git repository with your application code
- Required environment variables (see below)

## Environment Variables

The following environment variables are required:

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| EMAIL_FOR_RESET | Email address for password reset notifications | Yes | None |
| ADMIN_USERNAME | Username for the default admin account | Yes | admin |
| ADMIN_PASSWORD | Password for the default admin account | Yes | admin123 |
| SECRET_KEY | Flask session secret key | Yes | None |
| FLASK_ENV | Flask environment | No | production |
| SESSION_SECRET | Session secret | No | Auto-generated |
| JWT_SECRET | JWT token secret | No | Auto-generated |

## Authentication System

The application has two separate but integrated login systems:

### 1. Main User Login (Default Route)

- **URL:** `/login` or root path `/`
- **Used By:** Regular employees, HR users, and admins accessing employee-facing features
- **Authentication Method:** Uses the `users` table for credentials and role management
- **Session Management:** Stores `user_id` and `is_admin` flags in the session
- **Credentials:** Default admin is username: `admin`, password: `admin123`

### 2. Admin Panel Login

- **URL:** `/admin/login`
- **Used By:** Admins accessing the administrative dashboard and configuration
- **Authentication Method:** Checks both `admins` and `users` tables for validation
- **Session Management:** Stores `admin_id` in the session
- **Credentials:** Same default credentials (username: `admin`, password: `admin123`)

### Admin Access and Role-Based Permissions

The application includes a robust role-based access control system that:

1. Allows authenticated admins to access both regular and admin features
2. Ensures proper table creation regardless of which login system is used
3. Provides appropriate error messages based on authentication status
4. Logs unauthorized access attempts for security monitoring

### Authentication Troubleshooting

If login issues occur:

1. Run the login fix script to ensure both authentication systems are working:
   ```
   python fix_login.py
   ```

2. Check database tables and admin user existence:
   ```
   python check_tables.py
   ```

3. Reset admin password if needed:
   ```
   python -c "from app import app, get_db, generate_password_hash, ADMIN_USERNAME, ADMIN_PASSWORD; \
   with app.app_context(): \
     db = get_db(); \
     db.execute('UPDATE users SET password = ? WHERE username = ?', \
       (generate_password_hash(ADMIN_PASSWORD), ADMIN_USERNAME)); \
     db.execute('UPDATE admins SET password = ? WHERE username = ?', \
       (generate_password_hash(ADMIN_PASSWORD), ADMIN_USERNAME)); \
     db.commit(); \
     print('Admin passwords reset successfully')"
   ```

## Gunicorn Integration

The application has been configured to use Gunicorn with a WSGI entry point for better performance and reliability in production:

```python
# wsgi.py
from app import app
application = app  # Gunicorn looks for 'application' variable
```

The wsgi.py file includes enhanced database initialization and error handling specifically designed for production environments. Key Gunicorn integration features:

- Proper signal handling for graceful shutdowns
- Automatic database initialization at startup
- Improved logging configuration
- Health monitoring support

When deployed with Gunicorn, the application automatically:
1. Sets up logging before anything else
2. Initializes the database
3. Configures the Flask app with production settings
4. Handles multiple worker processes properly

## Deployment Steps

1. **Fork or clone the repository**
   
   Make sure you have the latest version of the codebase.

2. **Set up Render.com service**

   - Log in to your Render.com account
   - Click "New+" and select "Web Service"
   - Connect your GitHub repository
   - Use the following settings:
     - Name: AlAqsaHRM
     - Environment: Python
     - Region: Choose nearest to your users
     - Branch: main (or your preferred branch)
     - Build Command: `pip install -r requirements.txt && if [ ! -d "exports" ]; then mkdir exports; fi && if [ ! -d "logs" ]; then mkdir logs; fi`
     - Start Command: `gunicorn wsgi:application --bind 0.0.0.0:$PORT --log-file -`

   **Note:** Using Gunicorn with the wsgi.py entry point ensures proper application initialization in the production environment.

3. **Configure environment variables**

   Add all required environment variables in the Render.com dashboard:
   - Go to Environment
   - Add each variable from the list above

4. **Add persistent disk**

   - In your Render.com dashboard, go to Disks and create a new disk
   - Name: data
   - Size: 1GB (or more as needed)
   - Mount Path: /var/data

5. **Deploy**

   Click "Create Web Service" to start the deployment process.

## Troubleshooting

If you encounter issues during deployment:

1. **Check logs**

   Review the logs in the Render.com dashboard for any errors. Pay special attention to:
   - Database initialization messages (look for "Database initialized successfully")
   - Schema file loading messages (look for "Found schema file at")
   - Directory creation messages (for logs and uploads directories)

2. **Fix login issues**

   If you encounter authentication problems, run the login fix script:
   ```
   python fix_login.py
   ```
   
   This script will:
   - Create both `users` and `admins` tables if they don't exist
   - Create essential tables like `attendance` and `projects`
   - Reset the admin password to the default value (`admin123`)
   - Ensure tables have the correct structure for login
   - Show diagnostic information about found/created tables

3. **Verify database initialization**

   Run the following command in the Render.com shell:
   ```
   python check_tables.py
   ```
   
   This will verify all required tables exist with the correct structure.
   
   If database initialization fails, you can manually initialize it:
   ```
   python -c "from app import app, init_db; with app.app_context(): init_db(); print('Database initialized manually')"
   ```

4. **Health checks**

   - Access the Flask backend health check endpoint at `/health` to verify backend status and view detailed diagnostics
   - Access the Express API health check endpoint at `/api/health` to verify API and database connectivity
   
   The `/health` endpoint now provides detailed diagnostics including:
   - Authentication tables verification (`users` and `admins` tables)
   - Admin user existence in both authentication systems
   - Essential tables existence (`attendance` and `projects`)
   - Database path and existence check
   - Schema path and existence check
   - Working directory information
   - List of database tables
   - Connection status

5. **Addressing 'Internal Server Error' after login**

   If you encounter an "Internal Server Error" after successful login:
   
   a) Run the login fix script to ensure tables exist:
   ```
   python fix_login.py
   ```
   
   b) Check for missing tables causing the error:
   ```
   python -c "from app import app, get_db; with app.app_context(): db = get_db(); print(db.execute('SELECT name FROM sqlite_master WHERE type=\"table\"').fetchall())"
   ```
   
   c) Verify that essential tables contain expected data:
   ```
   python -c "from app import app, get_db; with app.app_context(): db = get_db(); print('Users table rows:', db.execute('SELECT COUNT(*) FROM users').fetchone()[0])"
   ```

6. **Reset admin password**

   If you need to reset the admin password, use the Render.com shell:
   ```
   python -c "from app import app, get_db, generate_password_hash; \
   with app.app_context(): \
     db = get_db(); \
     db.execute('UPDATE users SET password = ? WHERE username = \"admin\"', \
       (generate_password_hash('admin123'),)); \
     db.execute('UPDATE admins SET password = ? WHERE username = \"admin\"', \
       (generate_password_hash('admin123'),)); \
     db.commit(); \
     print('Admin password reset successfully')"
   ```

## Monitoring

### Health Check Endpoints

The application provides two health check endpoints with detailed diagnostics:

1. **Flask Backend:** `/health` 
   - Provides comprehensive system diagnostics including:
     - Database path and existence check
     - Schema file path and existence check
     - Directory structure verification
     - Environment information and Python version
     - Render.com persistent disk status
     - Critical table count verification
     - Admin user verification
   - Returns HTTP 200 with status "healthy" when all systems are operational
   - Returns HTTP 200 with status "warning" when database tables are missing
   - Returns HTTP 500 with status "unhealthy" on connection failures

2. **Express API:** `/api/health`
   - Verifies database connectivity
   - Tests PostgreSQL connection for the modern frontend

### Health Check Flow

```
1. Render.com -> HTTP GET /health -> Flask Backend
   |
   v
2. Flask performs comprehensive diagnostics and returns detailed status
   |
   v
3. External monitoring -> HTTP GET /api/health -> Express API
   |
   v
4. Express API runs SQL query to verify database connectivity
   |
   v
5. Returns health status JSON with database connection status
```

### System Health Monitoring

- Database tables are automatically verified during application startup
- The improved health diagnostics provide early warning of potential issues
- Application logs are stored in the `/var/data/logs` directory on the persistent disk
- Database connectivity is automatically tested on each API health check request
- Admin user existence is verified on startup and through health checks

## Backup and Restore

To back up your database:

1. Access the Render.com shell
2. Run: `sqlite3 /var/data/db/employee_data.db .dump > /var/data/backup_$(date +%Y%m%d).sql`

To restore:

1. Access the Render.com shell
2. Run: `sqlite3 /var/data/db/employee_data.db < /var/data/backup_filename.sql`

## Updating the Application

1. Push changes to your GitHub repository
2. Render.com will automatically deploy the changes (if auto-deploy is enabled)
3. Monitor the logs for any issues during deployment