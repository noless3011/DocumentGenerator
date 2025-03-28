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
from DocumentGeneration import DocumentGenerator

app = Flask(__name__)
CORS(app)
app.secret_key = os.urandom(24)  # Secret key for session management

@app.after_request
def add_csp_header(response):
    response.headers['Content-Security-Policy'] = "default-src 'self' 'unsafe-inline' data:; connect-src 'self' http://localhost:5000"
    return response

# Configuration for file uploads and outputs
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
OUTPUT_FOLDER_BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'output') # Base output folder
ALLOWED_EXTENSIONS = {'xlsx', 'xls'}

# Ensure upload and output directories exist
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
if not os.path.exists(OUTPUT_FOLDER_BASE):
    os.makedirs(OUTPUT_FOLDER_BASE)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['OUTPUT_FOLDER_BASE'] = OUTPUT_FOLDER_BASE

# Helper function to check allowed file extensions
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Helper function to get sheet names from Excel file
def get_excel_sheet_names(excel_file_path):
    """
    Get all sheet names from an Excel file

    Args:
        excel_file_path (str): Path to the Excel file

    Returns:
        list: List of sheet names or dict with error
    """
    if not os.path.exists(excel_file_path):
        return {"error": f"Excel file not found: {excel_file_path}"}

    pythoncom.CoInitialize()
    excel = None
    workbook = None
    try:
        excel = win32com.client.Dispatch("Excel.Application")
        excel.Visible = False
        excel.DisplayAlerts = False
        workbook = excel.Workbooks.Open(excel_file_path)
        sheet_names = [sheet.Name for sheet in workbook.Sheets]
        return sheet_names
    except Exception as e:
        return {"error": str(e)}
    finally:
        if workbook:
            workbook.Close(SaveChanges=False)
        if excel:
            excel.Quit()
        pythoncom.CoUninitialize()

def process_excel_sheets(excel_file_path, output_folder, sheet_types):
    """
    Process Excel sheets according to specified types.

    Args:
        excel_file_path (str): Path to the Excel file
        output_folder (str): Folder where outputs will be saved (UUID named folder)
        sheet_types (dict): Dictionary with sheet names as keys and types as values ('ui' or 'table')

    Returns:
        dict: Summary of processed sheets with their output paths
    """
    excel_file_path = os.path.abspath(excel_file_path)
    output_folder = os.path.abspath(output_folder)

    if not os.path.exists(excel_file_path):
        return {"error": f"Excel file not found: {excel_file_path}"}

    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    base_filename = os.path.splitext(os.path.basename(excel_file_path))[0]

    pythoncom.CoInitialize()
    excel = None
    workbook = None
    result = {}

    try:
        excel = win32com.client.Dispatch("Excel.Application")
        excel.Visible = False
        excel.DisplayAlerts = False
        workbook = excel.Workbooks.Open(excel_file_path)
        sheet_names = [sheet.Name for sheet in workbook.Sheets]

        for sheet_name in sheet_types:
            if sheet_name not in sheet_names:
                result[sheet_name] = {
                    "status": "error",
                    "message": f"Sheet '{sheet_name}' not found in workbook"
                }

        for sheet_name, sheet_type in sheet_types.items():
            if sheet_name not in sheet_names:
                continue

            try:
                worksheet = workbook.Sheets(sheet_name)
                worksheet.Activate()

                if sheet_type.lower() == 'table':
                    csv_data = process_text_table(worksheet)
                    output_path = os.path.join(output_folder, f"{sheet_name}.csv") # Output to UUID folder
                    with open(output_path, 'w', newline='', encoding='utf-16') as csv_file:
                        csv_file.write(csv_data)
                    result[sheet_name] = {
                        "status": "success",
                        "type": "table",
                        "output_path": output_path
                    }

                elif sheet_type.lower() == 'ui':
                    output_path = os.path.join(output_folder, f"{sheet_name}.png") # Output to UUID folder
                    success = save_sheet_as_image(worksheet, output_path)
                    if success:
                        result[sheet_name] = {
                            "status": "success",
                            "type": "ui",
                            "output_path": output_path
                        }
                    else:
                        result[sheet_name] = {
                            "status": "error",
                            "message": "Failed to save sheet as image"
                        }
                else:
                    result[sheet_name] = {
                        "status": "error",
                        "message": f"Unknown sheet type '{sheet_type}'. Use 'ui' or 'table'."
                    }

            except Exception as e:
                result[sheet_name] = {
                    "status": "error",
                    "message": str(e)
                }
        return result

    except Exception as e:
        return {"error": str(e)}

    finally:
        if workbook:
            workbook.Close(SaveChanges=False)
        if excel:
            excel.Quit()
        pythoncom.CoUninitialize()

