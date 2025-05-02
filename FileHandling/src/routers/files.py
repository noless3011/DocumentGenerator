# routers/files.py
import os
import shutil
from typing import Annotated, Dict, List
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Body, status
from werkzeug.utils import secure_filename # Still useful for sanitizing filenames
from pathlib import Path

from config import settings
from utils.Project import Project
from utils.ExcelFileHandler import ExcelFileHandler
from models import (
    FileUploadResponse, SheetListResponse, SheetProcessingRequest,
    ProcessingResultResponse, ErrorResponse, ProcessingResultDetail
)
from dependencies import get_current_project, get_excel_handler, get_agent_instance

router = APIRouter(
    prefix="/files",
    tags=["Files"],
    responses={404: {"description": "Not found", "model": ErrorResponse}},
)

# Helper function (can be moved to utils if used elsewhere)
def allowed_file(filename: str):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in settings.ALLOWED_UPLOAD_EXTENSIONS

@router.post("/upload-excel", response_model=FileUploadResponse, status_code=status.HTTP_201_CREATED, summary="Upload an Excel file")
async def upload_excel(
    current_project: Annotated[Project, Depends(get_current_project)],
    file: UploadFile = File(...)
):
    """Uploads an Excel file (.xlsx, .xls) to the current project's input directory."""
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No file selected")

    if not allowed_file(file.filename):
         raise HTTPException(
             status_code=status.HTTP_400_BAD_REQUEST,
             detail=f"Invalid file type for '{file.filename}'. Allowed types are: {', '.join(settings.ALLOWED_UPLOAD_EXTENSIONS)}"
         )

    original_filename = secure_filename(file.filename) # Sanitize
    # Ensure input directory exists (Project class should handle this, but double-check)
    input_dir = Path(current_project.input_dir)
    input_dir.mkdir(parents=True, exist_ok=True)

    file_path = input_dir / original_filename
    destination_path_str = str(file_path)

    try:
        # Save the uploaded file efficiently
        with open(destination_path_str, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Could not save file: {e}")
    finally:
        await file.close() # Important to close the file handle

    # Add file to project tracking and save metadata
    current_project.add_file(destination_path_str, "input")
    current_project.save_metadata()

    return FileUploadResponse(
        status="success",
        message="File uploaded successfully",
        project_id=current_project.id,
        original_filename=original_filename,
        file_path=destination_path_str # Return the actual saved path
    )

@router.post("/get-sheets", response_model=SheetListResponse, summary="Get sheet names from Excel files")
async def get_sheets(
    current_project: Annotated[Project, Depends(get_current_project)],
    excel_handler: Annotated[ExcelFileHandler, Depends(get_excel_handler)]
):
    """Retrieves a list of all sheet names from all Excel files in the project's input directory."""
    current_project.scan_and_update_files() # Ensure file list is current
    excel_files_data = current_project.files.get("input", [])

    if not any(allowed_file(f['name']) for f in excel_files_data):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No Excel files found in project's input directory")

    all_sheet_names: List[str] = []
    errors: Dict[str, str] = {}

    for file_data in excel_files_data:
        file_path = file_data['path']
        file_name = file_data['name']
        if not allowed_file(file_name):
            continue # Skip non-excel files

        try:
            sheets_or_error = excel_handler.get_sheet_names(file_path)
            if isinstance(sheets_or_error, list):
                all_sheet_names.extend(sheets_or_error)
            elif isinstance(sheets_or_error, dict) and "error" in sheets_or_error:
                 errors[file_name] = sheets_or_error["error"]
            else:
                 # Should not happen based on ExcelFileHandler logic, but handle defensively
                 errors[file_name] = "Unexpected return type from get_sheet_names"

        except Exception as e:
            errors[file_name] = f"Failed to process file: {e}"

    # Decide on response based on errors
    if errors and not all_sheet_names:
        # Only errors occurred
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail={"message": "Errors occurred while reading sheets", "errors": errors})
    elif errors:
         # Partial success - return sheets found but maybe log errors?
         # Or adjust response model to include warnings/errors.
         print(f"Warnings during get_sheets for project {current_project.id}: {errors}")


    # Remove duplicates and sort for consistency
    unique_sorted_sheets = sorted(list(set(all_sheet_names)))

    return SheetListResponse(
        status="success",
        project_id=current_project.id,
        sheets=unique_sorted_sheets
    )

