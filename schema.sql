-- Field Attendance Tracker SQL Schema

-- Drop existing tables if they exist
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS custom_fields;
DROP TABLE IF EXISTS field_connections;
DROP TABLE IF EXISTS suggestions;
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS error_logs;
DROP TABLE IF EXISTS menu_items;
DROP TABLE IF EXISTS custom_styles;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS cash_receives;
DROP TABLE IF EXISTS cash_payments;
DROP TABLE IF EXISTS import_history;

-- Users Table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  email TEXT UNIQUE,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  last_login TIMESTAMP
);

-- Activity Logs
CREATE TABLE activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Error Logs
CREATE TABLE error_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_details TEXT,
  device_info TEXT,
  resolved INTEGER NOT NULL DEFAULT 0,
  resolution_notes TEXT,
  resolved_by INTEGER,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (resolved_by) REFERENCES users (id)
);

-- Projects Table
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  client TEXT,
  start_date DATE,
  end_date DATE,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  created_by INTEGER,
  FOREIGN KEY (created_by) REFERENCES users (id)
);

-- Form Fields
CREATE TABLE form_fields (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  form_id TEXT NOT NULL,  -- Identifies the form this field belongs to (e.g., 'attendance', 'project', etc.)
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL,  -- text, number, date, select, checkbox, etc.
  required INTEGER NOT NULL DEFAULT 0,
  default_value TEXT,
  placeholder TEXT,
  options TEXT,  -- JSON string for select, radio, checkbox options
  validation TEXT,  -- JSON string for validation rules
  display_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  suggestions_enabled INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  created_by INTEGER,
  FOREIGN KEY (created_by) REFERENCES users (id),
  UNIQUE(form_id, field_name)
);

-- Field Connections (for field dependencies and calculations)
CREATE TABLE field_connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_field_id INTEGER NOT NULL,
  target_field_id INTEGER NOT NULL,
  connection_type TEXT NOT NULL,  -- show_related, copy, add, subtract, multiply, divide, custom_formula
  parameters TEXT,  -- JSON string for additional parameters
  active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  created_by INTEGER,
  FOREIGN KEY (source_field_id) REFERENCES form_fields (id),
  FOREIGN KEY (target_field_id) REFERENCES form_fields (id),
  FOREIGN KEY (created_by) REFERENCES users (id)
);

-- Field Suggestions Storage
CREATE TABLE suggestions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  field_id INTEGER NOT NULL,
  value TEXT NOT NULL,
  frequency INTEGER NOT NULL DEFAULT 1,
  last_used TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (field_id) REFERENCES form_fields (id),
  UNIQUE(field_id, value)
);

-- Attendance Records
CREATE TABLE attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER,
  employee_id TEXT NOT NULL,
  employee_name TEXT,
  clock_in TEXT,
  clock_out TEXT,
  date DATE NOT NULL,
  latitude REAL,
  longitude REAL,
  accuracy REAL,
  photo_path TEXT,
  notes TEXT,
  offline_record INTEGER NOT NULL DEFAULT 0,
  device_info TEXT,
  synced_at TIMESTAMP,
  custom_fields TEXT,  -- JSON string for custom field values
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  created_by INTEGER,
  FOREIGN KEY (project_id) REFERENCES projects (id),
  FOREIGN KEY (created_by) REFERENCES users (id)
);

-- Menu Items
CREATE TABLE menu_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id INTEGER,
  title TEXT NOT NULL,
  url TEXT,
  icon TEXT,
  roles TEXT,  -- Comma-separated list of roles that can see this item
  display_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES menu_items (id)
);

-- Custom Styles
CREATE TABLE custom_styles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  element TEXT NOT NULL,
  style_type TEXT NOT NULL,  -- color, background, font, etc.
  value TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  created_by INTEGER,
  FOREIGN KEY (created_by) REFERENCES users (id)
);

-- Employees Table
CREATE TABLE employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT,
  full_name TEXT,
  id_number TEXT,
  passport_number TEXT,
  phone TEXT,
  alt_phone TEXT,
  emergency_contact TEXT,
  position TEXT,
  department TEXT,
  joining_date DATE,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  gender TEXT,
  date_of_birth DATE,
  nationality TEXT,
  status TEXT DEFAULT 'active',
  custom_fields TEXT,  -- JSON string for custom field values
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  import_id INTEGER,
  FOREIGN KEY (import_id) REFERENCES import_history (id)
);

