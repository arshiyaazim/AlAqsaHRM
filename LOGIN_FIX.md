# Al-Aqsa HRM Login System Fix

This document describes the login system fixes implemented to ensure proper authentication on both local and production environments.

## Problem Solved

This fix addresses:
1. Missing `users` and `admins` tables in the database
2. Admin login failures due to inconsistent table structure
3. Password authentication issues

## Fix Implementation

### 1. Login Fix Script (`fix_login.py`)

A standalone script has been created to:
- Create the `users` and `admins` tables if they don't exist
- Add the default admin user to both tables
- Reset admin password to the default/configured value

Run this script to fix login issues:

```bash
python fix_login.py
```

The script checks multiple possible database locations, ensuring your database will be found regardless of environment.

### 2. Render.yaml Update

The `render.yaml` deployment configuration has been updated to run `fix_login.py` during the pre-deployment process. This ensures that the database tables and admin user exist when deployed to Render.com.

### 3. Environment Variables

The following environment variables control admin access:

- `ADMIN_USERNAME`: Default is `admin`
- `ADMIN_PASSWORD`: Default is `admin123`

You can change these in your `.env` file locally or in the Render.com environment variables.

## Deployment Steps

1. **Local Testing:**
   ```bash
   # Run fix script
   python fix_login.py
   
   # Start the application
   python app.py
   ```

2. **Render.com Deployment:**
   - Push changes to your GitHub repository
   - Render will automatically deploy using the updated `render.yaml`
   - The fix script will run during deployment to ensure tables exist

## Troubleshooting

If login issues persist:

1. **Verify database tables exist:**
   ```bash
   python -c "import sqlite3; conn = sqlite3.connect('instance/attendance.db'); print(conn.execute('SELECT name FROM sqlite_master WHERE type=\"table\"').fetchall())"
   ```

2. **Verify admin user exists:**
   ```bash
   python -c "import sqlite3; conn = sqlite3.connect('instance/attendance.db'); print(conn.execute('SELECT * FROM users WHERE username=\"admin\"').fetchall())"
   ```

3. **Reset admin password manually:**
   ```bash
   python -c "import sqlite3; from werkzeug.security import generate_password_hash; conn = sqlite3.connect('instance/attendance.db'); conn.execute('UPDATE users SET password = ? WHERE username = \"admin\"', (generate_password_hash('admin123'),)); conn.commit()"
   ```

## Important Notes

- The fix preserves all existing data in other tables like `employees`, `projects`, etc.
- The admin login works with either table (`users` or `admins`) for backward compatibility
- Password security is maintained through proper hashing