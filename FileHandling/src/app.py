import json
import os
import win32com.client
import time
import csv
import io
import uuid
from PIL import ImageGrab
from flask import Flask, request, jsonify, send_from_directory, session
from flask_cors import CORS
import pythoncom
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from agents.DocumentGeneration import DocumentGenerator
from utils.ExcelFileHandler import ExcelFileHandler
from utils.WorkSession import WorkSession
app = Flask(__name__)
CORS(app, supports_credentials=True)
app.secret_key = os.urandom(24)  # Secret key for session management

@app.after_request
def add_csp_header(response):
    response.headers['Content-Security-Policy'] = "default-src 'self' 'unsafe-inline' data:; connect-src 'self' http://localhost:5000"
    return response

# Configuration for file uploads and outputs
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SESSIONS_FOLDER_BASE = os.path.join(ROOT_DIR, 'sessions')
UPLOAD_FOLDER = os.path.join(ROOT_DIR, 'uploads')
OUTPUT_FOLDER_BASE = os.path.join(ROOT_DIR, 'output')
GENERATED_DOCUMENTS_FOLDER = os.path.join(os.path.dirname(ROOT_DIR), 'DGUI/generated_documents')

ALLOWED_EXTENSIONS = {'xlsx', 'xls'}

# Ensure upload and output directories exist
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
if not os.path.exists(OUTPUT_FOLDER_BASE):
    os.makedirs(OUTPUT_FOLDER_BASE)
if not os.path.exists(GENERATED_DOCUMENTS_FOLDER):
    os.makedirs(GENERATED_DOCUMENTS_FOLDER)
if not os.path.exists(SESSIONS_FOLDER_BASE): # Ensure sessions folder exists as well
    os.makedirs(SESSIONS_FOLDER_BASE)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['OUTPUT_FOLDER_BASE'] = OUTPUT_FOLDER_BASE
app.config['GENERATED_DOCUMENTS_FOLDER'] = GENERATED_DOCUMENTS_FOLDER

# Create ExcelFileHandler instance
excel_file_handler = ExcelFileHandler()

# Config DocumentGenerator API key
load_dotenv()
api_key = os.getenv('GEMINI_API_KEY')
if not api_key:
    raise ValueError("GOOGLE_API_KEY not found in environment variables. Please set it in .env file.")
generator = DocumentGenerator(api_key=api_key)

# Create list of working session
sessions = []
current_session = None

# Helper function to check allowed file extensions
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/list-prev-sessions', methods=['GET'])
def list_prev_sessions():
    """List all previous work sessions from session.json file in root."""
    sessions_file = os.path.join(ROOT_DIR, 'sessions/sessions.json')
    if not os.path.exists(sessions_file):
        return jsonify({"sessions": []})

    with open(sessions_file, 'r') as f:
        sessions = json.load(f)
    return jsonify({"sessions": sessions})

# @app.route('/start-session', methods=['POST'])
# def start_session():
#     """Start a new work session and return the session ID.
#         sample request json: {"session_name": "session_name"}
#     """
#     session_id = str(uuid.uuid4())
#     session_name = request.json.get('session_name', 'Untitled')
#     session = WorkSession(session_id, ROOT_DIR)
#     session.set_session_name(session_name)
#     sessions.append(session)
#     current_session = session
#     return jsonify({"session_id": session_id, "session_name": session_name})
@app.route('/start-session', methods=['POST'])
def start_session():
    """Start a new work session and return the session ID."""
    session_id = str(uuid.uuid4())
    session_name = request.json.get('session_name', 'Untitled')
    work_session = WorkSession.create_new_session(name=session_name, session_dir=SESSIONS_FOLDER_BASE)
    session['work_session_id'] = work_session.get_session_id() # Store session ID in Flask's built-in session
    session['work_session_data'] = work_session.to_dict() # Store session data in Flask's built-in session
    return jsonify({"session_id": work_session.get_session_id(), "session_name": work_session.get_session_name()})

@app.route('/switch-session/<session_name>', methods=['POST'])
def switch_session(session_id):
    """Switch to a different work session.
        sample request json: {"session_id": "session_id"}
    """
    global current_session
    for session in sessions:
        if session.get_session_id() == session_id:
            current_session = session
            return jsonify({"status": "success", "session_id": session_id})
    return jsonify({"error": "Session not found"}), 404

# @app.route('/end-session', methods=['POST'])
# def end_session():
#     """End the current work session."""
#     global current_session
#     print(f"Inside /end-session: current_session = {current_session}") # ADD THIS LINE
#     if current_session is None:
#         return jsonify({"error": "No active session"}), 400
#     current_session.end_session()
#     return jsonify({"status": "success"})
@app.route('/end-session', methods=['POST'])
def end_session():
    """End the current work session."""
    session_data = session.get('work_session_data') # Retrieve from Flask's built-in session
    if session_data is None:
        return jsonify({"error": "No active session"}), 400

    work_session = WorkSession.from_dict(session_data)
    work_session.end_session()

    session.pop('work_session_id', None) # Clear from Flask's built-in session
    session.pop('work_session_data', None) # Clear from Flask's built-in session
    return jsonify({"status": "success"})

@app.route('/end-all-sessions', methods=['POST'])
def end_all_sessions():
    """End all active work sessions."""
    for session in sessions:
        session.end_session()
    return jsonify({"status": "success"})


@app.route('/health', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    return jsonify({"status": "ok"})

@app.route('/upload-excel', methods=['POST'])
def upload_excel():
    """Upload an Excel file to the server."""
    """
    Upload an Excel file. Generates and returns a UUID for session management.
    """
    if current_session is None:
        return jsonify({"error": "No active session. Please start a session first."}), 400
    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    if file and allowed_file(file.filename):
        session_uuid = current_session.get_session_id()
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
    if current_session is None:
        return jsonify({"error": "No active session. Please start a session first."}), 400
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
    pass

@app.route('/get-sheets/<file_id>', methods=['GET'])
def get_sheets(file_id):
    if current_session is None:
        return jsonify({"error": "No active session. Please start a session first."}), 400
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
    if current_session is None:
        return jsonify({"error": "No active session. Please start a session first."}), 400
    
@app.route('/api/class-diagram', methods=['POST']) # Changed route name to /api/class-diagram and using POST
def get_class_diagram():
    """API endpoint to generate class diagram data from Gemini."""
    if current_session is None:
        return jsonify({"error": "No active session. Please start a session first."}), 400

    try:
        data_dir = os.path.join(app.config['OUTPUT_FOLDER_BASE'], current_session.get_session_id()) # Use session output folder
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
