#!/usr/bin/env python
"""
Build Standalone Executable for Field Attendance Tracker

This script builds a standalone executable for the Field Attendance Tracker application
using PyInstaller, which can be used without Python installation.
"""

import os
import sys
import shutil
import subprocess
import logging
from datetime import datetime

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("build.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Constants
TIMESTAMP = datetime.now().strftime("%Y%m%d_%H%M%S")
BUILD_DIR = "build"
DIST_DIR = "dist"
SPEC_FILE = "field_attendance_tracker.spec"
OUTPUT_DIR = os.path.join(DIST_DIR, "field_attendance_tracker")

def check_pyinstaller():
    """Check if PyInstaller is installed."""
    try:
        import PyInstaller
        logger.info("PyInstaller is already installed.")
        return True
    except ImportError:
        logger.info("PyInstaller is not installed. Installing...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])
            logger.info("PyInstaller installed successfully.")
            return True
        except Exception as e:
            logger.error(f"Failed to install PyInstaller: {str(e)}")
            return False

def clean_build_directories():
    """Clean up existing build and dist directories."""
    for directory in [BUILD_DIR, DIST_DIR]:
        if os.path.exists(directory):
            logger.info(f"Removing existing directory: {directory}")
            shutil.rmtree(directory)

def copy_required_files(target_dir):
    """Copy required files to the distribution directory."""
    try:
        # Create target directories
        os.makedirs(os.path.join(target_dir, "static"), exist_ok=True)
        os.makedirs(os.path.join(target_dir, "templates"), exist_ok=True)
        os.makedirs(os.path.join(target_dir, "exports"), exist_ok=True)
        
        # Copy static files
        if os.path.exists("static"):
            logger.info("Copying static files...")
            shutil.copytree("static", os.path.join(target_dir, "static"), dirs_exist_ok=True)
        
        # Copy templates
        if os.path.exists("templates"):
            logger.info("Copying templates...")
            shutil.copytree("templates", os.path.join(target_dir, "templates"), dirs_exist_ok=True)
        
        # Copy database if it exists
        if os.path.exists("employee_data.db"):
            logger.info("Copying database...")
            shutil.copy2("employee_data.db", os.path.join(target_dir, "employee_data.db"))
        
        # Copy other configuration files
        for file in [".env", "config.ini"]:
            if os.path.exists(file):
                logger.info(f"Copying {file}...")
                shutil.copy2(file, os.path.join(target_dir, file))
        
        logger.info("All required files copied successfully.")
        return True
    except Exception as e:
        logger.error(f"Failed to copy required files: {str(e)}")
        return False

def create_launcher(target_dir):
    """Create a launcher batch file."""
    try:
        launcher_path = os.path.join(target_dir, "Field_Attendance_Tracker.bat")
        with open(launcher_path, "w") as f:
            f.write('@echo off\r\n')
            f.write('echo Starting Field Attendance Tracker...\r\n')
            f.write('start "" "%~dp0\\field_attendance_tracker.exe"\r\n')
        logger.info(f"Created launcher: {launcher_path}")
        return True
    except Exception as e:
        logger.error(f"Failed to create launcher: {str(e)}")
        return False

def build_executable():
    """Build the executable using PyInstaller."""
    try:
        logger.info("Starting build process...")
        
        # Create PyInstaller command
        cmd = [
            sys.executable, 
            "-m", 
            "PyInstaller",
            "--clean",
            "--name=field_attendance_tracker",
            "--windowed",
            "--add-data=static;static",
            "--add-data=templates;templates",
            "--icon=static/logo.ico" if os.path.exists("static/logo.ico") else "",
            "app.py"
        ]
        
        # Remove empty arguments
        cmd = [arg for arg in cmd if arg]
        
        # Execute PyInstaller
        logger.info(f"Running command: {' '.join(cmd)}")
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, universal_newlines=True)
        
        # Display output in real-time
        for line in process.stdout:
            line = line.strip()
            if line:
                logger.info(line)
        
        # Wait for process to complete
        process.wait()
        
        if process.returncode != 0:
            stderr = process.stderr.read()
            logger.error(f"Build failed with return code {process.returncode}: {stderr}")
            return False
        
        logger.info("Build process completed successfully.")
        return True
    except Exception as e:
        logger.error(f"Build process failed: {str(e)}")
        return False

def create_distribution_package():
    """Create a distribution package zip."""
    try:
        # Create zip file
        dist_zip = f"field_attendance_tracker_{TIMESTAMP}.zip"
        logger.info(f"Creating distribution package: {dist_zip}")
        
        shutil.make_archive(
            os.path.join(DIST_DIR, "field_attendance_tracker"),
            'zip',
            DIST_DIR,
            "field_attendance_tracker"
        )
        
        logger.info(f"Distribution package created: {os.path.join(DIST_DIR, dist_zip)}")
        return True
    except Exception as e:
        logger.error(f"Failed to create distribution package: {str(e)}")
        return False

def main():
    """Main build process."""
    logger.info("=== Starting Field Attendance Tracker Build Process ===")
    
    # Check if PyInstaller is installed
    if not check_pyinstaller():
        logger.error("Cannot proceed without PyInstaller. Exiting.")
        return 1
    
    # Clean build directories
    clean_build_directories()
    
    # Build the executable
    if not build_executable():
        logger.error("Failed to build executable. Exiting.")
        return 1
    
    # Copy required files
    if not copy_required_files(OUTPUT_DIR):
        logger.warning("Some files may be missing from the distribution.")
    
    # Create launcher
    create_launcher(OUTPUT_DIR)
    
    # Create distribution package
    create_distribution_package()
    
    logger.info("=== Field Attendance Tracker Build Process Completed ===")
    logger.info(f"Executable is available at: {os.path.join(OUTPUT_DIR, 'field_attendance_tracker.exe')}")
    logger.info(f"Distribution package is available at: {os.path.join(DIST_DIR, 'field_attendance_tracker.zip')}")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())