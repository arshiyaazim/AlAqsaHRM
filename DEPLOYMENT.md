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
| ADMIN_PASSWORD | Password for the default admin account | Yes | admin |
| SECRET_KEY | Flask session secret key | Yes | None |
| FLASK_ENV | Flask environment | No | production |
| SESSION_SECRET | Session secret | No | Auto-generated |
| JWT_SECRET | JWT token secret | No | Auto-generated |

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

2. **Verify database initialization**

   Run the following command in the Render.com shell:
   ```
   python check_tables.py
   ```
   
   This will verify all required tables exist with the correct structure.
   
   If database initialization fails, you can manually initialize it:
   ```
   python -c "from app import app, init_db; with app.app_context(): init_db(); print('Database initialized manually')"
   ```

3. **Health checks**

   - Access the Flask backend health check endpoint at `/health` to verify backend status and view detailed diagnostics
   - Access the Express API health check endpoint at `/api/health` to verify API and database connectivity
   
   The `/health` endpoint now provides detailed diagnostics including:
   - Database path and existence check
   - Schema path and existence check
   - Working directory information
   - List of database tables
   - Connection status

4. **Reset admin password**

   If you need to reset the admin password, use the Render.com shell:
   ```
   python -c "from app import app, get_db, generate_password_hash; \
   with app.app_context(): \
     db = get_db(); \
     db.execute('UPDATE users SET password = ? WHERE role = \"admin\"', \
       (generate_password_hash('newpassword'),)); \
     db.commit(); \
     print('Password reset successfully')"
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