"""
WSGI entry point for AlAqsaHRM application
Used by Gunicorn in production environments
"""

import os
import logging

# Set up logging before anything else
if not os.path.exists('logs'):
    os.makedirs('logs')

logging.basicConfig(
    filename='logs/app.log',
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

from app import app

# Ensure database is initialized when running with Gunicorn
with app.app_context():
    try:
        from app import init_app_db
        logging.info("Initializing database from WSGI entry point")
        init_app_db()
        logging.info("Database initialization complete")
    except Exception as e:
        logging.error(f"Database initialization error in WSGI: {str(e)}")
        logging.error("Application will continue but may encounter database errors")

# For gunicorn
application = app

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))