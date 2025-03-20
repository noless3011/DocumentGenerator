import json
import os
import win32com.client
import time
import csv
import io
import uuid
from PIL import ImageGrab
from flask import Flask, request, jsonify, send_from_directory, session # IMPORTANT: Import 'session'
from flask_cors import CORS
import pythoncom
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from agents.DocumentGeneration import DocumentGenerator
from utils.ExcelFileHandler import ExcelFileHandler
from utils.WorkSession import WorkSession # Import the updated WorkSession class
from flask_session import Session # Import Flask-Session

app = Flask(__name__)
CORS(app, supports_credentials=True)
app.secret_key = os.urandom(24)  # Secret key for session management

# Configure Flask-Session
app.config["SESSION_PERMANENT"] = False  # Sessions are not permanent, they expire when browser closes by default
app.config["SESSION_TYPE"] = "filesystem"
app.config["SESSION_COOKIE_PATH"] = "/" 
app.config["SESSION_COOKIE_SAMESITE"] = 'Lax'  
app.config["SESSION_COOKIE_DOMAIN"] = None    
Session(app) # Initialize Flask-Session

@app.after_request
def add_csp_header(response):
    response.headers['Content-Security-Policy'] = "default-src 'self' 'unsafe-inline' data:; connect-src 'self' http://localhost:5000"
    return response

# Configuration for file uploads and outputs
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_FOLDER = os.path.join(ROOT_DIR, 'uploads')
OUTPUT_FOLDER_BASE = os.path.join(ROOT_DIR, 'output')
GENERATED_DOCUMENTS_FOLDER = os.path.join(os.path.dirname(ROOT_DIR), 'DGUI/generated_documents')
SESSIONS_FOLDER_BASE = os.path.join(ROOT_DIR, 'sessions') # Define base sessions folder

ALLOWED_EXTENSIONS = {'xlsx', 'xls'}

# Ensure upload and output directories exist
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
if not os.path.exists(OUTPUT_FOLDER_BASE):
    os.makedirs(OUTPUT_FOLDER_BASE)
if not os.path.exists(GENERATED_DOCUMENTS_FOLDER):
    os.makedirs(GENERATED_DOCUMENTS_FOLDER)
if not os.path.exists(SESSIONS_FOLDER_BASE):
    os.makedirs(SESSIONS_FOLDER_BASE)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['OUTPUT_FOLDER_BASE'] = OUTPUT_FOLDER_BASE
app.config['GENERATED_DOCUMENTS_FOLDER'] = GENERATED_DOCUMENTS_FOLDER
app.config['SESSIONS_FOLDER_BASE'] = SESSIONS_FOLDER_BASE # Make sessions folder base available in app config

# Create ExcelFileHandler instance
excel_file_handler = ExcelFileHandler()

# Config DocumentGenerator API key
load_dotenv()
api_key = os.getenv('GEMINI_API_KEY')
if not api_key:
    raise ValueError("GOOGLE_API_KEY not found in environment variables. Please set it in .env file.")
generator = DocumentGenerator(api_key=api_key)

# Helper function to check allowed file extensions
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/list-prev-sessions', methods=['GET'])
def list_prev_sessions():
    """List all previous work sessions from session.json file in root."""
    sessions_file = os.path.join(SESSIONS_FOLDER_BASE, 'sessions.json') # Use SESSIONS_FOLDER_BASE
    if not os.path.exists(sessions_file):
        return jsonify({"sessions": []})

    with open(sessions_file, 'r') as f:
        sessions = json.load(f)
    return jsonify({"sessions": sessions})

@app.route('/start-session', methods=['POST'])
def start_session():
    session_id = str(uuid.uuid4())
    session['test_session_value'] = "This is a test value" # Store a simple string
    print(f"START SESSION - Stored test_session_value: {session['test_session_value']}")
    return jsonify({"session_id": session_id, "message": "Test session started"})

# @app.route('/start-session', methods=['POST'])
# def start_session():
#     """Start a new work session and return the session ID."""
#     session_name = request.json.get('session_name', 'Untitled')
#     work_session = WorkSession.create_new_session(name=session_name, session_dir=SESSIONS_FOLDER_BASE)
#     session['work_session_id'] = work_session.get_session_id()
#     session_data_to_store = work_session.to_dict()
#     session['work_session_data'] = session_data_to_store
#     print(f"START SESSION - Session ID: {session['work_session_id']}")
#     print(f"START SESSION - Storing session data in Flask session: {session_data_to_store}")
#     print(f"START SESSION - Flask session object after storing: {session}") # Log the whole session object
#     return jsonify({"session_id": work_session.get_session_id(), "session_name": work_session.get_session_name()})

