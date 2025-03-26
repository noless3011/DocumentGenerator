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

@app.route('/get-sheets', methods=['POST']) # Keep as POST
def get_sheets():
    """Get sheets from all Excel files in the current project."""
    global current_project

    if not current_project:
        return jsonify({"error": "No active project. Please create or load a project first."}), 400

    excel_files = current_project.files.get("input", [])

    if not excel_files:
        return jsonify({"error": "No Excel files found in project"}), 404

    all_sheet_names = [] # Initialize an empty list to collect sheet names
    result = {} # Keep the result dictionary for potential errors per file

    try:
        for excel_file_data in excel_files:
            excel_file_path = excel_file_data['path']
            sheets_or_error = excel_file_handler.get_sheet_names(excel_file_path)

            if isinstance(sheets_or_error, dict) and "error" in sheets_or_error:
                result[excel_file_path] = {"error": sheets_or_error["error"]}
            else:
                result[excel_file_path] = sheets_or_error
                all_sheet_names.extend(sheets_or_error) # Extend the list with sheet names from current file

        return jsonify({
            "status": "success",
            "project_id": current_project.id,
            "sheets": all_sheet_names # Return the collected list of sheet names under "sheets"
        })

    except Exception as e:
        error_message = f"Error in /get-sheets: {str(e)}"
        print(error_message)
        return jsonify({"error": error_message}), 500
    
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
        results_for_response = {}

        # Process all excel files
        for excel_file_data in excel_files:
            excel_file_path = excel_file_data['path']  # EXTRACT THE PATH HERE!
            file_name = excel_file_data['name']

            process_result = excel_file_handler.process_sheets(excel_file_path, output_dir, sheet_types) # Use excel_file_path (string)
            results_for_response[file_name] = process_result

            if isinstance(process_result, dict) and "error" in process_result:
                has_error = True

        # Add processing record to project
        current_project.add_processing_record(
            operation="excel_processing",
            input_files=[f['path'] for f in excel_files],
            output_files=current_project.files.get("output", []),
            details={"sheet_types": sheet_types}
        )
        current_project.save_metadata()

        # Return comprehensive results
        return jsonify({
            "status": "error" if has_error else "success",
            "project_id": current_project.id,
            "results": results_for_response
        }), 200

    except Exception as e:
        error_message = f"Error in /process-excel: {str(e)}"
        print(error_message)
        return jsonify({"error": error_message}), 500



# @app.route('/generate-documents', methods=['POST'])
# def generate_documents():
#     """Generate documents based on processed data."""
#     global current_project
    
#     if not current_project:
#         return jsonify({"error": "No active project. Please create or load a project first."}), 400
    
#     # Implement document generation logic here
#     return jsonify({"status": "Not implemented yet"})

@app.route('/generate-text-document', methods=['POST'])
def generate_text_document():
    """Generate text document using Gemini API. 
    input json: None
    output json: 
    {
        "status": "success", 
        "message": "Document generated successfully", 
        "name": "generated_document.md",
    } 
    """
    pass

@app.route('/generate-class-diagram', methods=['POST'])
def generate_class_diagram():
    """Generate class diagram using Gemini API. 
    input json: None
    output json: 
    {
        "status": "success", 
        "message": "Class diagram generated successfully", 
        "name": "class_diagram.json",
    } 
    """
    pass


@app.route('/generate-usecase-diagram', methods=['POST'])
def generate_usecase_diagram():
    """Generate usecase diagram using Gemini API. 
    input json: None
    output json: 
    {
        "status": "success", 
        "message": "Usecase diagram generated successfully", 
        "name": "usecase_diagram.json",
    } 
    """
    pass
# Create endpoint to database diagram
@app.route('/generate-database-diagram', methods=['POST'])
def generate_database_diagram():
    """Generate database diagram using Gemini API. 
    input json: None
    output json: 
    {
        "status": "success", 
        "message": "Database diagram generated successfully", 
        "name": "database_diagram.json",
    } 
    """
    pass
@app.route('/generate-preview-app', methods=['POST'])
def generate_preview_app():
    """Generate preview app using Gemini API.
    The generated preview app will be put in the folder preview app in the project directory. 
    input json: None
    output json: 
    {
        "status": "success", 
        "message": "Preview app generated successfully",
    } 
    """
    pass

# @app.route('/generate-documents', methods=['POST'])
# def generate_documents():
#     """Generate documents based on processed data."""
#     global current_project

#     if not current_project:
#         return jsonify({"error": "No active project. Please create or load a project first."}), 400

#     try:
#         # 1. Get the processed directory from the current project
#         data_dir = current_project.processed_dir
#         output_dir = current_project.output_dir  # Use project's output dir for generated docs

#         # 2. Use the DocumentGenerator to generate documents
#         generated_files = generator.generate(data_dir, output_dir) # Call the generate method

#         # 3. Count generated files and get output directory
#         file_count = len(generated_files)
#         output_directory = current_project.output_dir # Get project's output_dir

#         # 4. Add document generation record to project history
#         current_project.add_processing_record(
#             operation="document_generation",
#             input_files=[data_dir], # Or list specific input files if you track them
#             output_files=generated_files,
#             details={"generator_model": generator.model} # Add generator model to details
#         )
#         current_project.save_metadata()


#         # 5. Return success response with file count and output directory
#         return jsonify({
#             "status": "success",
#             "count": file_count,
#             "output_dir": output_directory
#         })

#     except Exception as e:
#         error_message = f"Error generating documents: {str(e)}"
#         print(error_message)
#         return jsonify({"error": error_message}), 500
    
# @app.route('/class-diagram', methods=['POST'])
# def get_class_diagram():
#     """API endpoint to generate class diagram data from Gemini."""
#     global current_project
    
#     if not current_project:
#         return jsonify({"error": "No active project. Please create or load a project first."}), 400

#     try:
#         # Use the project's processed directory
#         data_dir = current_project.processed_dir
#         files = generator.scan_data_directory(data_dir)
#         csv_data = generator.read_csv_data(files["csvs"])

#         if not csv_data:
#             return jsonify({"error": "No CSV data found to generate class diagram."}), 400

#         diagram_data = generator.generate_class_diagram(csv_data)
        
#         # Add processing record to project
#         current_project.add_processing_record(
#             operation="class_diagram_generation",
#             input_files=files["csvs"],
#             output_files=[],
#             details={"diagram_type": "class_diagram"}
#         )
#         current_project.save_metadata()

#         return jsonify(diagram_data), 200

#     except Exception as e:
#         return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
