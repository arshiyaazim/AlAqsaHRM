"""
Error Handling Routes for Field Attendance Tracker
"""

import json
import sqlite3
import traceback
from datetime import datetime, timedelta
from flask import (
    Blueprint, g, render_template, request, redirect, url_for, flash, jsonify,
    current_app, send_file
)
import pandas as pd
import os
from io import BytesIO
from werkzeug.exceptions import HTTPException
from app_auth_routes import login_required, role_required

bp = Blueprint('errors', __name__, url_prefix='/errors')

def log_error(error_type, error_message, error_details=None):
    """Log error to database and file"""
    try:
        # Create error logs directory if it doesn't exist
        if not os.path.exists('logs'):
            os.makedirs('logs')
            
        # Get current timestamp
        current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        # Get device info from request if available
        device_info = None
        if request:
            device_info = json.dumps({
                'user_agent': request.user_agent.string,
                'remote_addr': request.remote_addr,
                'method': request.method,
                'path': request.path,
                'referrer': request.referrer
            })
            
        # Log to database
        db = sqlite3.connect('instance/attendance.db')
        cursor = db.cursor()
        
        # Check if error_logs table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='error_logs'")
        if cursor.fetchone():
            cursor.execute(
                'INSERT INTO error_logs (error_type, error_message, error_details, device_info, created_at) '
                'VALUES (?, ?, ?, ?, ?)',
                (error_type, error_message, error_details, device_info, current_time)
            )
            db.commit()
            error_id = cursor.lastrowid
        else:
            error_id = None
            
        db.close()
        
        # Log to file
        with open('logs/error.log', 'a') as f:
            f.write(f"[{current_time}] {error_type}: {error_message}\n")
            if error_details:
                f.write(f"Details: {error_details}\n")
            f.write("-" * 80 + "\n")
            
        return error_id
    except Exception as e:
        # If logging fails, write to stderr
        print(f"Error while logging error: {str(e)}")
        return None

