from pydantic import BaseModel, Field, Json
from typing import Dict, List, Optional, Any
from datetime import datetime

class ProjectBase(BaseModel):
    name: str = Field("Untitled Project", description="Name of the project")
    base_dir: str = Field(..., description="Base directory where project folder will be created")

class ProjectCreateRequest(BaseModel):
    project_name: str = Field("Untitled Project", description="Name of the project")
    base_dir: str = Field(..., description="Base directory where project folder will be created")

class ProjectFileEntry(BaseModel):
    path: str
    name: str
    type: str 
    added_date: str # ISO format string
    modified_date: str # ISO format string
    size: int # in bytes

class ProjectFiles(BaseModel):
    input: List[ProjectFileEntry] = []
    processed: List[ProjectFileEntry] = []
    output: List[ProjectFileEntry] = []

class ProjectRequirementsInfo(BaseModel):
    input_description: str = ""
    output_description: str = ""
    features: Dict[str, str] = {}
    further_requirements: str = ""

class ProjectInfo(BaseModel): # Used for /details, /load, /create responses
    name: str
    id: str
    created_date: datetime
    modified_date: datetime
    description: str
    tags: List[str]
    directories: Dict[str, str]
    files: ProjectFiles # Changed from Dict[str, List[Dict[str,str]]]
    processing_history: List[Dict[str, Any]]
    requirements: ProjectRequirementsInfo # Added
    tech_stack: str # Added
    # Optional summary fields from context for quick overview
    # generated_text_docs_summary: Optional[List[str]] = None
    # generated_diagrams_summary: Optional[List[str]] = None
    # has_prototype_code: Optional[bool] = None


class ProjectListItem(BaseModel): # Used for /list response
    id: str
    name: str
    base_dir: str
    project_dir_name: str # Added: actual name of the project folder
    created_date: str
    modified_date: str

class FileProcessingInfo(BaseModel): # For sheet processing request
    path: str # Relative or absolute path recognizable by server; prefer name for lookup
    name: str # Filename, used to look up in project's input files
    sheets: Dict[str, str] # sheet_name -> "ui" or "table"

class SheetProcessingRequest(BaseModel):
    files: List[FileProcessingInfo] = Field(..., description="List of files to process with their sheet settings")

class FileUploadResponse(BaseModel):
    status: str
    message: str
    project_id: str
    original_filename: str
    file_path: str # Actual path where file was saved (can include unique suffix)
    saved_filename: Optional[str] = None # The name it was saved as (if different from original)
    file_type: Optional[str] = None # Type of file: "excel", "source", etc.
    folder: Optional[str] = None # Where it was uploaded: "input", "processed"


class SheetListResponse(BaseModel): # For /get-sheets response
    status: str
    project_id: str
    sheets_per_file: Optional[Dict[str, List[str]]] = None # filename -> list of sheets
    all_unique_sheets: List[str] # Flattened unique list of all sheets from all files
    errors: Optional[Dict[str, str]] = None # filename -> error message, if any

class ProcessingResultDetail(BaseModel): # Part of /process-excel response
    status: str # "success" or "error"
    type: Optional[str] = None # "table" or "ui", if successful
    output_path: Optional[str] = None
    message: Optional[str] = None # For errors or additional info
    error: Optional[str] = None # Legacy, prefer message

    # Make Pydantic tolerant of extra fields from ExcelFileHandler if any
    class Config:
        extra = 'ignore'


class ProcessingResultResponse(BaseModel): # For /process-excel response
    status: str # Overall status: "success" if all OK, "partial" if some errors, "error" if all failed
    project_id: str
    results: Dict[str, Dict[str, ProcessingResultDetail]] # filename -> {sheetname_or_error_key: result_detail}

class SheetPreviewResponse(BaseModel): # For /preview-sheet response
    headers: List[str]
    data: List[List[Any]]

class SheetPreviewRequest(BaseModel): # For /preview-sheet request
    filePath: str
    sheetName: str

class UnifiedFileUploadRequest(BaseModel):
    file_type: str = Field(..., description="Type of file: 'excel' or 'source'")
    target_folder: str = Field(..., description="Target folder: 'input' or 'processed'")

class FileListResponse(BaseModel):
    status: str
    project_id: str
    input_files: List[ProjectFileEntry] = []
    processed_files: List[ProjectFileEntry] = []
    errors: Optional[Dict[str, str]] = None

class SourceFilePreviewRequest(BaseModel):
    file_path: str
    file_name: str
    folder: str = Field(default="processed", description="Folder where file is located")

class SourceFilePreviewResponse(BaseModel):
    status: str
    file_name: str
    file_type: str
    content: Optional[str] = None  # For text files
    url: Optional[str] = None      # For image files
    size: Optional[int] = None
    error: Optional[str] = None

# Generic responses
class SimpleStatusResponse(BaseModel):
    status: str
    message: Optional[str] = None

class ErrorResponse(BaseModel):
    detail: str # Changed from 'error' to match FastAPI's default for HTTPException

# For Chat WebSocket messages (example structures, can be expanded)
class WebSocketMessage(BaseModel):
    type: str
    payload: Any

class ChatMessagePayload(BaseModel):
    text: str

class CommandMessagePayload(BaseModel):
    name: str
    params: Optional[Dict[str, Any]] = None

class FileContentPayload(BaseModel):
    filename: str
    content: str
    lang: Optional[str] = None # e.g., "markdown", "json", "html"
