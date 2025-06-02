import os
import shutil
from typing import Annotated, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Body, status
from werkzeug.utils import secure_filename
from pathlib import Path

from config import settings
from utils.Project import Project
from utils.ExcelFileHandler import ExcelFileHandler
from models import (
    FileUploadResponse, SheetListResponse, SheetProcessingRequest,
    ProcessingResultResponse, ErrorResponse, ProcessingResultDetail,
    FileProcessingInfo # Added this import
)
from dependencies import get_current_project, get_excel_handler

router = APIRouter(
    prefix="/files",
    tags=["Files"],
    responses={404: {"description": "Not found", "model": ErrorResponse}},
)

def allowed_file(filename: str):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in settings.ALLOWED_UPLOAD_EXTENSIONS

@router.post("/upload-excel", response_model=FileUploadResponse, status_code=status.HTTP_201_CREATED, summary="Upload an Excel file")
async def upload_excel(
    current_project: Annotated[Project, Depends(get_current_project)],
    file: UploadFile = File(...)
):
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No file selected")

    if not allowed_file(file.filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type for '{file.filename}'. Allowed types are: {', '.join(settings.ALLOWED_UPLOAD_EXTENSIONS)}"
        )

    original_filename = secure_filename(file.filename)

    input_dir_path = Path(current_project.input_dir)
    input_dir_path.mkdir(parents=True, exist_ok=True) # Ensure input dir exists

    # Use Project's method to create and track the file record
    # This handles unique naming if needed and adds to project.files
    # We need to save content after creating the record.
    # Let's adjust to save first, then add record.

    # Determine unique file path
    temp_filename = original_filename
    destination_path = input_dir_path / temp_filename
    counter = 1
    while destination_path.exists():
        name, ext = os.path.splitext(original_filename)
        temp_filename = f"{name}_{counter}{ext}"
        destination_path = input_dir_path / temp_filename
        counter += 1

    final_filename = temp_filename # This is the name it will be saved as

    try:
        with open(destination_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        # If save fails, attempt to clean up if file was partially created (though unlikely with wb)
        if destination_path.exists():
            try:
                os.remove(destination_path)
            except OSError:
                pass # Ignore error during cleanup
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Could not save file content: {e}")
    finally:
        await file.close()

    # Now that file is saved, add it to project records
    added_successfully = await current_project.add_file_record(str(destination_path), "input", final_filename)
    if not added_successfully:
         # This case should ideally not happen if file saving succeeded.
         # Might indicate logic error in add_file_record or race condition.
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"File '{final_filename}' saved but failed to record in project."
        )

    await current_project.save_metadata() # Persist changes to project files list

    return FileUploadResponse(
        status="success",
        message="File uploaded successfully",
        project_id=current_project.id,
        original_filename=original_filename, # User's original filename
        file_path=str(destination_path),    # Actual saved path (potentially renamed)
        saved_filename=final_filename       # Actual saved name
    )


@router.post("/get-sheets", response_model=SheetListResponse, summary="Get sheet names from Excel files in input")
async def get_sheets(
    current_project: Annotated[Project, Depends(get_current_project)],
    excel_handler: Annotated[ExcelFileHandler, Depends(get_excel_handler)]
):
    # No need to call scan_and_update_files() here if we trust project state,
    # or call it if there's a chance files were added externally without API.
    # For robustness:
    await current_project.scan_and_update_files()

    excel_files_data = current_project.files.get("input", [])

    # Filter for actual Excel files based on extension, not just any file in input_dir
    project_excel_files = [f for f in excel_files_data if allowed_file(f['name'])]

    if not project_excel_files:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No Excel files (.xlsx, .xls) found in project's input directory.")

    all_sheet_names_map: Dict[str, List[str]] = {} # filename -> list of sheets
    errors: Dict[str, str] = {}

    for file_data in project_excel_files:
        file_path = file_data['path']
        file_name = file_data['name']

        try:
            sheets_or_error = excel_handler.get_sheet_names(file_path)
            if isinstance(sheets_or_error, list):
                all_sheet_names_map[file_name] = sheets_or_error
            elif isinstance(sheets_or_error, dict) and "error" in sheets_or_error:
                 errors[file_name] = sheets_or_error["error"]
            else:
                 errors[file_name] = "Unexpected return from get_sheet_names"
        except Exception as e:
            errors[file_name] = f"Failed to process file: {str(e)}"

    if errors and not all_sheet_names_map:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail={"message": "Errors occurred while reading sheets from all Excel files", "errors": errors})

    # Flatten list of all sheets for unique sorted list, but also provide per-file
    all_sheets_flat = []
    for sheets in all_sheet_names_map.values():
        all_sheets_flat.extend(sheets)

    unique_sorted_sheets = sorted(list(set(all_sheets_flat)))

    return SheetListResponse(
        status="success",
        project_id=current_project.id,
        sheets_per_file=all_sheet_names_map, # New field
        all_unique_sheets=unique_sorted_sheets, # Old field, now `all_unique_sheets`
        errors=errors if errors else None # Include errors if any
    )