@router.post("/preview-sheet", summary="Preview a sheet from an Excel file")
async def preview_sheet(
    current_project: Annotated[Project, Depends(get_current_project)],
    excel_handler: Annotated[ExcelFileHandler, Depends(get_excel_handler)],
    request_data: dict = Body(...)
):
    """Returns preview data for a specific sheet in an Excel file"""
    file_path = request_data.get("filePath")
    sheet_name = request_data.get("sheetName")
    
    if not file_path or not sheet_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, 
                          detail="Both filePath and sheetName are required")
    
    try:
        # Get the sheet data (first 20 rows for preview)
        data = excel_handler.get_sheet_preview(file_path, sheet_name, max_rows=20)
        
        if not data or len(data) == 0:
            return {"headers": [], "data": []}
        
        headers = data[0] if data else []
        rows = data[1:] if len(data) > 1 else []
        
        return {"headers": headers, "data": rows}
        
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                          detail=f"Failed to preview sheet: {str(e)}")

@router.post("/process-excel", response_model=ProcessingResultResponse, summary="Process Excel sheets to CSV/Image")
async def process_excel(
    current_project: Annotated[Project, Depends(get_current_project)],
    excel_handler: Annotated[ExcelFileHandler, Depends(get_excel_handler)],
    request_data: SheetProcessingRequest 
):
    """
    Processes specified sheets from selected Excel files,
    saving them as CSV or images in the processed directory based on the request.
    """
    current_project.scan_and_update_files() # Ensure file list is current
    output_dir = Path(current_project.processed_dir)
    output_dir.mkdir(parents=True, exist_ok=True) # Ensure output dir exists
    
    if not request_data.files:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, 
                          detail="No files provided for processing")
    
    results_for_response: Dict[str, Dict[str, ProcessingResultDetail]] = {}
    has_error = False
    processed_output_files = [] # Track files actually created
    
    # Process each file specified in the request
    for file_info in request_data.files:
        file_path = file_info.path
        file_name = file_info.name
        sheet_types = file_info.sheets
        
        if not os.path.exists(file_path) or not allowed_file(file_name):
            results_for_response[file_name] = {
                "file_error": ProcessingResultDetail(
                    status="error", 
                    error=f"File not found or invalid file type: {file_name}"
                )
            }
            has_error = True
            continue
        
        try:
            # process_sheets returns Dict[sheet_name, Dict[status, output_path/error]]
            process_result: Dict[str, Dict] = excel_handler.process_sheets(
                file_path,
                str(output_dir), # Expects string path
                sheet_types
            )

            # Convert internal result format to Pydantic model format
            file_results_model: Dict[str, ProcessingResultDetail] = {}
            for sheet_name, result_dict in process_result.items():
                 detail = ProcessingResultDetail(**result_dict) # Unpack dict into model
                 file_results_model[sheet_name] = detail
                 if detail.status == "error":
                     has_error = True
                 elif detail.status == "success" and detail.output_path:
                     # Add successfully created files to project tracking
                     output_file_name = Path(detail.output_path).name
                     # Avoid duplicates if reprocessing
                     if not any(f['path'] == detail.output_path for f in processed_output_files):
                         processed_output_files.append({"path": detail.output_path, "name": output_file_name})


            results_for_response[file_name] = file_results_model

        except Exception as e:
            # Handle errors during the call to process_sheets itself
            print(f"Error processing file {file_name}: {e}")
            # Add an error entry for the entire file
            results_for_response[file_name] = {
                "file_error": ProcessingResultDetail(status="error", error=f"Failed to process file: {e}")
            }
            has_error = True

    # Add successfully processed files to the project metadata under 'processed' type
    for f_info in processed_output_files:
        current_project.add_file(f_info['path'], "processed") # Use 'processed' category

    # Add a record of this processing operation
    current_project.add_processing_record(
        operation="excel_processing",
        input_files=[file_info.path for file_info in request_data.files], # Log requested input files
        output_files=processed_output_files, # Log only successfully created outputs
        details={"sheet_types_requested": {file_info.name: file_info.sheets for file_info in request_data.files}}
    )
    current_project.save_metadata()

    return ProcessingResultResponse(
        status="error" if has_error else "success",
        project_id=current_project.id,
        results=results_for_response
    )