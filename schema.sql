-- Al-Aqsa Security - Attendance System Database Schema

-- Drop existing tables if they exist
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS admins;

-- Admins Table
CREATE TABLE admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Projects Table
CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    location TEXT,
    start_date DATE,
    end_date DATE,
    active BOOLEAN NOT NULL DEFAULT 1,
    custom_fields TEXT,  -- JSON string to store custom fields
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Attendance Records
CREATE TABLE attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id TEXT NOT NULL,
    action TEXT NOT NULL,  -- 'Clock In' or 'Clock Out'
    project_id INTEGER,
    project_name TEXT,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    latitude TEXT,
    longitude TEXT,
    photo_path TEXT,
    FOREIGN KEY (project_id) REFERENCES projects (id)
);

-- Create index for faster queries
CREATE INDEX idx_attendance_employee_id ON attendance(employee_id);
CREATE INDEX idx_attendance_timestamp ON attendance(timestamp);
CREATE INDEX idx_attendance_project_id ON attendance(project_id);