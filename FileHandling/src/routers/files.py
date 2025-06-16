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
    FileProcessingInfo, SheetPreviewResponse, SheetPreviewRequest, # Added imports for preview
    UnifiedFileUploadRequest, FileListResponse, SourceFilePreviewRequest, SourceFilePreviewResponse
)
from dependencies import get_current_project, get_excel_handler

router = APIRouter(
    prefix="/files",
    tags=["Files"],
    responses={404: {"description": "Not found", "model": ErrorResponse}},
)

def allowed_file(filename: str):
    
    return '.' in filename and '.' + filename.rsplit('.', 1)[1].lower() in settings.ALLOWED_UPLOAD_EXTENSIONS

def allowed_source_file(filename: str):
    return '.' in filename and '.' + filename.rsplit('.', 1)[1].lower() in settings.ALLOWED_SOURCE_EXTENSIONS

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
        # If save fails, attempt to clean up if file was partially created
        if destination_path.exists():
            try:
                os.remove(destination_path)
            except OSError:
                pass # Ignore error during cleanup
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Could not save file content: {e}")
    finally:
        await file.close()

    # Now that file is saved, add it to project records
    added_successfully = await current_project.add_file(str(destination_path), "input", final_filename)
    if not added_successfully:
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

@router.post("/upload-source", response_model=FileUploadResponse, status_code=status.HTTP_201_CREATED, summary="Upload a source file to processed folder")
async def upload_source(
    current_project: Annotated[Project, Depends(get_current_project)],
    file: UploadFile = File(...)
):
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No file selected")

    if not allowed_source_file(file.filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type for '{file.filename}'. Allowed types are: {', '.join(settings.ALLOWED_SOURCE_EXTENSIONS)}"
        )

    original_filename = secure_filename(file.filename)

    processed_dir_path = Path(current_project.processed_dir)
    processed_dir_path.mkdir(parents=True, exist_ok=True) # Ensure processed dir exists

    # Determine unique file path
    temp_filename = original_filename
    destination_path = processed_dir_path / temp_filename
    counter = 1
    while destination_path.exists():
        name, ext = os.path.splitext(original_filename)
        temp_filename = f"{name}_{counter}{ext}"
        destination_path = processed_dir_path / temp_filename
        counter += 1

    final_filename = temp_filename # This is the name it will be saved as

    try:
        with open(destination_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        # If save fails, attempt to clean up if file was partially created
        if destination_path.exists():
            try:
                os.remove(destination_path)
            except OSError:
                pass # Ignore error during cleanup
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Could not save file content: {e}")
    finally:
        await file.close()

    # Now that file is saved, add it to project records
    added_successfully = await current_project.add_file(str(destination_path), "processed", final_filename)
    if not added_successfully:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"File '{final_filename}' saved but failed to record in project."
        )

    await current_project.save_metadata() # Persist changes to project files list

    return FileUploadResponse(
        status="success",
        message="Source file uploaded successfully to processed folder",
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


@router.post("/preview-sheet", response_model=SheetPreviewResponse, summary="Get preview data from a specific Excel sheet")
async def preview_sheet(
    current_project: Annotated[Project, Depends(get_current_project)],
    excel_handler: Annotated[ExcelFileHandler, Depends(get_excel_handler)],
    request_data: SheetPreviewRequest
):
    """Get preview data (headers and first ~100 rows) from a specific sheet in an Excel file."""
    
    # Validate that the file path exists
    if not os.path.exists(request_data.filePath):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File not found: {request_data.filePath}"
        )
    
    # Get preview data from the Excel handler
    preview_result = excel_handler.get_sheet_preview_data(
        excel_file_path=request_data.filePath,
        sheet_name=request_data.sheetName,
        max_rows=100
    )
    
    # Check for errors in the result
    if "error" in preview_result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=preview_result["error"]
        )
    
    return SheetPreviewResponse(
        headers=preview_result.get("headers", []),
        data=preview_result.get("data", [])
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
    output_files = []  # For tracking processed files
    
    for file_info in request_data.files:
        if not file_info.path or not file_info.name:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Both path and name must be provided for each file.")

        # Validate file exists in project
        files_in_folder = current_project.files.get("input", [])
        target_file = None
        
        for file_entry in files_in_folder:
            if file_entry['path'] == file_info.path or file_entry['name'] == file_info.name:
                target_file = file_entry
                break
        
        if not target_file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"File '{file_info.name}' not found in input folder"
            )

        try:
            result = excel_handler.process_sheets(
                excel_file_path=file_info.path,
                output_folder=str(processed_dir_path),
                sheet_types=file_info.sheets,  # This should be a dict of sheet_name -> "ui" or "table"
            )
            
            # Initialize file results if not exists
            if file_info.name not in results_for_response:
                results_for_response[file_info.name] = {}
            
            for sheet_name, detail in result.items():
                if detail.status == "success":
                    results_for_response[file_info.name][sheet_name] = ProcessingResultDetail(
                        status=detail.status,
                        output_path=detail.output_path,
                        type=detail.type
                    )
                    # Track output file for project metadata
                    if detail.output_path:
                        output_files.append({
                            "path": detail.output_path,
                            "name": os.path.basename(detail.output_path)
                        })
                else:
                    results_for_response[file_info.name][sheet_name] = ProcessingResultDetail(
                        status=detail.status,
                        message=detail.message,
                    )
        
        except FileNotFoundError:
            results_for_response.setdefault(file_info.name, {})[f"file_error"] = ProcessingResultDetail(
                status="error",
                error=f"File not found: {file_info.path}"
            )
        except Exception as e:
            results_for_response.setdefault(file_info.name, {})[f"file_error"] = ProcessingResultDetail(
                status="error",
                error=str(e)
            )    
    # Record processing in project history
    if output_files:
        await current_project.add_processing_record(
            operation="excel_sheet_processing",
            input_files=[file_info.path for file_info in request_data.files],
            output_files=output_files,
            details={"requested_processing": request_data.dict()}
        )
    
    # Determine overall status
    overall_status = "success"
    for file_results in results_for_response.values():
        for result in file_results.values():
            if result.status == "error":
                overall_status = "partial" if overall_status == "success" else "error"
                break
    
    return ProcessingResultResponse(
        status=overall_status,
        project_id=current_project.id,
        results=results_for_response
    )