def process_text_table(worksheet):
    """
    Process a text table worksheet and return CSV content
    """
    used_range = worksheet.UsedRange
    output = io.StringIO()
    csv_writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
    for row in range(1, used_range.Rows.Count + 1):
        row_data = []
        for col in range(1, used_range.Columns.Count + 1):
            cell_value = used_range.Cells(row, col).Value
            if isinstance(cell_value, str):
                cell_value = cell_value.encode('utf-16', errors='ignore').decode('utf-16')
            row_data.append(cell_value if cell_value is not None else "")
        csv_writer.writerow(row_data)
    return output.getvalue()

def save_sheet_as_image(worksheet, output_path):
    """
    Save a worksheet as an image
    """
    try:
        used_range = worksheet.UsedRange
        used_range.Select()
        worksheet.Application.Selection.Copy()
        time.sleep(0.5)
        image = ImageGrab.grabclipboard()
        if image:
            image.save(output_path)
            return True
        else:
            return False
    except Exception:
        return False

@app.route('/process-excel', methods=['POST'])
def api_process_excel():
    """
    Process Excel file via API using session file_id (UUID folder)
    """
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


        result = process_excel_sheets(
            excel_file_path,
            output_folder,
            data['sheets']
        )
        result["output_folder"] = output_folder # Return UUID named output folder path
        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    return jsonify({"status": "ok"})

@app.route('/upload-excel', methods=['POST'])
def upload_excel():
    """
    Upload an Excel file. Generates and returns a UUID for session management.
    """
    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    if file and allowed_file(file.filename):
        session_uuid = uuid.uuid4().hex # Generate UUID on backend
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


@app.route('/get-sheets/<file_id>', methods=['GET'])
def get_sheets(file_id):
    """
    Get sheet names from an uploaded Excel file using session file_id (UUID folder)
    """
    session_folder = os.path.join(app.config['UPLOAD_FOLDER'], file_id)
    excel_files = [f for f in os.listdir(session_folder) if allowed_file(f)]
    if not excel_files:
        return jsonify({"error": f"No valid Excel file found in session folder: {file_id}"}), 404
    excel_filename = excel_files[0]
    excel_file_path = os.path.join(session_folder, excel_filename)


    if not os.path.exists(excel_file_path):
        return jsonify({"error": f"File not found in session: {file_id}"}), 404

    sheet_names = get_excel_sheet_names(excel_file_path)

    if isinstance(sheet_names, dict) and "error" in sheet_names:
        return jsonify(sheet_names), 500

    return jsonify({
        "status": "success",
        "file_id": file_id, # Return UUID as file_id
        "sheets": sheet_names
    })

load_dotenv()
api_key = os.getenv('GEMINI_API_KEY')
if not api_key:
    raise ValueError("GOOGLE_API_KEY not found in environment variables. Please set it in .env file.")

@app.route('/generate-documents', methods=['POST'])
def generate_documents():
    """
    Generate a document from data in the data directory (No change needed for file handling changes)
    """
    generator = DocumentGenerator(api_key=api_key)
    try:
        default_data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')
        default_output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'output')
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


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)