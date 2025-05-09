-- Initialize the database schema for Al-Aqsa Security Attendance Tracking System

-- Drop existing tables if they exist
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS project_custom_fields;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS form_fields;
DROP TABLE IF EXISTS field_connections;
DROP TABLE IF EXISTS styles;
DROP TABLE IF EXISTS menu_items;
DROP TABLE IF EXISTS error_logs;
DROP TABLE IF EXISTS users;

-- Users Table for administrative users
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'viewer',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

-- Insert initial admin user
INSERT INTO users (username, password, role) 
VALUES ('admin', 'pbkdf2:sha256:150000$crUVSeJG$8fc28e8fc6f731b3b73e75e6686f35a48ec9b16c12f8fc7c08e2f78f1de56ea7', 'admin');

-- Projects Table
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  start_date DATE,
  end_date DATE,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Project Custom Fields
CREATE TABLE project_custom_fields (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL,
  required INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (project_id) REFERENCES projects (id)
);

-- Attendance Records
CREATE TABLE attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  project_id INTEGER,
  clock_in TIMESTAMP,
  clock_out TIMESTAMP,
  status TEXT,
  latitude REAL,
  longitude REAL,
  photo_path TEXT,
  notes TEXT,
  custom_fields TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects (id)
);

-- Form Fields
CREATE TABLE form_fields (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  form_id TEXT NOT NULL,
  field_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  field_type TEXT NOT NULL,
  options TEXT,
  required INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Field Connections
CREATE TABLE field_connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_field_id INTEGER NOT NULL,
  target_field_id INTEGER NOT NULL,
  connection_type TEXT NOT NULL,
  parameters TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_field_id) REFERENCES form_fields (id),
  FOREIGN KEY (target_field_id) REFERENCES form_fields (id)
);

-- Menu Items
CREATE TABLE menu_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT,
  parent_id INTEGER,
  position INTEGER NOT NULL DEFAULT 0,
  visible_to TEXT DEFAULT 'all',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES menu_items (id)
);

-- Insert default menu items
INSERT INTO menu_items (name, url, icon, position, visible_to) 
VALUES 
  ('Home', '/', 'bi-house', 1, 'all'),
  ('Clock In/Out', '/mobile_app', 'bi-clock', 2, 'all'),
  ('Admin Dashboard', '/admin/dashboard', 'bi-speedometer2', 3, 'admin,hr'),
  ('Projects', '/admin/projects', 'bi-building', 4, 'admin,hr'),
  ('Users', '/admin/users', 'bi-people', 5, 'admin'),
  ('Menu Management', '/admin/menu', 'bi-list', 6, 'admin'),
  ('Form Fields', '/admin/fields', 'bi-input-cursor-text', 7, 'admin'),
  ('Field Connections', '/admin/connections', 'bi-diagram-3', 8, 'admin'),
  ('Styling', '/admin/styling', 'bi-palette', 9, 'admin'),
  ('System Health', '/admin/system_health', 'bi-heart-pulse', 10, 'admin');

-- Custom Styling Settings
CREATE TABLE styles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  background_color TEXT NOT NULL DEFAULT '#ffffff',
  text_color TEXT NOT NULL DEFAULT '#333333',
  font_size TEXT NOT NULL DEFAULT '16px',
  custom_css TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default styling
INSERT INTO styles (background_color, text_color, font_size) 
VALUES ('#f8f9fa', '#333333', '16px');

-- Error Logs
CREATE TABLE error_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_details TEXT,
  resolved INTEGER NOT NULL DEFAULT 0,
  resolution_notes TEXT,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample project data
INSERT INTO projects (name, description, address, start_date, end_date, active)
VALUES 
  ('Headquarters', 'Main building security monitoring', '123 Main Street, City Center', '2023-01-01', '2025-12-31', 1),
  ('East Wing Branch', 'Branch office security', '456 East Avenue, Industrial Zone', '2023-03-15', '2025-06-30', 1);

-- Insert sample form fields for attendance form
INSERT INTO form_fields (form_id, field_name, display_name, field_type, position, required)
VALUES 
  ('attendance', 'employee_id', 'Employee ID', 'text', 1, 1),
  ('attendance', 'employee_name', 'Employee Name', 'text', 2, 1),
  ('attendance', 'project_id', 'Project', 'select', 3, 1),
  ('attendance', 'latitude', 'Latitude', 'text', 4, 1),
  ('attendance', 'longitude', 'Longitude', 'text', 5, 1),
  ('attendance', 'photo', 'Photo', 'file', 6, 0),
  ('attendance', 'notes', 'Notes', 'textarea', 7, 0);