"""
Error Handling Routes for Field Attendance Tracker
"""

import json
import sqlite3
import traceback
from datetime import datetime, timedelta
from flask import (
    Blueprint, flash, g, redirect, render_template, request,
    url_for, jsonify, current_app, session
)
from werkzeug.exceptions import HTTPException

# Create a blueprint
bp = Blueprint('errors', __name__, url_prefix='/admin/error-logs')

# Error logging
def log_error(error_type, error_message, error_details=None):
    """Log error to database and file"""
    try:
        # Get database connection
        db = current_app.extensions['get_db']()
        
        # Convert error_details to JSON string if it's a dict
        error_details_json = None
        if error_details:
            if isinstance(error_details, dict):
                error_details_json = json.dumps(error_details)
            else:
                error_details_json = str(error_details)
        
        # Get device info if available in error details
        device_info = None
        if isinstance(error_details, dict) and 'deviceInfo' in error_details:
            device_info = json.dumps(error_details['deviceInfo'])
        
        # Insert error into database
        db.execute(
            'INSERT INTO error_logs (error_type, error_message, error_details, device_info, created_at) '
            'VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
            (error_type, error_message, error_details_json, device_info)
        )
        db.commit()
        
        # Also log to file
        current_app.logger.error(f"Error Type: {error_type}, Message: {error_message}")
        if error_details:
            current_app.logger.error(f"Details: {error_details}")
    except Exception as e:
        # If we can't log to the database, at least log to file
        current_app.logger.error(f"Failed to log error to database: {e}")
        current_app.logger.error(f"Original error - Type: {error_type}, Message: {error_message}")
        if error_details:
            current_app.logger.error(f"Details: {error_details}")

@bp.route('/')
def error_logs():
    """View error logs with filtering and pagination."""
    # Check if user has permission
    if g.user is None or g.user['role'] not in ['admin', 'hr']:
        flash('You do not have permission to access this page.', 'danger')
        return redirect(url_for('login'))
    
    # Get query parameters for filtering
    error_type = request.args.get('error_type')
    resolved = request.args.get('resolved')
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    page = int(request.args.get('page', 1))
    per_page = 20  # Number of logs per page
    
    db = current_app.extensions['get_db']()
    
    # Build the query
    query = 'SELECT * FROM error_logs WHERE 1=1'
    query_params = []
    
    if error_type:
        query += ' AND error_type = ?'
        query_params.append(error_type)
    
    if resolved is not None:
        query += ' AND resolved = ?'
        query_params.append(int(resolved))
    
    if date_from:
        query += ' AND DATE(created_at) >= DATE(?)'
        query_params.append(date_from)
    
    if date_to:
        query += ' AND DATE(created_at) <= DATE(?)'
        query_params.append(date_to)
    
    # Count total matching records for pagination
    count_query = 'SELECT COUNT(*) as count FROM error_logs WHERE 1=1'
    if error_type:
        count_query += ' AND error_type = ?'
    if resolved is not None:
        count_query += ' AND resolved = ?'
    if date_from:
        count_query += ' AND DATE(created_at) >= DATE(?)'
    if date_to:
        count_query += ' AND DATE(created_at) <= DATE(?)'
    
    total_count = db.execute(count_query, query_params).fetchone()['count']
    total_pages = (total_count + per_page - 1) // per_page  # Ceiling division
    
    # Add pagination to the query
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    query_params.extend([per_page, (page - 1) * per_page])
    
    # Execute the query
    error_logs = db.execute(query, query_params).fetchall()
    
    # Get unique error types for filter dropdown
    error_types = db.execute('SELECT DISTINCT error_type FROM error_logs ORDER BY error_type').fetchall()
    
    # Parse JSON in error_details field
    parsed_logs = []
    for log in error_logs:
        log_dict = dict(log)
        if log_dict['error_details']:
            try:
                log_dict['error_details_formatted'] = json.dumps(json.loads(log_dict['error_details']), indent=2)
            except:
                # If not valid JSON, keep as is
                log_dict['error_details_formatted'] = log_dict['error_details']
        parsed_logs.append(log_dict)
    
    return render_template(
        'admin_error_logs.html', 
        error_logs=parsed_logs, 
        error_types=error_types,
        page=page, 
        total_pages=total_pages,
        filter_error_type=error_type,
        filter_resolved=resolved,
        filter_date_from=date_from,
        filter_date_to=date_to
    )

@bp.route('/resolve/<int:error_id>', methods=['POST', 'GET'])
def resolve_error(error_id):
    """Mark an error as resolved."""
    if g.user is None or g.user['role'] not in ['admin', 'hr']:
        flash('You do not have permission to access this page.', 'danger')
        return redirect(url_for('login'))
    
    db = current_app.extensions['get_db']()
    
    # Check if the error exists
    error = db.execute('SELECT * FROM error_logs WHERE id = ?', (error_id,)).fetchone()
    if not error:
        flash('Error not found.', 'danger')
        return redirect(url_for('error_logs'))
    
    # Get resolution notes if provided
    resolution_notes = request.form.get('resolution_notes', '')
    
    # Update the error
    db.execute(
        'UPDATE error_logs SET resolved = 1, resolution_notes = ?, resolved_at = CURRENT_TIMESTAMP, '
        'resolved_by = ? WHERE id = ?',
        (resolution_notes, g.user['id'] if g.user else None, error_id)
    )
    db.commit()
    
    flash('Error marked as resolved.', 'success')
    
    # Redirect back to the previous page or error logs page
    next_page = request.args.get('next') or url_for('errors.error_logs')
    return redirect(next_page)

