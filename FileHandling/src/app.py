import json
import os
import win32com.client
import time
import csv
import io
import uuid
import litellm
import base64
from PIL import ImageGrab
from flask import Flask, request, jsonify
from flask_cors import CORS
import pythoncom
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from agents.DocumentGeneration import GeneralAgent
from utils.ExcelFileHandler import ExcelFileHandler
from utils.Project import Project
from pathlib import Path
from flask import send_from_directory
app = Flask(__name__)
CORS(app, supports_credentials=True)
app.secret_key = os.urandom(24)  # Secret key for session management

@app.after_request
def add_csp_header(response):
    print(f"Applying CSP header for request path: {request.path}") 
    csp = (
        "default-src 'self' data:; "  # Base policy: self and data URIs
        # Explicitly define script-src allowing self, inline, and eval
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'unsafe-hashes'; "
        # Allow inline styles (often needed with inline scripts)
        "style-src 'self' 'unsafe-inline'; " 
        # Allow connections back to self and the backend itself (if needed by scripts)
        "connect-src 'self' http://localhost:5000 http://127.0.0.1:5000 file://*; " 
        # Allow Electron to frame this content, and potentially allow self-framing
        "frame-src 'self' http://localhost:5000; " 
        # Allow images from self and data URIs (add other sources if needed)
        "img-src 'self' data: blob:; form-action 'self';" 
        # IMPORTANT: Remove frame-ancestors if you rely on frame-src, or set it correctly.
        # If you want Electron (file:// or self) to frame it:
        # "frame-ancestors 'self';" # 'self' might cover file:// in Electron
        # Or be more specific if needed. Let's rely on frame-src for now.
    )
    print(f"Setting CSP: {csp}")
    response.headers['Content-Security-Policy'] = csp
    # Ensure CORS headers aren't overwritten if needed elsewhere, CORS() usually handles this
    # response.headers.add('Access-Control-Allow-Origin', '*') 
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

# Helper function to check allowed file extensions
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Global variable to track the current project
current_project = None
PROJECTS_REGISTRY_FILE = os.path.join(ROOT_DIR, 'projects_registry.json')

generator = GeneralAgent(api_key=api_key, project=current_project)

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
    generator.change_project(project)
    generator.initialize_message()
    
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
                    current_project.scan_and_update_files()
                    generator.change_project(project)
                    generator.initialize_message()
                    return jsonify({
                        "status": "success",
                        "project_id": project.id,
                        "project_name": project.name,
                        "project_dir": project.project_dir
                    })
                    
                    return jsonify(response_data)
    
    # If we get here, the project was in registry but files weren't found
    return jsonify({"error": "Project files not found"}), 404

@app.route('/current-message', methods=['GET'])
def current_message():
    """Get the current message for the project."""
    global generator
    res = generator.initialize_message()
    return jsonify(generator.init_message.get_conversation())

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
    generator.change_project(None)
    
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
    """Process Excel file sheets and save as CSV or images.
    Sample input JSON:
    {
        "sheets": {
            "Sheet1": "csv",
            "Sheet2": "image"
        }
    }
    Sample output JSON:
    {
        "status": "success",
        "project_id": "project_id",
        "results": {
            "file1.xlsx": {
                "Sheet1": "csv",
                "Sheet2": "image"
            },
            "file2.xlsx": {
                "Sheet1": "csv",
                "Sheet2": "image"
            }
        }
    }
    """
    global current_project
    current_project.scan_and_update_files()
    if not current_project:
        return jsonify({"error": "No active project. Please create or load a project first."}), 400

    try:
        # Get sheet types from request - should be a dictionary of {"sheetName": "type"}
        sheet_types = request.json.get('sheets', {})

        if not sheet_types:
            return jsonify({"error": "No sheet types provided. Please specify sheet types."}), 400

        # Get all xls and xlsx files in the input directory
        excel_files = current_project.files.get("input", [])
        output_dir = current_project.processed_dir
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
        generator.initialize_message()
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