@router.post("/process-excel", response_model=ProcessingResultResponse, summary="Process Excel sheets to CSV/Image")
async def process_excel(
    current_project: Annotated[Project, Depends(get_current_project)],
    excel_handler: Annotated[ExcelFileHandler, Depends(get_excel_handler)],
    request_data: SheetProcessingRequest
):
    await current_project.scan_and_update_files()
    processed_dir_path = Path(current_project.processed_dir)
    processed_dir_path.mkdir(parents=True, exist_ok=True)

    if not request_data.files: # request_data.files is List[FileProcessingInfo]
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No files specified for processing.")

    results_for_response: Dict[str, Dict[str, ProcessingResultDetail]] = {} # filename -> {sheetname: result}
    any_error_occurred = False
    successfully_processed_outputs_for_record = [] # For Project.add_processing_record

    # Verify requested files exist in project's input
    input_file_paths_from_project = {f['name']: f['path'] for f in current_project.files.get("input", [])}

    for file_to_process_info in request_data.files: # file_to_process_info is FileProcessingInfo
        requested_file_name = file_to_process_info.name

        if requested_file_name not in input_file_paths_from_project:
            results_for_response[requested_file_name] = {
                "file_level_error": ProcessingResultDetail(status="error", error=f"File '{requested_file_name}' not found in project's input directory.")
            }
            any_error_occurred = True
            continue

        actual_file_path = input_file_paths_from_project[requested_file_name]
        sheet_types_to_process = file_to_process_info.sheets # Dict[sheet_name, "ui" or "table"]

        try:
            # process_sheets returns Dict[sheet_name, Dict[status, output_path/message]]
            single_file_processing_results: Dict[str, Dict] = excel_handler.process_sheets(
                excel_file_path=actual_file_path,
                output_folder=str(processed_dir_path),
                sheet_types=sheet_types_to_process
            )

            # Convert results to Pydantic models for response
            sheet_results_pydantic: Dict[str, ProcessingResultDetail] = {}
            for sheet_name, result_data in single_file_processing_results.items():
                detail = ProcessingResultDetail(**result_data)
                sheet_results_pydantic[sheet_name] = detail
                if detail.status == "error":
                    any_error_occurred = True
                elif detail.status == "success" and detail.output_path:
                    # Add to project records and for processing history
                    output_file_name = Path(detail.output_path).name
                    await current_project.add_file_record(detail.output_path, "processed", output_file_name)
                    successfully_processed_outputs_for_record.append({"path": detail.output_path, "name": output_file_name})

            results_for_response[requested_file_name] = sheet_results_pydantic

        except Exception as e:
            results_for_response[requested_file_name] = {
                "file_level_error": ProcessingResultDetail(status="error", error=f"Unhandled exception processing file '{requested_file_name}': {str(e)}")
            }
            any_error_occurred = True
            import traceback
            traceback.print_exc()

    # Add a consolidated processing record
    input_files_for_record = [input_file_paths_from_project[f.name] for f in request_data.files if f.name in input_file_paths_from_project]
    await current_project.add_processing_record(
        operation="excel_sheet_processing",
        input_files=input_files_for_record,
        output_files=successfully_processed_outputs_for_record, # List of {"path": ..., "name": ...}
        details={"requested_processing": request_data.model_dump()} # Save the original request details
    )

    await current_project.save_metadata() # Save all changes (new files, history)
    # Note: add_file_record and add_processing_record already call _broadcast_update.
    # A final scan_and_update_files can ensure the broadcasted project state is fully current.
    await current_project.scan_and_update_files()


    return ProcessingResultResponse(
        status="error" if any_error_occurred else "success",
        project_id=current_project.id,
        results=results_for_response
    )