@bp.route('/export')
def export_error_logs():
    """Export error logs to Excel or CSV."""
    if g.user is None or g.user['role'] not in ['admin', 'hr']:
        flash('You do not have permission to access this page.', 'danger')
        return redirect(url_for('login'))
    
    format_type = request.args.get('format', 'excel')
    
    # Get query parameters for filtering
    error_type = request.args.get('error_type')
    resolved = request.args.get('resolved')
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    
    db = current_app.extensions['get_db']()
    
    # Build the query
    query = 'SELECT * FROM error_logs WHERE 1=1'
    query_params = []
    
    if error_type:
        query += ' AND error_type = ?'
        query_params.append(error_type)
    
    if resolved is not None:
        query += ' AND resolved = ?'
        query_params.append(int(resolved))
    
    if date_from:
        query += ' AND DATE(created_at) >= DATE(?)'
        query_params.append(date_from)
    
    if date_to:
        query += ' AND DATE(created_at) <= DATE(?)'
        query_params.append(date_to)
    
    query += ' ORDER BY created_at DESC'
    
    # Execute the query
    error_logs = db.execute(query, query_params).fetchall()
    
    # TODO: Implement Excel and CSV exports
    if format_type == 'excel':
        # For now, just return a message
        flash('Excel export not implemented yet. Coming soon!', 'info')
        return redirect(url_for('errors.error_logs'))
    else:
        # For now, just return a message
        flash('CSV export not implemented yet. Coming soon!', 'info')
        return redirect(url_for('errors.error_logs'))

@bp.route('/cleanup', methods=['POST'])
def cleanup_error_logs():
    """Clean up old error logs."""
    if g.user is None or g.user['role'] != 'admin':
        flash('You do not have permission to access this page.', 'danger')
        return redirect(url_for('login'))
    
    cleanup_type = request.form.get('cleanup_type', 'resolved')
    older_than = int(request.form.get('older_than', 30))
    
    db = current_app.extensions['get_db']()
    
    # Calculate the cutoff date
    cutoff_date = datetime.now() - timedelta(days=older_than)
    cutoff_str = cutoff_date.strftime('%Y-%m-%d %H:%M:%S')
    
    # Build the query
    if cleanup_type == 'resolved':
        query = 'DELETE FROM error_logs WHERE resolved = 1 AND created_at < ?'
        query_params = [cutoff_str]
    elif cleanup_type == 'all':
        query = 'DELETE FROM error_logs WHERE created_at < ?'
        query_params = [cutoff_str]
    else:
        flash('Invalid cleanup type.', 'danger')
        return redirect(url_for('errors.error_logs'))
    
    # Execute the query
    result = db.execute(query, query_params)
    db.commit()
    
    # Get number of affected rows
    affected_rows = result.rowcount
    
    flash(f'Cleaned up {affected_rows} error logs.', 'success')
    return redirect(url_for('errors.error_logs'))

@bp.route('/api/sync', methods=['POST'])
def api_sync_errors():
    """API endpoint to sync error logs from client."""
    if not request.is_json:
        return jsonify({'success': False, 'message': 'Missing JSON in request'}), 400
    
    data = request.get_json()
    errors = data.get('errors', [])
    
    if not errors:
        return jsonify({'success': True, 'syncedCount': 0, 'message': 'No errors to sync'}), 200
    
    db = current_app.extensions['get_db']()
    synced_ids = []
    
    for error in errors:
        # Extract error data
        error_type = error.get('errorType', 'unknown')
        error_message = error.get('message', 'No message provided')
        timestamp = error.get('timestamp')
        
        # Convert error details to JSON string
        error_details = {
            'deviceInfo': error.get('deviceInfo'),
            'url': error.get('url'),
            'timestamp': timestamp
        }
        
        # Add any extra data provided
        for key, value in error.items():
            if key not in ['errorType', 'message', 'deviceInfo', 'url', 'timestamp', 'id']:
                error_details[key] = value
        
        # Extract device info
        device_info = json.dumps(error.get('deviceInfo')) if error.get('deviceInfo') else None
        
        # Insert the error into the database
        cursor = db.execute(
            'INSERT INTO error_logs (error_type, error_message, error_details, device_info, created_at) VALUES (?, ?, ?, ?, ?)',
            (
                error_type, 
                error_message, 
                json.dumps(error_details), 
                device_info, 
                timestamp or datetime.now().isoformat()
            )
        )
        
        # Add the client-side ID to the list of synced IDs
        if 'id' in error:
            synced_ids.append(error['id'])
    
    db.commit()
    
    return jsonify({
        'success': True, 
        'syncedCount': len(errors),
        'syncedIds': synced_ids,
        'message': f'Successfully synced {len(errors)} error logs'
    })

def init_app(app):
    """Initialize the error handling for the app."""
    # Store get_db function in app extensions for access in the blueprint
    app.extensions['get_db'] = app.teardown_appcontext_funcs[0].__self__
    
    @app.errorhandler(Exception)
    def handle_exception(e):
        """Log all exceptions to the error_logs table."""
        # Get the traceback
        tb = traceback.format_exc()
        
        # If it's an HTTP exception, get the status code
        if isinstance(e, HTTPException):
            error_type = f"HTTP {e.code}"
            error_message = e.description
        else:
            error_type = e.__class__.__name__
            error_message = str(e)
        
        # Log the error
        log_error(error_type, error_message, {
            'traceback': tb,
            'endpoint': request.endpoint,
            'url': request.url,
            'method': request.method,
            'user_id': g.user['id'] if g.user else None
        })
        
        # Pass through HTTP exceptions
        if isinstance(e, HTTPException):
            return e
        
        # For non-HTTP exceptions, return a generic 500 error page
        return render_template('error.html', error=e, traceback=tb), 500