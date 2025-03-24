import json
import os
import win32com.client
import time
import csv
import io
import uuid
from PIL import ImageGrab
from flask import Flask, request, jsonify
from flask_cors import CORS
import pythoncom
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from agents.DocumentGeneration import DocumentGenerator
from utils.ExcelFileHandler import ExcelFileHandler
from utils.Project import Project
app = Flask(__name__)
CORS(app, supports_credentials=True)
app.secret_key = os.urandom(24)  # Secret key for session management

@app.after_request
def add_csp_header(response):
    response.headers['Content-Security-Policy'] = "default-src 'self' 'unsafe-inline' data:; connect-src 'self' http://localhost:5000"
    return response

# Configuration for file uploads and outputs
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


ALLOWED_EXTENSIONS = {'xlsx', 'xls'}



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

# Global variable to track the current project
current_project = None
PROJECTS_REGISTRY_FILE = os.path.join(ROOT_DIR, 'projects_registry.json')

def save_projects_registry(projects_list):
    """Save projects list to registry file"""
    with open(PROJECTS_REGISTRY_FILE, 'w') as f:
        json.dump(projects_list, f, indent=4)

def load_projects_registry():
    """Load projects list from registry file"""
    if not os.path.exists(PROJECTS_REGISTRY_FILE):
        return []
    try:
        with open(PROJECTS_REGISTRY_FILE, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error reading projects registry: {e}")
        return []

@app.route('/list-projects', methods=['GET'])
def list_projects():
    """List all existing projects."""
    projects = load_projects_registry()
    return jsonify({"projects": projects})

@app.route('/create-project', methods=['POST'])
def create_project():
    """Create a new project and return the project ID."""
    global current_project
    data = request.json
    project_name = data.get('project_name', 'Untitled Project')
    base_dir = data.get('base_dir')
    
    if not base_dir:
        return jsonify({"error": "base_dir is required"}), 400
    
    if not os.path.exists(base_dir):
        try:
            os.makedirs(base_dir)
        except Exception as e:
            return jsonify({"error": f"Could not create directory: {str(e)}"}), 400
    
    project = Project(name=project_name, base_dir=base_dir)
    project.create_directory_structure()
    project.save_metadata()
    
    # Store project in global variable for reference
    current_project = project
    
    # Update projects registry
    projects = load_projects_registry()
    projects.append({
        "id": project.id,
        "name": project.name,
        "base_dir": base_dir,
        "created_date": project.created_date.isoformat(),
        "modified_date": project.modified_date.isoformat()
    })
    save_projects_registry(projects)
    
    return jsonify({
        "project_id": project.id,
        "project_name": project.name,
        "project_dir": project.project_dir
    })

@app.route('/load-project/<project_id>', methods=['POST'])
def load_project(project_id):
    """Load an existing project by ID."""
    global current_project
    
    # Find the project in registry
    projects = load_projects_registry()
    project_info = next((p for p in projects if p["id"] == project_id), None)
    
    if not project_info:
        return jsonify({"error": "Project not found in registry"}), 404
    
    base_dir = project_info["base_dir"]
    for item in os.listdir(base_dir):
        if item.endswith(f"_{project_id}"):
            metadata_path = os.path.join(base_dir, item, "project_metadata.json")
            if os.path.exists(metadata_path):
                project = Project.load_from_metadata(metadata_path)
                if project:
                    current_project = project
                    return jsonify({
                        "status": "success",
                        "project_id": project.id,
                        "project_name": project.name,
                        "project_dir": project.project_dir
                    })
    
    # If we get here, the project was in registry but files weren't found
    return jsonify({"error": "Project files not found"}), 404

@app.route('/close-project', methods=['POST'])
def close_project():
    """Close the current project."""
    global current_project
    if not current_project:
        return jsonify({"error": "No active project"}), 400
    
    # Save the current project metadata
    project = current_project
    project.modified_date = time.time()  # Using time.time() instead of datetime for consistency
    project.save_metadata()
    
    # Update project in registry
    projects = load_projects_registry()
    for p in projects:
        if p["id"] == project.id:
            p["modified_date"] = project.modified_date
            break
    save_projects_registry(projects)
    
    # Clear the current project
    current_project = None
    return jsonify({"status": "success"})

@app.route('/project-details', methods=['GET'])
def project_details():
    """Get details of the current project."""
    global current_project
    if not current_project:
        return jsonify({"error": "No active project"}), 400
    
    # Return the project metadata from the current project object
    return jsonify({
        "id": current_project.id,
        "name": current_project.name,
        "base_dir": current_project.base_dir,
        "created_date": current_project.created_date,
        "modified_date": current_project.modified_date,
        "project_dir": current_project.project_dir,
        "files": current_project.files
    })


@app.route('/health', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    return jsonify({"status": "ok"})
@app.route('/upload-excel', methods=['POST'])
def upload_excel():
    """Upload an Excel file to the current project."""
    global current_project
    
    if not current_project:
        return jsonify({"error": "No active project. Please create or load a project first."}), 400

    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": f"Invalid file type. Allowed types are: {', '.join(ALLOWED_EXTENSIONS)}"}), 400

    original_filename = secure_filename(file.filename)
    file_path = os.path.join(current_project.input_dir, original_filename)
    file.save(file_path)
    
    # Add file to project tracking
    current_project.add_file(file_path, "input")
    current_project.save_metadata()

    return jsonify({
        "status": "success",
        "message": "File uploaded successfully",
        "project_id": current_project.id,
        "original_filename": original_filename,
        "file_path": file_path
    })

@app.route('/get-sheets', methods=['POST'])
def get_sheets():
    """Get sheets from all Excel files in the current project."""
    global current_project
    
    if not current_project:
        return jsonify({"error": "No active project. Please create or load a project first."}), 400
    
    excel_files = current_project.files.get("input", [])
    
    if not excel_files:
        return jsonify({"error": "No Excel files found in project"}), 404
    
    result = {}
    
    for excel_file in excel_files:
        sheets = excel_file_handler.get_sheet_names(excel_file)
        
        if isinstance(sheets, dict) and "error" in sheets:
            # Skip files with errors but continue processing others
            result[excel_file] = {"error": sheets["error"]}
        else:
            result[excel_file] = sheets
    
    return jsonify({
        "status": "success",
        "project_id": current_project.id,
        "files": result
    })
    
@app.route('/process-excel', methods=['POST'])
def process_excel():
    """Process Excel file sheets and save as CSV or images."""
    global current_project
    
    if not current_project:
        return jsonify({"error": "No active project. Please create or load a project first."}), 400
    
    try:
        # Get sheet types from request - should be a dictionary of {"sheetName": "type"}
        sheet_types = request.json.get('sheets', {})
        
        if not sheet_types:
            return jsonify({"error": "No sheet types provided. Please specify sheet types."}), 400
            
        # Get all xls and xlsx files in the input directory
        excel_files = current_project.files.get("input", [])
        output_dir = current_project.output_dir
        if not excel_files:
            return jsonify({"error": "No Excel files found in the project input directory."}), 404

        has_error = False
        
        # Process all excel files
        for excel_file in excel_files:
            result = excel_file_handler.process_sheets(excel_file, output_dir, sheet_types)
            for sheet in result:
                if result[sheet]["status"] == "success":
                    current_project.add_file(result[sheet]["output_path"], "output")
            
            if isinstance(result, dict) and "error" in result:
                has_error = True
                
        # Add processing record to project
        current_project.add_processing_record(
            operation="excel_processing",
            input_files=excel_files,
            output_files=current_project.files.get("output", []),
            details={"sheet_types": sheet_types}
        )
        current_project.save_metadata()
        
        # Return comprehensive results
        return jsonify({
            "status": "error" if has_error else "success",
            "project_id": current_project.id,
            "results": current_project.files.get("output", [])
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500




@app.route('/generate-documents', methods=['POST'])
def generate_documents():
    """Generate documents based on processed data."""
    global current_project
    
    if not current_project:
        return jsonify({"error": "No active project. Please create or load a project first."}), 400
    
    # Implement document generation logic here
    return jsonify({"status": "Not implemented yet"})
    
@app.route('/api/class-diagram', methods=['POST'])
def get_class_diagram():
    """API endpoint to generate class diagram data from Gemini."""
    global current_project
    
    if not current_project:
        return jsonify({"error": "No active project. Please create or load a project first."}), 400

    try:
        # Use the project's processed directory
        data_dir = current_project.processed_dir
        files = generator.scan_data_directory(data_dir)
        csv_data = generator.read_csv_data(files["csvs"])

        if not csv_data:
            return jsonify({"error": "No CSV data found to generate class diagram."}), 400

        diagram_data = generator.generate_class_diagram(csv_data)
        
        # Add processing record to project
        current_project.add_processing_record(
            operation="class_diagram_generation",
            input_files=files["csvs"],
            output_files=[],
            details={"diagram_type": "class_diagram"}
        )
        current_project.save_metadata()

        return jsonify(diagram_data), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
