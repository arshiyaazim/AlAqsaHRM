"""
Error Handling Routes for Field Attendance Tracker
"""

import json
import functools
from datetime import datetime, timedelta
import xlsxwriter
from io import BytesIO
from flask import (
    Blueprint, flash, g, redirect, render_template, request, session, url_for, jsonify,
    send_file, abort, current_app
)
from werkzeug.exceptions import HTTPException
from .db import get_db
from .auth import login_required, role_required

bp = Blueprint('errors', __name__, url_prefix='/errors')

# Error log management routes
@bp.route('/logs')
@login_required
@role_required(['admin', 'hr'])
def error_logs():
    """View error logs with filtering and pagination."""
    db = get_db()
    
    # Get query parameters for filtering
    error_type = request.args.get('error_type')
    resolved = request.args.get('resolved')
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    page = int(request.args.get('page', 1))
    per_page = 20  # Number of logs per page
    
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
    
    # Parse JSON in error_details field
    parsed_logs = []
    for log in error_logs:
        log_dict = dict(log)
        if log_dict['error_details']:
            try:
                log_dict['error_details'] = json.dumps(json.loads(log_dict['error_details']), indent=2)
            except json.JSONDecodeError:
                # If not valid JSON, keep as is
                pass
        parsed_logs.append(log_dict)
    
    return render_template(
        'admin_error_logs.html', 
        error_logs=parsed_logs, 
        page=page, 
        total_pages=total_pages
    )

@bp.route('/logs/resolve/<int:error_id>', methods=['POST', 'GET'])
@login_required
@role_required(['admin', 'hr'])
def resolve_error(error_id):
    """Mark an error as resolved."""
    db = get_db()
    
    # Check if the error exists
    error = db.execute('SELECT * FROM error_logs WHERE id = ?', (error_id,)).fetchone()
    if not error:
        flash('Error not found.', 'danger')
        return redirect(url_for('errors.error_logs'))
    
    # Get resolution notes if provided
    resolution_notes = request.form.get('resolution_notes', '')
    
    # Update the error
    db.execute(
        'UPDATE error_logs SET resolved = 1, resolution_notes = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?',
        (resolution_notes, error_id)
    )
    db.commit()
    
    flash('Error marked as resolved.', 'success')
    
    # Redirect back to the previous page or error logs page
    next_page = request.args.get('next') or url_for('errors.error_logs')
    return redirect(next_page)

@bp.route('/logs/export')
@login_required
@role_required(['admin', 'hr'])
def export_error_logs():
    """Export error logs to Excel or CSV."""
    format_type = request.args.get('format', 'excel')
    
    # Get query parameters for filtering
    error_type = request.args.get('error_type')
    resolved = request.args.get('resolved')
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    
    db = get_db()
    
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
    
    if format_type == 'excel':
        # Create Excel file in memory
        output = BytesIO()
        workbook = xlsxwriter.Workbook(output)
        worksheet = workbook.add_worksheet('Error Logs')
        
        # Add header row
        headers = ['ID', 'Error Type', 'Message', 'Details', 'User ID', 'Device Info', 
                  'Resolved', 'Resolution Notes', 'Resolved At', 'Created At']
        for col, header in enumerate(headers):
            worksheet.write(0, col, header)
        
        # Write data rows
        for row, log in enumerate(error_logs, start=1):
            worksheet.write(row, 0, log['id'])
            worksheet.write(row, 1, log['error_type'])
            worksheet.write(row, 2, log['error_message'])
            
            # Format error details as string if it's JSON
            details = log['error_details']
            if details:
                try:
                    details_json = json.loads(details)
                    details = json.dumps(details_json, indent=2)
                except json.JSONDecodeError:
                    pass
            worksheet.write(row, 3, details)
            
            worksheet.write(row, 4, log['user_id'])
            worksheet.write(row, 5, log['device_info'])
            worksheet.write(row, 6, 'Yes' if log['resolved'] else 'No')
            worksheet.write(row, 7, log['resolution_notes'])
            worksheet.write(row, 8, log['resolved_at'])
            worksheet.write(row, 9, log['created_at'])
        
        workbook.close()
        output.seek(0)
        
        # Generate filename with current date
        today = datetime.now().strftime('%Y-%m-%d')
        filename = f'error_logs_{today}.xlsx'
        
        return send_file(
            output, 
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=filename
        )
    
    else:  # CSV format
        # Implement CSV export here
        abort(501, "CSV export not implemented yet")

@bp.route('/logs/cleanup', methods=['POST'])
@login_required
@role_required('admin')
def cleanup_error_logs():
    """Clean up old error logs."""
    cleanup_type = request.form.get('cleanup_type', 'resolved')
    older_than = int(request.form.get('older_than', 30))
    
    db = get_db()
    
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
    
    flash(f'Cleaned up {result.rowcount} error logs.', 'success')
    return redirect(url_for('errors.error_logs'))

# API Endpoints for Error Logging
@bp.route('/api/sync', methods=['POST'])
def api_sync_errors():
    """API endpoint to sync error logs from client."""
    if not request.is_json:
        return jsonify({'success': False, 'message': 'Missing JSON in request'}), 400
    
    data = request.get_json()
    errors = data.get('errors', [])
    
    if not errors:
        return jsonify({'success': True, 'syncedCount': 0, 'message': 'No errors to sync'}), 200
    
    db = get_db()
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
        
        # Insert the error into the database
        cursor = db.execute(
            'INSERT INTO error_logs (error_type, error_message, error_details, device_info, created_at) VALUES (?, ?, ?, ?, ?)',
            (
                error_type, 
                error_message, 
                json.dumps(error_details), 
                json.dumps(error.get('deviceInfo')), 
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

# Global error handler
def init_app(app):
    """Initialize the error handling for the app."""
    
    @app.errorhandler(Exception)
    def handle_exception(e):
        """Log all exceptions to the error_logs table."""
        response = e.get_response() if isinstance(e, HTTPException) else None
        status_code = response.status_code if response else 500
        
        # Only log server errors (5xx)
        if status_code >= 500:
            error_type = 'server_error'
            error_message = str(e)
            
            error_details = {
                'url': request.url,
                'method': request.method,
                'status_code': status_code,
                'user_agent': request.user_agent.string if request.user_agent else None,
                'timestamp': datetime.now().isoformat()
            }
            
            if g.user:
                error_details['user_id'] = g.user['id']
                error_details['username'] = g.user['username']
            
            try:
                db = get_db()
                db.execute(
                    'INSERT INTO error_logs (error_type, error_message, error_details, user_id, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
                    (
                        error_type, 
                        error_message, 
                        json.dumps(error_details), 
                        g.user['id'] if g.user else None
                    )
                )
                db.commit()
            except Exception as log_error:
                current_app.logger.error(f"Failed to log error: {log_error}")
        
        # For API requests, return JSON error response
        if request.path.startswith('/api/'):
            response = {
                'success': False,
                'error': str(e),
                'status_code': status_code
            }
            return jsonify(response), status_code
        
        # For web requests, pass to the default handler
        return e