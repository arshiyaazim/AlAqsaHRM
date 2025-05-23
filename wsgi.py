"""
WSGI entry point for the Flask application.
This file is used by Gunicorn or other WSGI servers to run the app.
"""
import os
from app_init import app

if __name__ == "__main__":
    # Run the app directly when this file is executed
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))