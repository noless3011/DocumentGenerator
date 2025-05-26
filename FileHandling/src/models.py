# models.py
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from datetime import datetime

class ProjectBase(BaseModel):
    name: str = Field("Untitled Project", description="Name of the project")
    base_dir: str = Field(..., description="Base directory where project folder will be created")

class ProjectCreateRequest(BaseModel):
    project_name: str = Field("Untitled Project", description="Name of the project")
    base_dir: str = Field(..., description="Base directory where project folder will be created")

class ProjectInfo(BaseModel):
    name: str
    id: str
    created_date: datetime
    modified_date: datetime
    description: str
    tags: List[str]
    directories: Dict[str, str]
    files: Dict[str, List[Dict[str, str]]] 
    processing_history: List[Dict[str, Any]]
class ProjectListItem(BaseModel):
    id: str
    name: str
    base_dir: str
    created_date: str # Keep as string for simple list display
    modified_date: str # Keep as string

class FileProcessingInfo(BaseModel):
    path: str
    name: str
    sheets: Dict[str, str]

class SheetProcessingRequest(BaseModel):
    files: List[FileProcessingInfo] = Field(..., description="List of files to process with their sheet settings")

class FileUploadResponse(BaseModel):
    status: str
    message: str
    project_id: str
    original_filename: str
    file_path: str

class SheetListResponse(BaseModel):
    status: str
    project_id: str
    sheets: List[str]

class ProcessingResultDetail(BaseModel):
    status: str
    output_path: Optional[str] = None
    error: Optional[str] = None

class ProcessingResultResponse(BaseModel):
    status: str
    project_id: str
    results: Dict[str, Dict[str, ProcessingResultDetail]] # filename -> {sheetname: result}

class GenerationResponse(BaseModel):
    status: str
    message: str
    name: str # Name of the generated file

class TextGenerationResponse(BaseModel):
    status: str
    message: str
    dir: str # Path to the generated file

class SimpleStatusResponse(BaseModel):
    status: str
    message: Optional[str] = None

class ErrorResponse(BaseModel):
    error: str