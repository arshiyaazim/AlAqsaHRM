# Field Attendance Tracker - Login Fix Guide

If you're experiencing login issues with the Field Attendance Tracker application, this guide will help resolve them.

## Understanding the Dual Authentication System

The application has two separate but interconnected authentication systems:

1. **User Authentication** (`users` table)
   - Used for the main application login (`/login` or `/`)
   - Handles role-based access control
   - Creates session with `user_id`

2. **Admin Authentication** (`admins` table) 
   - Used for the admin panel (`/admin/login`)
   - Creates session with `admin_id`
   - Provides access to administrative features

## Common Login Issues

1. **"Internal Server Error" After Login**
   - Usually caused by missing database tables like `activity_logs`
   - Fix by running `fix_login.py` to create all required tables

2. **"Incorrect Username/Password" Despite Correct Credentials**
   - Usually caused by mismatched passwords between `users` and `admins` tables
   - Fix by running `fix_login.py` to reset admin passwords in both tables

3. **Missing Admin Interface**
   - Usually caused by the admin user missing the 'admin' role in the `users` table
   - Fix by running `fix_login.py` which ensures proper role assignment

## Quick Fix Instructions

### Step 1: Run the Automatic Fix Script

```
python fix_login.py
```

This comprehensive script will:
- Create missing database tables (users, admins, activity_logs, etc.)
- Reset the admin password to the default in both tables
- Fix inconsistencies between authentication systems
- Create default accounts (admin, asls.guards, arshiya.azim) if missing
- Set correct admin roles across the system

### Step 2: Verify Login with Default Credentials

After running the script, try logging in with any of the default accounts:

| Username/Email | Password |
|--------------|----------|
| admin | admin123 |
| asls.guards@gmail.com | admin123 |
| arshiya.azim.1980@gmail.com | admin123 |

These accounts are configured to work with both:
- Main login page: `/login` or `/`
- Admin login page: `/admin/login`

## Advanced Troubleshooting

If issues persist after the fix script:

### 1. Verify Database Tables

Check that all required tables exist:

```python
python -c "import sqlite3; conn = sqlite3.connect('instance/attendance.db'); print('Tables in database:'); cursor = conn.execute('SELECT name FROM sqlite_master WHERE type=\"table\"'); [print(row[0]) for row in cursor]; conn.close()"
```

Required tables include: `users`, `admins`, `activity_logs`, `attendance`, `projects`, etc.

### 2. Verify Admin Users

Check admin user entries:

```python
python -c "import sqlite3; conn = sqlite3.connect('instance/attendance.db'); print('User entries:'); cursor = conn.execute('SELECT id, username, email, role FROM users'); [print(row) for row in cursor]; print('\\nAdmin entries:'); cursor = conn.execute('SELECT id, username, email FROM admins'); [print(row) for row in cursor]; conn.close()"
```

### 3. Manually Reset Admin Password

If login still fails, manually reset the admin password:

```python
python -c "from werkzeug.security import generate_password_hash; import sqlite3; conn = sqlite3.connect('instance/attendance.db'); hashed_pw = generate_password_hash('admin123'); conn.execute('UPDATE users SET password = ? WHERE username = \"admin\"', (hashed_pw,)); conn.execute('UPDATE admins SET password = ? WHERE username = \"admin\"', (hashed_pw,)); conn.commit(); print('Admin password reset successfully'); conn.close()"
```

### 4. Check Session Configuration

If login succeeds but redirects fail, check your session configuration:

```python
python -c "from app import app; print('Session config:', app.config.get('SESSION_TYPE'), app.config.get('SECRET_KEY'))"
```

### 5. Login API Diagnostic 

For React frontend login issues:

```
curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}'
```

## Deployment-Specific Fixes

### Render.com Deployments

When deploying to Render.com, run these commands in the Render shell:

1. Fix login tables:
```
python fix_login.py
```

2. Check for missing tables:
```
python check_tables.py
```

3. Reset admin password if needed:
```
python -c "from werkzeug.security import generate_password_hash; import sqlite3; conn = sqlite3.connect('instance/attendance.db'); hashed_pw = generate_password_hash('admin123'); conn.execute('UPDATE users SET password = ? WHERE username = \"admin\"', (hashed_pw,)); conn.execute('UPDATE admins SET password = ? WHERE username = \"admin\"', (hashed_pw,)); conn.commit(); print('Admin password reset successfully'); conn.close()"
```

## Security Note

After successfully logging in, you should immediately:
1. Change the default admin password 
2. Create additional admin users as needed
3. Limit access to the admin panel via IP restrictions if possible

## Additional Help

If issues persist after trying all the above steps, please contact support with:
1. The output of running `python fix_login.py`
2. Database table verification output
3. The exact login error message you're seeing