# Unified file handling endpoints

@router.post("/upload-unified", response_model=FileUploadResponse, status_code=status.HTTP_201_CREATED, summary="Upload any supported file type")
async def upload_unified(
    current_project: Annotated[Project, Depends(get_current_project)],
    file: UploadFile = File(...),
    file_type: str = "auto",  # "excel", "source", or "auto" to detect
    target_folder: str = "auto"  # "input", "processed", or "auto" to decide based on file type
):
    """Upload a file to the appropriate folder based on its type."""
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No file selected")

    original_filename = secure_filename(file.filename)
    file_extension = '.' + original_filename.split('.')[-1].lower()
    # Auto-detect file type if not specified
    if file_type == "auto":
        if file_extension in ['.xlsx', '.xls']:
            file_type = "excel"
        elif file_extension in settings.ALLOWED_SOURCE_EXTENSIONS:
            file_type = "source"
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type: {file_extension}"
            )

    # Auto-select target folder if not specified
    if target_folder == "auto":
        target_folder = "input" if file_type == "excel" else "processed"

    # Validate file type based on intended use
    if file_type == "excel" and not allowed_file(original_filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid Excel file type for '{original_filename}'. Allowed types are: {', '.join(settings.ALLOWED_UPLOAD_EXTENSIONS)}"
        )
    elif file_type == "source" and not allowed_source_file(original_filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid source file type for '{original_filename}'. Allowed types are: {', '.join(settings.ALLOWED_SOURCE_EXTENSIONS)}"
        )

    # Determine target directory
    if target_folder == "input":
        target_dir_path = Path(current_project.input_dir)
    elif target_folder == "processed":
        target_dir_path = Path(current_project.processed_dir)
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid target folder: {target_folder}")

    target_dir_path.mkdir(parents=True, exist_ok=True)

    # Handle file naming conflicts
    temp_filename = original_filename
    destination_path = target_dir_path / temp_filename
    counter = 1
    while destination_path.exists():
        name, ext = os.path.splitext(original_filename)
        temp_filename = f"{name}_{counter}{ext}"
        destination_path = target_dir_path / temp_filename
        counter += 1

    final_filename = temp_filename

    try:
        with open(destination_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        if destination_path.exists():
            try:
                os.remove(destination_path)
            except OSError:
                pass
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Could not save file content: {e}")
    finally:
        await file.close()

    # Add file to project records
    added_successfully = await current_project.add_file(str(destination_path), target_folder, final_filename)
    if not added_successfully:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"File '{final_filename}' saved but failed to record in project."
        )

    await current_project.save_metadata()

    return FileUploadResponse(
        status="success",
        message=f"{file_type.title()} file uploaded successfully to {target_folder} folder",
        project_id=current_project.id,
        original_filename=original_filename,
        file_path=str(destination_path),
        saved_filename=final_filename,
        file_type=file_type,
        folder=target_folder
    )


