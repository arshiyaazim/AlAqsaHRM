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
     - Start Command: `python app.py`

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

   Review the logs in the Render.com dashboard for any errors.

2. **Verify database initialization**

   Run the following command in the Render.com shell:
   ```
   python check_tables.py
   ```

3. **Health check**

   Access the health check endpoint at `/health` to verify application status.

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

- Regular health checks are performed at `/health`
- Database tables are verified during startup
- Application logs are stored in the `/var/data/logs` directory on the persistent disk

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