@app.route('/generate-all-documents', methods=['POST'])
def generate_all_documents():
    """Generate all documents using Gemini API."""
    global current_project
    if not current_project:
        return jsonify({"error": "No active project. Please create or load a project first."}), 400

    try:
        # Generate the document
        document_content = generator.generate_text_document()
        print("Document content: ", document_content)   
        output_file = os.path.join(current_project.output_dir, "generated_document.md")
        generator.save_document(document_content, output_file)
        # Generate html file
        html_output_file = os.path.join(current_project.output_dir, "generated_document.html")
        generator.save_html(document_content, html_output_file)

        # Add processing record to project
        current_project.add_processing_record(
            operation="document_generation",
            input_files=current_project.files.get("input", []),
            output_files=[{"path": output_file, "name": "generated_document.md"}],
            details={}
        )

        current_project.save_metadata()

        return jsonify({
            "status": "success",
            "message": "Document generated successfully",
            "name": "generated_document.md",
        })

    except Exception as e:
        error_message = f"Error in /generate-all-documents: {str(e)}"
        print(error_message)
        return jsonify({"error": error_message}), 500

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
    global current_project
    if not current_project:
        return jsonify({"error": "No active project. Please create or load a project first."}), 400

    try:
        # Generate the class diagram
        class_diagram = generator.generate_class_diagram()
        output_file = os.path.join(current_project.output_dir, "class_diagram.json")
        generator.save_json(class_diagram, output_file)

        # Add processing record to project
        current_project.add_processing_record(
            operation="class_diagram_generation",
            input_files=current_project.files.get("input", []),
            output_files=[{"path": output_file, "name": "class_diagram.json"}],
            details={}
        )

        current_project.save_metadata()

        return jsonify({
            "status": "success",
            "message": "Class diagram generated successfully",
            "name": "class_diagram.json",
        })
    except Exception as e:
        error_message = f"Error in /generate-class-diagram: {str(e)}"
        print(error_message)
        return jsonify({"error": error_message}), 500


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
@app.route('/api/generate-preview-app', methods=['POST'])
def generate_preview_app():
    """Generate a preview app from processed images using Gemini API."""
    global current_project
    
    if not current_project:
        return jsonify({"error": "No active project. Please create or load a project first."}), 400

    try:
        # Get project directory from request
        data = request.json
        project_dir = data.get('projectDir')
        
        if not project_dir:
            return jsonify({"error": "Project directory not provided."}), 400
        
        # Debug: Print the directory being searched
        print(f"Looking for images in: {project_dir}")
        
        # Find all images in the project - first check output dir, then try other locations
        image_dirs = [
            Path(os.path.join(project_dir, "output")),  # Try output directory first
            Path(project_dir),                          # Then try project root
            Path(os.path.join(project_dir, "processed")), # Try processed directory
            Path(os.path.join(project_dir, "images"))   # Try images directory
        ]
        
        # Find images in all potential directories
        image_files = []
        for image_dir in image_dirs:
            if image_dir.exists():
                print(f"Checking directory: {image_dir}")
                for ext in ['png', 'jpg', 'jpeg']:
                    found_images = list(image_dir.glob(f"**/*.{ext}"))
                    print(f"Found {len(found_images)} {ext} files in {image_dir}")
                    image_files.extend(found_images)
                
                # If we found images in this directory, we can stop looking
                if image_files:
                    break
        
        if not image_files:
            # Create a simple fallback HTML if no images found
            html_content = """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Preview App</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; text-align: center; }
                    .container { max-width: 800px; margin: 0 auto; }
                    .message { background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 5px; padding: 20px; }
                    h1 { color: #343a40; }
                    p { color: #6c757d; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="message">
                        <h1>No Images Available</h1>
                        <p>No image files were found in this project. Please process some Excel files or add images to generate a preview.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            # Save the fallback HTML
            output_file = os.path.join(current_project.output_dir, "preview_app.html")
            with open(output_file, "w", encoding="utf-8") as f:
                f.write(html_content)
                
            return jsonify({
                "status": "success",
                "html": html_content,
                "output_file": output_file,
                "warning": "No images found, using fallback template"
            })
            
        # ...continue with existing code for the case when images are found...

        # Load the images as base64
        image_data = {}
        for image_file in image_files:
            try:
                with open(image_file, "rb") as f:
                    image_bytes = f.read()
                    encoded_image = base64.b64encode(image_bytes).decode("utf-8")
                    image_data[image_file.name] = {
                        "data": encoded_image,
                        "path": str(image_file.relative_to(image_dir) if hasattr(image_file, "relative_to") else image_file.name)
                    }
            except Exception as e:
                print(f"Error loading image {image_file}: {str(e)}")

        # --- First Gemini API call - Generate Detailed Prompt ---
        first_prompt = "From these images, write a detailed prompt to create a preview app using only HTML. Describe the flow process in detail so another AI can understand the full context of the application shown in the images."

        first_messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": first_prompt}
                ]
            }
        ]

        # Add image content to the first message
        for image_name, image_info in image_data.items():
            first_messages[0]["content"].append({
                "type": "image_url",
                "image_url": f"data:image/png;base64,{image_info['data']}"
            })

        # Make first API call to Gemini
        api_key_1 = os.getenv('GEMINI_API_KEY_1')
        os.environ["GEMINI_API_KEY"] = api_key_1

        first_response = litellm.completion(
            model="gemini/gemini-2.0-flash-thinking-exp",
            messages=first_messages,
            temperature=0.2
        )

        generated_prompt = first_response.choices[0].message.content

        # --- Second Gemini API call - Generate HTML Preview App ---
        second_prompt_prefix = f"""
        Based on the following detailed prompt and the images I give you, generate a preview app using only HTML, CSS, and JavaScript.
        The preview should be fully functional as a static HTML page and visually match the screens in the images.
        Ensure the app:
        1. Is a single HTML file (no separate files).
        2. Is responsive and well-designed.
        3. Includes navigation to access different screens/views shown in the images.
        4. Uses vanilla JavaScript for interactivity (no external libraries).
        5. Has a clean, professional design.
        6. Implements client-side navigation using JavaScript to show and hide different sections/views within the single HTML file.

        Detailed Prompt:
        {generated_prompt}

        Generate the complete HTML code, including embedded CSS in `<style>` tags and JavaScript in `<script>` tags.
        """

        second_prompt = second_prompt_prefix

        second_messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": second_prompt}
                ]
            }
        ]

        # Add image content to the second message
        for image_name, image_info in image_data.items():
            second_messages[0]["content"].append({
                "type": "image_url",
                "image_url": f"data:image/png;base64,{image_info['data']}"
            })

        # Make second API call to Gemini
        api_key_2 = os.getenv('GEMINI_API_KEY_2')
        os.environ["GEMINI_API_KEY"] = api_key_2

        second_response = litellm.completion(
            model="gemini/gemini-2.0-flash-thinking-exp",
            messages=second_messages,
            temperature=0.2
        )

        final_html = second_response.choices[0].message.content

        # Extract just the HTML part (using the nested function)
        # Define a simple function to extract HTML content
        def extract_html_content(html):
            return html.strip()  # Example: Strip any leading/trailing whitespace

        html_content = extract_html_content(final_html)

        # # Modify the HTML to work better with CSP restrictions
        # if "<head>" in html_content:
        #     # Add CSP meta tag that's more permissive for the preview
        #     csp_meta = '<meta http-equiv="Content-Security-Policy" content="default-src *; style-src * \'unsafe-inline\'; script-src * \'unsafe-inline\' \'unsafe-eval\';">'
        #     html_content = html_content.replace("<head>", f"<head>\n    {csp_meta}")

        # Save the generated HTML to the project
        output_file = os.path.join(current_project.output_dir, "preview_app.html")
        with open(output_file, "w", encoding="utf-8") as f:  # Ensure UTF-8 encoding
            f.write(html_content)

        # Record in project history
        current_project.add_processing_record(
            operation="preview_app_generation",
            input_files=[str(f) for f in image_files],
            output_files=[output_file],
            details={"generated_prompt_preview": generated_prompt[:150] + "..."}  # Save a longer preview
        )
        current_project.save_metadata()

        return jsonify({
            "status": "success",
            "html": html_content,
            "output_file": output_file
        })

    except Exception as e:
        import traceback
        error_message = f"Error generating preview app: {str(e)}"
        print(error_message)
        traceback.print_exc()  # Print full traceback for debugging
        return jsonify({"error": error_message}), 500


@app.route('/preview/<project_id>', methods=['GET'])
def serve_preview_app(project_id):
    """Serve the preview app HTML file for a project."""
    global current_project

    # Find the project in registry
    projects = load_projects_registry()
    project_info = next((p for p in projects if p["id"] == project_id), None)

    if not project_info:
        return jsonify({"error": "Project not found in registry"}), 404

    base_dir = project_info["base_dir"]
    for item in os.listdir(base_dir):
        if item.endswith(f"_{project_id}"):
            project_output_dir = os.path.join(base_dir, item, "output")
            preview_app_path = os.path.join(project_output_dir, "preview_app.html")
            if os.path.exists(preview_app_path):
                # Read the file and serve it with custom headers
                with open(preview_app_path, 'r', encoding='utf-8') as file:
                    html_content = file.read()
                
                response = app.response_class(
                    response=html_content,
                    status=200,
                    mimetype='text/html'
                )
                
                # # Add explicit headers for this response
                # response.headers['X-Frame-Options'] = 'ALLOWALL'
                # response.headers['Access-Control-Allow-Origin'] = '*'
                # response.headers['Content-Security-Policy'] = "default-src * 'unsafe-inline' 'unsafe-eval'; frame-ancestors *"
                return response

    return jsonify({"error": "Preview app not found"}), 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

