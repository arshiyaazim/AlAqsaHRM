# Dokploy Deployment Guide for Al-Aqsa HRM

## Prerequisites
- A Dokploy account
- Git repository with your application code
- Environment variables set up (see .env.example file)

## Project Structure
The Al-Aqsa HRM application follows a standard Flask + React structure:

```
├── .env                   # Environment variables (do not commit to git)
├── .gitignore             # Git ignore file
├── .nixpacks.toml         # Nixpacks configuration for Dokploy
├── README.md              # Project documentation
├── app.py                 # Main Flask application
├── app_config.py          # Application configuration
├── app_init.py            # Application initialization
├── auth.py                # Authentication logic
├── manage.py              # Command-line management script
├── models.py              # Database models
├── requirements.txt       # Python dependencies
├── wsgi.py                # WSGI entry point for production
├── client/                # React frontend
│   ├── package.json       # Frontend dependencies
│   ├── public/            # Static assets
│   ├── src/               # Source code
│   │   ├── components/    # React components
│   │   ├── lib/utils/     # Utility functions
│   │   │   └── googleMaps.ts  # Google Maps utility
│   │   └── pages/         # Application pages
├── instance/              # Instance-specific files
│   └── attendance.db      # SQLite database
├── migrations/            # Database migrations
├── server/                # Server-specific code
├── shared/                # Shared code between client and server
├── static/                # Static files
│   └── images/            # Static images
├── templates/             # Flask templates
└── uploads/               # File uploads
```

## Deployment Steps

1. Push your code to a Git repository
2. Connect your repository to Dokploy
3. Configure the following environment variables in Dokploy:
   - `PORT`: 8000
   - `DATABASE_URL`: Your database URL (SQLite or PostgreSQL)
   - `SECRET_KEY`: A secure random string
   - `GOOGLE_MAPS_API_KEY`: Your Google Maps API key
   - `FLASK_APP`: app.py
   - `FLASK_ENV`: production
   - `ADMIN_USERNAME`: Default admin username
   - `ADMIN_PASSWORD`: Default admin password
   - `SESSION_TIMEOUT`: 86400 (24 hours in seconds)

4. Deploy your application using Dokploy

## Post-Deployment Steps

1. Initialize the database if it's a fresh installation
2. Verify all environment variables are set correctly
3. Check logs for any errors
4. Test the application functionality

## Troubleshooting

If you encounter errors during deployment, check:

1. The Nixpacks build log for build errors
2. Application logs for runtime errors
3. Environment variables are set correctly
4. Database connection is working properly
5. File permissions for uploaded files and database

For detailed information on debugging Dokploy deployments, refer to the Dokploy documentation.