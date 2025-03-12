import os
import win32com.client
import time
import csv
import io
import uuid
from PIL import ImageGrab
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import pythoncom
from werkzeug.utils import secure_filename



app = Flask(__name__)
@app.after_request
def add_csp_header(response):
    response.headers['Content-Security-Policy'] = "default-src 'self' 'unsafe-inline' data:; connect-src 'self' http://localhost:5000"
    return response
CORS(app)
# Configuration for file uploads
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
ALLOWED_EXTENSIONS = {'xlsx', 'xls'}
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

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
        list: List of sheet names
    """
    # Check if the Excel file exists
    if not os.path.exists(excel_file_path):
        return {"error": f"Excel file not found: {excel_file_path}"}
    
    # Initialize COM for the thread
    pythoncom.CoInitialize()
    
    try:
        # Initialize Excel application
        excel = win32com.client.Dispatch("Excel.Application")
        excel.Visible = False
        excel.DisplayAlerts = False
        
        # Open workbook
        workbook = excel.Workbooks.Open(excel_file_path)
        
        # Get all sheet names in the workbook
        sheet_names = [sheet.Name for sheet in workbook.Sheets]
        
        return sheet_names
    
    except Exception as e:
        return {"error": str(e)}
    
    finally:
        # Close the workbook without saving changes
        if 'workbook' in locals():
            workbook.Close(SaveChanges=False)
        
        # Quit Excel
        if 'excel' in locals():
            excel.Quit()
        
        # Release COM objects
        if 'workbook' in locals():
            del workbook
        if 'excel' in locals():
            del excel
            
        # Uninitialize COM
        pythoncom.CoUninitialize()

def process_excel_sheets(excel_file_path, output_folder, sheet_types):
    """
    Process Excel sheets according to specified types.
    
    Args:
        excel_file_path (str): Path to the Excel file
        output_folder (str): Folder where outputs will be saved
        sheet_types (dict): Dictionary with sheet names as keys and types as values ('ui' or 'table')
    
    Returns:
        dict: Summary of processed sheets with their output paths
    """
    # Get absolute paths
    excel_file_path = os.path.abspath(excel_file_path)
    output_folder = os.path.abspath(output_folder)
    
    # Check if the Excel file exists
    if not os.path.exists(excel_file_path):
        return {"error": f"Excel file not found: {excel_file_path}"}
    
    # Create output directory if it doesn't exist
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
    
    # Extract filename without extension
    base_filename = os.path.splitext(os.path.basename(excel_file_path))[0]
     # Initialize COM for the thread
    
    pythoncom.CoInitialize()

    result = {}
    
    try:
         # Initialize Excel application
        excel = win32com.client.Dispatch("Excel.Application")
        excel.Visible = False
        excel.DisplayAlerts = False
        # Open workbook
        workbook = excel.Workbooks.Open(excel_file_path)
        
        # Get all sheet names in the workbook
        sheet_names = [sheet.Name for sheet in workbook.Sheets]
        
        # Check for sheets specified in sheet_types but not in the workbook
        for sheet_name in sheet_types:
            if sheet_name not in sheet_names:
                result[sheet_name] = {
                    "status": "error", 
                    "message": f"Sheet '{sheet_name}' not found in workbook"
                }
        
        # Process each worksheet that has a specified type
        for sheet_name, sheet_type in sheet_types.items():
            if sheet_name not in sheet_names:
                continue  # Skip sheets not in workbook (already reported above)
                
            try:
                worksheet = workbook.Sheets(sheet_name)
                
                # Activate the worksheet
                worksheet.Activate()
                
                if sheet_type.lower() == 'table':
                    # Process as text table (CSV)
                    csv_data = process_text_table(worksheet)
                    output_path = os.path.join(output_folder, f"{base_filename}_{sheet_name}.csv")
                    
                    with open(output_path, 'w', newline='', encoding='utf-16') as csv_file:
                        csv_file.write(csv_data)
                    
                    result[sheet_name] = {
                        "status": "success",
                        "type": "table",
                        "output_path": output_path
                    }
                    
                elif sheet_type.lower() == 'ui':
                    # Process as UI (image)
                    output_path = os.path.join(output_folder, f"{base_filename}_{sheet_name}.png")
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
        # Close the workbook without saving changes
        if 'workbook' in locals():
            workbook.Close(SaveChanges=False)
        
        # Quit Excel
        excel.Quit()
        
        # Release COM objects
        if 'worksheet' in locals():
            del worksheet
        if 'workbook' in locals():
            del workbook
        if 'excel' in locals():
            del excel
        # Uninitialize COM
        pythoncom.CoUninitialize()

def process_text_table(worksheet):
    """
    Process a text table worksheet and return CSV content
    
    Args:
        worksheet: Excel worksheet COM object
    
    Returns:
        str: CSV formatted string
    """
    used_range = worksheet.UsedRange
    
    # Create a CSV output buffer
    output = io.StringIO()
    csv_writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
    
    # Convert worksheet range to CSV
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
    
    Args:
        worksheet: Excel worksheet COM object
        output_path (str): Path where the image will be saved
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Get used range
        used_range = worksheet.UsedRange
        
        # Select the used range
        used_range.Select()
        
        # Copy the selected range
        worksheet.Application.Selection.Copy()
        
        # Give Excel a moment to complete the copy operation
        time.sleep(0.5)
        
        # Capture the image from clipboard
        image = ImageGrab.grabclipboard()
        
        if image:
            # Save the image
            image.save(output_path)
            return True
        else:
            return False
    
    except Exception:
        return False

@app.route('/process-excel', methods=['POST'])
def api_process_excel():
    """
    Process Excel file via API
    
    Expected JSON payload:
    {
        "file_id": "filename_uuid.xlsx",
        "sheets": {
            "Sheet1": "ui",
            "Sheet2": "table"
        }
    }
    """
    try:
        data = request.json
        
        # Validate required fields
        if not all(key in data for key in ['file_id', 'sheets']):
            return jsonify({
                "error": "Missing required fields. Required: file_id, sheets"
            }), 400
        
        # Construct the actual file path from the file_id
        excel_file_path = os.path.join(app.config['UPLOAD_FOLDER'], data['file_id'])
        
        # Set output folder to data folder in root directory
        output_folder = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')
        
        # Create output directory if it doesn't exist
        if not os.path.exists(output_folder):
            os.makedirs(output_folder)
        
        # Process the Excel file
        result = process_excel_sheets(
            excel_file_path,
            output_folder,
            data['sheets']
        )
        
        # Add output folder path to the response
        result["output_folder"] = output_folder
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/health', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    return jsonify({"status": "ok"})

# New endpoint for uploading Excel files
@app.route('/upload-excel', methods=['POST'])
def upload_excel():
    """
    Upload an Excel file
    
    Returns:
        JSON with file information including path and unique ID
    """
    # Check if the post request has the file part
    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400
        
    file = request.files['file']
    
    # If user does not select file, browser might submit an empty file
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
        
    if file and allowed_file(file.filename):
        # Generate a unique filename to prevent overwriting
        original_filename = secure_filename(file.filename)
        filename_parts = os.path.splitext(original_filename)
        unique_filename = f"{filename_parts[0]}_{uuid.uuid4().hex}{filename_parts[1]}"
        
        # Save the file
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(file_path)
        
        return jsonify({
            "status": "success",
            "message": "File uploaded successfully",
            "file_id": unique_filename,
            "original_filename": original_filename,
            "file_path": file_path
        })
    else:
        return jsonify({
            "error": f"Invalid file type. Allowed types are: {', '.join(ALLOWED_EXTENSIONS)}"
        }), 400

# New endpoint for getting sheet names from an uploaded Excel file
@app.route('/get-sheets/<file_id>', methods=['GET'])
def get_sheets(file_id):
    """
    Get sheet names from an uploaded Excel file
    
    Args:
        file_id: Unique identifier for the uploaded file
        
    Returns:
        JSON with sheet names
    """
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], file_id)
    
    if not os.path.exists(file_path):
        return jsonify({"error": f"File not found: {file_id}"}), 404
        
    sheet_names = get_excel_sheet_names(file_path)
    
    if isinstance(sheet_names, dict) and "error" in sheet_names:
        return jsonify(sheet_names), 500
        
    return jsonify({
        "status": "success",
        "file_id": file_id,
        "sheets": sheet_names
    })
from DocumentGeneration import DocumentGenerator
# Configurate for the document generator
generator = DocumentGenerator(api_key="AIzaSyCBmnvIxJlKIafCAqL6JUJQZjNGqDCW6dk")


@app.route('/generate-documents', methods=['POST'])
def generate_documents():
    """
    Generate a document from data in the data directory
    
    Expected JSON payload:
    {
        "data_dir": "optional/custom/path",  # Optional, defaults to app's data directory
        "output_dir": "optional/output/path"  # Optional, defaults to 'output' in project directory
    }
    
    Returns:
        JSON with list of generated files
    """
    try:
        # Get the default data directory path
        default_data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')
        
        # Get the default output directory path
        default_output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'output')
        
        # Use custom directories if provided
        data = request.json or {}
        data_dir = data.get('data_dir', default_data_dir)
        output_dir = data.get('output_dir', default_output_dir)
        
        # Generate documents using the DocumentGenerator
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
