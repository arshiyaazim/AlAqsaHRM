# Al-Aqsa HRM - Deployment Guide

This document provides comprehensive instructions for deploying the Al-Aqsa HRM Field Attendance Tracker to a production environment.

## Deployment Options

You can deploy this application using:

1. **Dokploy** - Recommended for its simplicity and performance
2. **Render** - Alternative platform with similar capabilities
3. **Self-hosting** - For complete control over your environment

## Prerequisites

Before deploying, ensure you have:

1. Your application code in a Git repository
2. Access to your chosen deployment platform
3. Google Maps API key for location tracking features
4. Database credentials (if using external database)

## Environment Variables

The following environment variables must be configured in your deployment platform:

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `SECRET_KEY` | Flask secret key for session security | Yes | Random string of characters |
| `DATABASE_URL` | Database connection URL | Yes | `postgresql://user:password@host/dbname` |
| `GOOGLE_MAPS_API_KEY` | API key for Google Maps integration | Yes | Your Google Maps API key |
| `FLASK_APP` | Main Flask application file | Yes | `app.py` |
| `FLASK_ENV` | Environment (production/development) | Yes | `production` |
| `PORT` | Port to run the application on | Yes | `8000` |
| `COMPANY_NAME` | Your company name | No | `Al-Aqsa Security` |
| `COMPANY_TAGLINE` | Your company tagline | No | `HR & Payroll Management System` |
| `SESSION_COOKIE_SECURE` | Force secure cookies | Recommended | `true` |
| `SESSION_COOKIE_HTTPONLY` | Prevent JavaScript access to cookies | Recommended | `true` |
| `SESSION_COOKIE_SAMESITE` | Cookie same-site policy | Recommended | `Lax` |
| `SESSION_TIMEOUT` | Session timeout in seconds | Recommended | `86400` (24 hours) |

## Deployment Steps

### Using Dokploy

1. Push your code to a Git repository
2. Log in to your Dokploy account
3. Create a new application and connect your repository
4. Configure the environment variables listed above
5. Deploy your application
6. Monitor the build and deployment logs for any issues

### Using Render

1. Push your code to a Git repository
2. Log in to your Render account
3. Create a new Web Service
4. Connect your repository
5. Configure the environment variables
6. Set the build command to: `cd client && npm install && npm run build && cd .. && pip install -r requirements.txt`
7. Set the start command to: `gunicorn wsgi:app`
8. Deploy your application

## Post-Deployment Steps

After deployment, you should:

1. Run database migrations if needed
2. Create the default admin user
3. Verify the application is working correctly:
   - Test login functionality
   - Check location tracking
   - Verify employee management features
   - Test role-based access control

## Database Initialization

If you're deploying for the first time, the application will automatically:

1. Create all necessary database tables
2. Create default admin, HR, and viewer users with credentials defined in environment variables
3. Seed sample data for testing (only if no data exists)

## Troubleshooting

If you encounter issues during deployment:

1. Check the application logs for error messages
2. Verify all environment variables are set correctly
3. Ensure the database connection is working
4. Check for any build failures in the deployment logs

## Health Checks

The application provides a `/api/health` endpoint that returns status information. Use this to verify your deployment is working correctly.

## Security Considerations

For production deployments:

1. Always use HTTPS in production
2. Set `SESSION_COOKIE_SECURE=true` when using HTTPS
3. Change default admin credentials immediately after deployment
4. Use a strong, unique `SECRET_KEY`
5. Consider implementing rate limiting for API endpoints
6. Regularly update dependencies to patch security vulnerabilities

## Scaling Considerations

For high-traffic deployments:

1. Consider using a more robust database like PostgreSQL instead of SQLite
2. Implement caching for frequently accessed data
3. Use a load balancer if deploying multiple instances
4. Configure proper database connection pooling

---

For additional assistance, contact the development team.