@bp.route('/')
@login_required
@role_required(['admin', 'hr'])
def error_logs():
    """View error logs with filtering and pagination."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    error_type = request.args.get('error_type')
    resolved = request.args.get('resolved')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        db = sqlite3.connect('instance/attendance.db')
        db.row_factory = sqlite3.Row
        cursor = db.cursor()
        
        # Build query with filters
        query = 'SELECT * FROM error_logs WHERE 1=1'
        params = []
        
        if error_type:
            query += ' AND error_type = ?'
            params.append(error_type)
            
        if resolved is not None:
            if resolved == '1':
                query += ' AND resolved = 1'
            elif resolved == '0':
                query += ' AND resolved = 0'
                
        if start_date:
            query += ' AND created_at >= ?'
            params.append(start_date)
            
        if end_date:
            query += ' AND created_at <= ?'
            # Add one day to include the end date
            end_date_obj = datetime.strptime(end_date, '%Y-%m-%d')
            end_date_next = (end_date_obj + timedelta(days=1)).strftime('%Y-%m-%d')
            params.append(end_date_next)
            
        # Count total records for pagination
        count_query = query.replace('SELECT *', 'SELECT COUNT(*)')
        cursor.execute(count_query, params)
        total_count = cursor.fetchone()[0]
        
        # Add ordering and pagination
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
        offset = (page - 1) * per_page
        params.extend([per_page, offset])
        
        # Execute query
        cursor.execute(query, params)
        error_logs = cursor.fetchall()
        
        # Get distinct error types for filter dropdown
        cursor.execute('SELECT DISTINCT error_type FROM error_logs')
        error_types = [row[0] for row in cursor.fetchall()]
        
        # Calculate pagination info
        total_pages = (total_count + per_page - 1) // per_page
        
        db.close()
        
        return render_template(
            'admin_error_logs.html',
            error_logs=error_logs,
            error_types=error_types,
            page=page,
            per_page=per_page,
            total_pages=total_pages,
            total_count=total_count,
            error_type=error_type,
            resolved=resolved,
            start_date=start_date,
            end_date=end_date
        )
    except Exception as e:
        log_error('Database', 'Error retrieving error logs', str(e))
        flash('An error occurred while retrieving error logs.', 'danger')
        return render_template('admin_error_logs.html', error_logs=[])

@bp.route('/resolve/<int:error_id>', methods=['POST'])
@login_required
@role_required(['admin', 'hr'])
def resolve_error(error_id):
    """Mark an error as resolved."""
    resolution_notes = request.form.get('resolution_notes', '')
    
    try:
        db = sqlite3.connect('instance/attendance.db')
        cursor = db.cursor()
        
        # Update error log
        current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        cursor.execute(
            'UPDATE error_logs SET resolved = 1, resolution_notes = ?, resolved_by = ?, resolved_at = ? WHERE id = ?',
            (resolution_notes, g.user['id'], current_time, error_id)
        )
        
        # Log action
        cursor.execute(
            'INSERT INTO activity_logs (user_id, action, details, created_at) VALUES (?, ?, ?, ?)',
            (g.user['id'], 'resolve_error', f"Error #{error_id} resolved by {g.user['username']}", current_time)
        )
        
        db.commit()
        db.close()
        
        flash('Error marked as resolved.', 'success')
    except Exception as e:
        log_error('Database', 'Error resolving error log', str(e))
        flash('An error occurred while resolving the error.', 'danger')
        
    return redirect("/errors/logs")

@bp.route('/export', methods=['GET'])
@login_required
@role_required(['admin', 'hr'])
def export_error_logs():
    """Export error logs to Excel or CSV."""
    format_type = request.args.get('format', 'excel')
    error_type = request.args.get('error_type')
    resolved = request.args.get('resolved')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        db = sqlite3.connect('instance/attendance.db')
        db.row_factory = sqlite3.Row
        cursor = db.cursor()
        
        # Build query with filters
        query = '''
            SELECT 
                el.id, el.error_type, el.error_message, el.error_details, 
                el.device_info, el.resolved, el.resolution_notes, 
                el.created_at, el.resolved_at,
                u.username as resolved_by_username
            FROM error_logs el
            LEFT JOIN users u ON el.resolved_by = u.id
            WHERE 1=1
        '''
        params = []
        
        if error_type:
            query += ' AND el.error_type = ?'
            params.append(error_type)
            
        if resolved is not None:
            if resolved == '1':
                query += ' AND el.resolved = 1'
            elif resolved == '0':
                query += ' AND el.resolved = 0'
                
        if start_date:
            query += ' AND el.created_at >= ?'
            params.append(start_date)
            
        if end_date:
            query += ' AND el.created_at <= ?'
            end_date_obj = datetime.strptime(end_date, '%Y-%m-%d')
            end_date_next = (end_date_obj + timedelta(days=1)).strftime('%Y-%m-%d')
            params.append(end_date_next)
            
        # Add ordering
        query += ' ORDER BY el.created_at DESC'
        
        # Execute query
        cursor.execute(query, params)
        error_logs = cursor.fetchall()
        
        # Convert to DataFrame
        data = []
        for row in error_logs:
            # Parse device_info if available
            device_info = json.loads(row['device_info']) if row['device_info'] else {}
            
            data.append({
                'ID': row['id'],
                'Error Type': row['error_type'],
                'Error Message': row['error_message'],
                'Error Details': row['error_details'],
                'User Agent': device_info.get('user_agent', ''),
                'IP Address': device_info.get('remote_addr', ''),
                'Request Method': device_info.get('method', ''),
                'Request Path': device_info.get('path', ''),
                'Referrer': device_info.get('referrer', ''),
                'Resolved': 'Yes' if row['resolved'] else 'No',
                'Resolution Notes': row['resolution_notes'] or '',
                'Resolved By': row['resolved_by_username'] or '',
                'Created At': row['created_at'],
                'Resolved At': row['resolved_at'] or ''
            })
            
        df = pd.DataFrame(data)
        
        # Create filename with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # Export based on format
        if format_type == 'csv':
            output = BytesIO()
            df.to_csv(output, index=False)
            output.seek(0)
            
            return send_file(
                output,
                mimetype='text/csv',
                download_name=f'error_logs_{timestamp}.csv',
                as_attachment=True
            )
        else:  # Excel
            output = BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df.to_excel(writer, index=False, sheet_name='Error Logs')
                
                # Auto-adjust column widths
                worksheet = writer.sheets['Error Logs']
                for i, col in enumerate(df.columns):
                    max_width = max(df[col].astype(str).map(len).max(), len(col)) + 2
                    # Convert characters to approximate Excel column width
                    excel_width = min(max_width * 1.2, 50)  # Cap at 50
                    worksheet.column_dimensions[chr(65 + i)].width = excel_width
            
            output.seek(0)
            
            return send_file(
                output,
                mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                download_name=f'error_logs_{timestamp}.xlsx',
                as_attachment=True
            )
            
    except Exception as e:
        log_error('Export', 'Error exporting error logs', str(e))
        flash('An error occurred while exporting error logs.', 'danger')
        return redirect("/errors/logs")

@bp.route('/cleanup', methods=['POST'])
@login_required
@role_required('admin')
def cleanup_error_logs():
    """Clean up old error logs."""
    cleanup_type = request.form.get('cleanup_type', 'resolved')
    days = int(request.form.get('days', 30))
    
    try:
        db = sqlite3.connect('instance/attendance.db')
        cursor = db.cursor()
        
        # Calculate cutoff date
        cutoff_date = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
        
        # Build query based on cleanup type
        if cleanup_type == 'resolved':
            query = 'DELETE FROM error_logs WHERE resolved = 1 AND resolved_at < ?'
        elif cleanup_type == 'all':
            query = 'DELETE FROM error_logs WHERE created_at < ?'
        else:
            flash('Invalid cleanup type.', 'danger')
            return redirect("/errors/logs")
            
        # Execute cleanup
        cursor.execute(query, (cutoff_date,))
        count = cursor.rowcount
        
        # Log action
        current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        cursor.execute(
            'INSERT INTO activity_logs (user_id, action, details, created_at) VALUES (?, ?, ?, ?)',
            (g.user['id'], 'cleanup_errors', f"Cleaned up {count} {cleanup_type} error logs older than {days} days", current_time)
        )
        
        db.commit()
        db.close()
        
        flash(f'Successfully cleaned up {count} error logs.', 'success')
    except Exception as e:
        log_error('Database', 'Error cleaning up error logs', str(e))
        flash('An error occurred while cleaning up error logs.', 'danger')
        
    return redirect("/errors/logs")

@bp.route('/api/sync-errors', methods=['POST'])
@login_required
def api_sync_errors():
    """API endpoint to sync error logs from client."""
    try:
        data = request.get_json()
        
        if not data or 'errors' not in data:
            return jsonify({'status': 'error', 'message': 'Invalid request format'}), 400
            
        errors = data['errors']
        if not isinstance(errors, list):
            return jsonify({'status': 'error', 'message': 'Errors must be a list'}), 400
            
        db = sqlite3.connect('instance/attendance.db')
        cursor = db.cursor()
        
        # Process each error
        processed_count = 0
        error_ids = []
        
        for error in errors:
            # Validate required fields
            if not all(key in error for key in ['error_type', 'error_message']):
                continue
                
            # Add timestamp if not provided
            if 'timestamp' not in error:
                error['timestamp'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                
            # Extract fields
            error_type = error['error_type']
            error_message = error['error_message']
            error_details = error.get('error_details')
            device_info = error.get('device_info')
            if isinstance(device_info, dict):
                device_info = json.dumps(device_info)
                
            # Insert into database
            cursor.execute(
                'INSERT INTO error_logs (error_type, error_message, error_details, device_info, created_at) '
                'VALUES (?, ?, ?, ?, ?)',
                (error_type, error_message, error_details, device_info, error['timestamp'])
            )
            
            error_ids.append(cursor.lastrowid)
            processed_count += 1
            
        # Commit all changes
        db.commit()
        db.close()
        
        return jsonify({
            'status': 'success',
            'message': f'Successfully synced {processed_count} errors',
            'error_ids': error_ids
        }), 200
            
    except Exception as e:
        log_error('API', 'Error syncing client errors', str(e))
        return jsonify({'status': 'error', 'message': str(e)}), 500

def init_app(app):
    """Initialize the error handling for the app."""
    app.register_blueprint(bp)
    
    @app.errorhandler(Exception)
    def handle_exception(e):
        """Log all exceptions to the error_logs table."""
        # Pass through HTTP errors
        if isinstance(e, HTTPException):
            # Log HTTP errors with status code >= 500
            if e.code >= 500:
                log_error('HTTP', f"HTTP {e.code}: {e.name}", traceback.format_exc())
            return e
            
        # Log all other exceptions
        error_id = log_error('Exception', str(e), traceback.format_exc())
        
        # In development, show detailed error
        if app.debug:
            return {
                'status': 'error',
                'message': str(e),
                'traceback': traceback.format_exc(),
                'error_id': error_id
            }, 500
        
        # In production, show generic error
        return render_template('error.html', error=str(e), error_id=error_id), 500