@app.route('/switch-session/<session_name>', methods=['POST']) # You might not need switch_session in this approach, but keeping it if you have a use case
def switch_session(session_id):
    """Switch to a different work session. (If you need to load previous sessions)"""
    # In this example, switch_session is not fully implemented to load previous sessions.
    # You would need to retrieve session data based on session_id from your session storage (filesystem, db, etc.)
    # For now, it just returns an error as we are focusing on fixing current session issue.
    return jsonify({"error": "Switch session not implemented in this example"}), 501


# @app.route('/end-session', methods=['POST'])
# def end_session():
#     """End the current work session."""
#     print(f"END SESSION - Flask session object BEFORE retrieval: {session}") # Log session object before retrieval
#     session_data = session.get('work_session_data')
#     print(f"END SESSION - Retrieved session data from Flask session: {session_data}")
#     if session_data is None:
#         print("END SESSION - session_data is None, returning 400 error.")
#         return jsonify({"error": "No active session"}), 400

#     work_session = WorkSession.from_dict(session_data)
#     work_session.end_session()

#     session.pop('work_session_id', None)
#     session.pop('work_session_data', None)
#     print("END SESSION - Session data popped from Flask session.")
#     print(f"END SESSION - Flask session object AFTER popping: {session}") # Log session object after popping
#     return jsonify({"status": "success"})

@app.route('/end-session', methods=['POST'])
def end_session():
    test_value = session.get('test_session_value')
    print(f"END SESSION - Retrieved test_session_value: {test_value}") # Log the retrieved value
    if test_value is None:
        print("END SESSION - test_session_value is None, returning 400 error.")
        return jsonify({"error": "No test session value found"}), 400
    session.pop('test_session_value', None)
    print("END SESSION - test_session_value popped from session.")
    return jsonify({"status": "success", "message": "Test session ended"})

@app.route('/end-all-sessions', methods=['POST'])
def end_all_sessions():
    """End all active work sessions."""
    # In a filesystem-based session, "ending all" might not be directly applicable
    # as each session is typically isolated. You might need to implement a different cleanup strategy
    # if you need to manage "all" sessions.
    session.pop('work_session_id', None) # Clear session ID
    session.pop('work_session_data', None) # Clear session data
    return jsonify({"status": "success"})


