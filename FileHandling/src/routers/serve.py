from fastapi import APIRouter, HTTPException, Response, Depends
from fastapi.responses import HTMLResponse, FileResponse
from pydantic import BaseModel
from typing import Optional
import os
from pathlib import Path
from dependencies import get_current_project

router = APIRouter()

class ServeFileRequest(BaseModel):
    filePath: str

@router.get("/serve/html/{project_id}/{filename}", tags=["Serve"], summary="Serve HTML File", response_class=HTMLResponse)
async def serve_html_file(project_id: str, filename: str, current_project = Depends(get_current_project)):
    """
    Serve an HTML file from a project's output directory.
    """
    try:
        base_path = current_project.output_dir 
        file_path = base_path +"/"+ filename
        file_path = Path(file_path)
        base_path = Path(base_path)
        
        resolved_path = file_path.resolve()
        resolved_base = base_path.resolve()
        if not str(resolved_path).startswith(str(resolved_base)):
            raise HTTPException(status_code=403, detail="Access denied")

        # Check if file exists
        if not file_path.exists():
            raise HTTPException(status_code=404, detail=f"File not found: {filename}")

        if not file_path.is_file():
            raise HTTPException(status_code=400, detail="Path is not a file")

        # Read the HTML content
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()
        return HTMLResponse(content=content)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error serving HTML file: {str(e)}")

@router.get("/serve/projects/{project_id}/files", tags=["Serve"], summary="List Project Files")
async def list_project_files(project_id: str, current_project = Depends(get_current_project)):
    """
    List all HTML files available in a project's output directory.
    """
    try:
        # Get the output path from the current project
        base_path = Path(current_project.project_dir) / "output"
        
        if not base_path.exists():
            raise HTTPException(status_code=404, detail=f"Project not found: {project_id}")
        
        html_files = []
        for file_path in base_path.glob("*.html"):
            html_files.append({
                "filename": file_path.name,
                "path": str(file_path.relative_to(base_path)),
                "size": file_path.stat().st_size,
                "url": f"/serve/html/{project_id}/{file_path.name}"
            })
        
        return {
            "project_id": project_id,
            "html_files": html_files,
            "count": len(html_files)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing project files: {str(e)}")

@router.post("/serve/file", tags=["Serve"], summary="Serve Any File", response_class=FileResponse)
async def serve_any_file(request: ServeFileRequest):
    """
    Serve any file by providing its full path.
    """
    try:
        file_path = Path(request.filePath)
        
        # Security check - ensure the file exists and is readable
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        if not file_path.is_file():
            raise HTTPException(status_code=400, detail="Path is not a file")
        
        # Determine content type based on file extension
        content_type = "text/html" if file_path.suffix.lower() in ['.html', '.htm'] else "text/plain"
        
        return FileResponse(
            path=str(file_path),
            media_type=content_type,
            filename=file_path.name
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error serving file: {str(e)}")

@router.get("/serve/processed/{filename}", tags=["Serve"], summary="Serve File from Processed Folder")
async def serve_processed_file(filename: str, current_project = Depends(get_current_project)):
    """
    Serve a file from the current project's processed directory.
    """
    try:
        # Get the processed path from the current project
        processed_path = Path(current_project.processed_dir)
        file_path = processed_path / filename
        
        # Security check - ensure the file is within the allowed directory
        resolved_path = file_path.resolve()
        resolved_base = processed_path.resolve()
        
        if not str(resolved_path).startswith(str(resolved_base)):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Check if file exists
        if not file_path.exists():
            raise HTTPException(status_code=404, detail=f"File not found: {filename}")
        
        if not file_path.is_file():
            raise HTTPException(status_code=400, detail="Path is not a file")
        
        # Determine content type based on file extension
        file_extension = file_path.suffix.lower()
        if file_extension in ['.png', '.jpg', '.jpeg']:
            media_type = f"image/{file_extension[1:]}"  # Remove the dot
            if file_extension == '.jpg':
                media_type = "image/jpeg"
        elif file_extension in ['.txt', '.csv']:
            media_type = "text/plain"
        elif file_extension in ['.html', '.htm']:
            media_type = "text/html"
        else:
            media_type = "application/octet-stream"
        
        return FileResponse(
            path=str(file_path),
            media_type=media_type,
            filename=file_path.name
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error serving processed file: {str(e)}")