@router.get("/list-all", response_model=FileListResponse, summary="Get all files in project")
async def list_all_files(
    current_project: Annotated[Project, Depends(get_current_project)]
):
    """Get all files from both input and processed folders."""
    await current_project.scan_and_update_files()

    input_files = current_project.files["input"]
    processed_files = current_project.files["processed"]
    print(f"Input files: {input_files}")
    print(f"Processed files: {processed_files}")
    return FileListResponse(
        status="success",
        project_id=current_project.id,
        input_files=input_files,
        processed_files=processed_files
    )


@router.post("/preview-source", response_model=SourceFilePreviewResponse, summary="Preview a source file")
async def preview_source_file(
    current_project: Annotated[Project, Depends(get_current_project)],
    request_data: SourceFilePreviewRequest
):
    """Get preview content for source files (text content for txt/csv, metadata for images)."""
    
    # Validate file exists in project
    files_in_folder = current_project.files.get(request_data.folder, [])
    target_file = None
    
    for file_entry in files_in_folder:
        if file_entry['name'] == request_data.file_name:
            target_file = file_entry
            break
    
    if not target_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File '{request_data.file_name}' not found in {request_data.folder} folder"
        )

    file_path = target_file['path']
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File not found on disk: {file_path}"
        )

    file_extension = '.' + request_data.file_name.split('.')[-1].lower()
    file_type = file_extension[1:]  # Remove the dot

    try:
        # Handle text files
        if file_extension in ['.txt', '.csv']:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                # Limit content size for preview (first 1000 characters)
                if len(content) > 1000:
                    content = content[:1000] + "\n... (truncated)"
            
            return SourceFilePreviewResponse(
                status="success",
                file_name=request_data.file_name,
                file_type=file_type,
                content=content,
                size=target_file.get('size', 0)
            )
        
        # Handle image files
        elif file_extension in ['.png', '.jpg', '.jpeg']:
            # For images, we'll just return metadata for now
            # In a full implementation, you might want to serve the image through a separate endpoint
            return SourceFilePreviewResponse(
                status="success",
                file_name=request_data.file_name,
                file_type=file_type,
                url=f"/files/serve/{request_data.folder}/{request_data.file_name}",  # Hypothetical serve endpoint
                size=target_file.get('size', 0)
            )
        
        else:
            return SourceFilePreviewResponse(
                status="error",
                file_name=request_data.file_name,
                file_type=file_type,
                error=f"Unsupported file type for preview: {file_extension}"
            )

    except Exception as e:
        return SourceFilePreviewResponse(
            status="error",
            file_name=request_data.file_name,
            file_type=file_type,
            error=f"Error reading file: {str(e)}"
        )


@router.delete("/delete/{filetype}/{filename}", summary="Delete a file from project")
async def delete_file(
    filetype: str,
    filename: str,
    current_project: Annotated[Project, Depends(get_current_project)]
):
    """Delete a file from the specified folder (input or processed)."""
    if filetype not in ["input", "processed", "output"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Folder must be 'input' or 'processed' or 'output'")

    # Find the file in project records
    files_in_folder = current_project.files.get(filetype, [])
    target_file = None
    
    for file_entry in files_in_folder:
        if file_entry['name'] == filename:
            target_file = file_entry
            break
    
    if not target_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File '{filename}' not found in {filetype} folder"
        )

    file_path = target_file['path']
    
    try:
        # Remove physical file
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # Remove from project records
        await current_project.delete_file(file_name=filename, file_type=filetype)
        await current_project.save_metadata()
        
        return {"status": "success", "message": f"File '{filename}' deleted successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting file: {str(e)}"
        )
    