@app.route('/health', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    return jsonify({"status": "ok"})

@app.route('/upload-excel', methods=['POST'])
def upload_excel():
    """Upload an Excel file to the server."""
    session_data = session.get('work_session_data') # Get session data from Flask session
    if session_data is None:
        return jsonify({"error": "No active session. Please start a session first."}), 400
    work_session = WorkSession.from_dict(session_data) # Recreate WorkSession object

    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    if file and allowed_file(file.filename):
        session_uuid = work_session.get_session_id() # Get session ID from work_session
        session_folder = os.path.join(app.config['UPLOAD_FOLDER'], session_uuid)
        os.makedirs(session_folder, exist_ok=True)
        original_filename = secure_filename(file.filename)
        file_path = os.path.join(session_folder, original_filename)
        file.save(file_path)

        return jsonify({
            "status": "success",
            "message": "File uploaded successfully",
            "file_id": session_uuid, # Return UUID as file_id (session ID)
            "original_filename": original_filename,
            "file_path": file_path
        })
    else:
        return jsonify({"error": f"Invalid file type. Allowed types are: {', '.join(ALLOWED_EXTENSIONS)}"}), 400

@app.route('/process-excel', methods=['POST'])
def api_process_excel():
    """Process Excel file sheets and save as CSV or images."""
    session_data = session.get('work_session_data') # Get session data
    if session_data is None:
        return jsonify({"error": "No active session. Please start a session first."}), 400
    work_session = WorkSession.from_dict(session_data) # Recreate WorkSession

    try:
        data = request.json
        if not all(key in data for key in ['file_id', 'sheets']):
            return jsonify({"error": "Missing required fields. Required: file_id, sheets"}), 400

        file_id = data['file_id'] # file_id is now the UUID folder
        session_folder = os.path.join(app.config['UPLOAD_FOLDER'], file_id)

        # Find the uploaded Excel file in the session folder
        excel_files = [f for f in os.listdir(session_folder) if allowed_file(f)]
        if not excel_files:
            return jsonify({"error": f"No valid Excel file found in session folder: {file_id}"}), 404
        excel_filename = excel_files[0] # Assume only one excel file per session for simplicity
        excel_file_path = os.path.join(session_folder, excel_filename)

        output_folder = os.path.join(app.config['OUTPUT_FOLDER_BASE'], file_id) # Output folder is UUID named

        if os.path.exists(output_folder):
            for file in os.listdir(output_folder):
                file_path = os.path.join(output_folder, file)
                try:
                    if os.path.isfile(file_path) or os.path.islink(file_path):
                        os.unlink(file_path)
                except Exception as e:
                    print(f"Error deleting file {file_path}: {e}")
        else:
            os.makedirs(output_folder)


        result = excel_file_handler.process_sheets(
            excel_file_path,
            output_folder,
            data['sheets']
        )
        result["output_folder"] = output_folder # Return UUID named output folder path
        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/get-sheets/<file_id>', methods=['GET'])
def get_sheets(file_id):
    session_data = session.get('work_session_data') # Get session data
    if session_data is None:
        return jsonify({"error": "No active session. Please start a session first."}), 400
    work_session = WorkSession.from_dict(session_data) # Recreate WorkSession

    session_folder = os.path.join(app.config['UPLOAD_FOLDER'], file_id)
    excel_files = [f for f in os.listdir(session_folder) if allowed_file(f)]
    if not excel_files:
        return jsonify({"error": f"No valid Excel file found in session folder: {file_id}"}), 404
    excel_filename = excel_files[0]
    excel_file_path = os.path.join(session_folder, excel_filename)


    if not os.path.exists(excel_file_path):
        return jsonify({"error": f"File not found in session: {file_id}"}), 404

    sheet_names = excel_file_handler.get_sheet_names(excel_file_path)

    if isinstance(sheet_names, dict) and "error" in sheet_names:
        return jsonify(sheet_names), 500

    return jsonify({
        "status": "success",
        "file_id": file_id, # Return UUID as file_id
        "sheets": sheet_names
    })


@app.route('/generate-documents', methods=['POST'])
def generate_documents():
    session_data = session.get('work_session_data') # Get session data
    if session_data is None:
        return jsonify({"error": "No active session. Please start a session first."}), 400
    work_session = WorkSession.from_dict(session_data) # Recreate WorkSession
    generator = DocumentGenerator(api_key=api_key) # Initialize generator here, as api_key is needed

    try:
        default_data_dir = os.path.join(app.config['OUTPUT_FOLDER_BASE'], work_session.get_session_id()) # Use session output dir
        default_output_dir = app.config['GENERATED_DOCUMENTS_FOLDER'] # Use configured generated documents folder

        data = request.json or {}
        data_dir = data.get('data_dir', default_data_dir)
        output_dir = data.get('output_dir', default_output_dir)

        generated_files = generator.generate(data_dir, output_dir)

        return jsonify({
            "status": "success",
            "message": "Documents generated successfully",
            "generated_files": generated_files,
            "output_dir": output_dir,
            "count": len(generated_files)
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/class-diagram', methods=['POST']) # Changed route name to /api/class-diagram and using POST
def get_class_diagram():
    """API endpoint to generate class diagram data from Gemini."""
    session_data = session.get('work_session_data') # Get session data
    if session_data is None:
        return jsonify({"error": "No active session. Please start a session first."}), 400
    work_session = WorkSession.from_dict(session_data) # Recreate WorkSession

    try:
        data_dir = os.path.join(app.config['OUTPUT_FOLDER_BASE'], work_session.get_session_id()) # Use session output folder
        files = generator.scan_data_directory(data_dir)
        csv_data = generator.read_csv_data(files["csvs"])

        if not csv_data: # Check if csv_data is empty
            return jsonify({"error": "No CSV data found to generate class diagram."}), 400

        diagram_data = generator.generate_class_diagram(csv_data) # Call the updated generate_class_diagram

        return jsonify(diagram_data), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)