-- Cash Receives Table
CREATE TABLE cash_receives (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE NOT NULL,
  description TEXT,
  amount REAL NOT NULL,
  received_from TEXT,
  received_by TEXT,
  receipt_number TEXT,
  category TEXT,
  project_id INTEGER,
  status TEXT DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  import_id INTEGER,
  FOREIGN KEY (project_id) REFERENCES projects (id),
  FOREIGN KEY (import_id) REFERENCES import_history (id)
);

-- Cash Payments Table
CREATE TABLE cash_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE NOT NULL,
  description TEXT,
  amount REAL NOT NULL,
  paid_to TEXT,
  paid_by TEXT,
  payment_method TEXT,
  reference_number TEXT,
  category TEXT,
  project_id INTEGER,
  status TEXT DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  import_id INTEGER,
  FOREIGN KEY (project_id) REFERENCES projects (id),
  FOREIGN KEY (import_id) REFERENCES import_history (id)
);

-- Import History
CREATE TABLE import_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_name TEXT NOT NULL,
  file_path TEXT,
  import_type TEXT NOT NULL,  -- employees, cash_receives, cash_payments, etc.
  total_records INTEGER NOT NULL DEFAULT 0,
  imported_records INTEGER NOT NULL DEFAULT 0,
  skipped_records INTEGER NOT NULL DEFAULT 0,
  failed_records INTEGER NOT NULL DEFAULT 0,
  error_details TEXT,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  status TEXT DEFAULT 'in_progress',
  imported_by INTEGER,
  FOREIGN KEY (imported_by) REFERENCES users (id)
);

-- Create default admin user: username 'admin', password 'admin123' (hashed)
INSERT INTO users (username, password, email, name, role)
VALUES ('admin', 'pbkdf2:sha256:150000$ImwYPUTT$e0aebfc4675e591c1b7047fe760d41f69241f573b7d817abb324f724ce329b61', 'admin@example.com', 'Administrator', 'admin');

-- Create default menu items
INSERT INTO menu_items (title, url, icon, roles, display_order)
VALUES 
  ('Dashboard', '/admin/dashboard', 'bi-speedometer2', 'admin,hr', 1),
  ('Projects', '/admin/projects', 'bi-building', 'admin,hr', 2),
  ('Attendance', '/admin/attendance', 'bi-clock-history', 'admin,hr', 3),
  ('Users', '/admin/users', 'bi-people', 'admin', 4),
  ('Form Fields', '/admin/fields', 'bi-input-cursor-text', 'admin', 5),
  ('Reports', '/admin/reports', 'bi-file-earmark-text', 'admin,hr', 6),
  ('Settings', '/admin/settings', 'bi-gear', 'admin', 7),
  ('Error Logs', '/admin/error-logs', 'bi-bug', 'admin,hr', 8);

-- Create default projects
INSERT INTO projects (name, description, location, active)
VALUES ('General', 'Default project for general attendance', 'All Locations', 1);

-- Create default form fields for attendance form
INSERT INTO form_fields (form_id, field_name, field_label, field_type, required, display_order)
VALUES 
  ('attendance', 'employee_id', 'Employee ID', 'text', 1, 1),
  ('attendance', 'employee_name', 'Employee Name', 'text', 1, 2),
  ('attendance', 'project_id', 'Project', 'select', 1, 3),
  ('attendance', 'date', 'Date', 'date', 1, 4),
  ('attendance', 'clock_in', 'Clock In Time', 'time', 0, 5),
  ('attendance', 'clock_out', 'Clock Out Time', 'time', 0, 6),
  ('attendance', 'notes', 'Notes', 'textarea', 0, 7);

-- Enable suggestions for employee fields
UPDATE form_fields SET suggestions_enabled = 1 WHERE field_name IN ('employee_id', 'employee_name');

-- Create field connection to auto-fill employee name based on ID
INSERT INTO field_connections (source_field_id, target_field_id, connection_type, parameters)
VALUES (
  (SELECT id FROM form_fields WHERE form_id = 'attendance' AND field_name = 'employee_id'),
  (SELECT id FROM form_fields WHERE form_id = 'attendance' AND field_name = 'employee_name'),
  'show_related',
  '{"api_endpoint": "/api/related_field_value"}'
);