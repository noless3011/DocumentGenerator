# routers/projects.py

import os
import time
from typing import List, Annotated, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, status, Body, WebSocket, WebSocketDisconnect
from pathlib import Path

from datetime import datetime
from utils.Project import Project
from utils import RegistryHandler
from utils.WebSocketManager import manager # Added import
# Updated import: Removed ProjectDirectories
from models import ProjectCreateRequest, ProjectInfo, ProjectListItem, SimpleStatusResponse, ErrorResponse
from dependencies import get_app_state, get_agent_instance, get_optional_current_project

router = APIRouter(
    prefix="/projects",
    tags=["Projects"],
    responses={404: {"description": "Not found", "model": ErrorResponse}},
)

# WebSocket endpoint for project updates
@router.websocket("/ws/{project_id}")
async def websocket_endpoint(websocket: WebSocket, project_id: str):
    await manager.connect(websocket, project_id)
    try:
        while True:
            # Keep the connection alive, or handle client messages if needed
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, project_id)
        print(f"WebSocket disconnected for project {project_id}")
    except Exception as e:
        print(f"Error in WebSocket for project {project_id}: {e}")
        manager.disconnect(websocket, project_id) # Ensure disconnect on other errors


@router.get("/list", response_model=List[ProjectListItem], summary="List all projects")
async def list_projects():
    """Lists all projects recorded in the registry."""
    projects_data = RegistryHandler.load_projects_registry()
    return [ProjectListItem(**p) for p in projects_data]


@router.post("/create", response_model=ProjectInfo, status_code=status.HTTP_201_CREATED, summary="Create a new project")
async def create_project(
    request_data: ProjectCreateRequest,
    app_state: Annotated[Dict, Depends(get_app_state)]
):
    """
    Creates a new project folder structure and metadata file,
    sets it as the current project, and adds it to the registry.
    """
    base_dir = Path(request_data.base_dir)
    project_name = request_data.project_name

    if not base_dir.exists():
        try:
            base_dir.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Could not create base directory: {e}")
    elif not base_dir.is_dir():
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Base directory path exists but is not a directory: {base_dir}")


    project = Project(name=project_name, base_dir=str(base_dir))
    project.create_directory_structure()
    await project.save_metadata()

    app_state["current_project"] = project
    print(f"Project '{project.name}' ({project.id}) created and set as current.")

    projects = RegistryHandler.load_projects_registry()
    projects.append({
        "id": project.id,
        "name": project.name,
        "base_dir": str(base_dir),
        "created_date": project.created_date.isoformat(),
        "modified_date": project.modified_date.isoformat()
    })
    RegistryHandler.save_projects_registry(projects)

    return ProjectInfo(
        id=project.id,
        name=project.name,
        created_date=project.created_date,
        modified_date=project.modified_date,
        description=getattr(project, 'description', ""), # Provide empty string if not set
        tags=getattr(project, 'tags', []), # Provide empty list if not set
        directories={
            "base": str(project.base_dir),
            "project": str(project.project_dir),
            "input_dir": str(project.input_dir),
            "processed_dir": str(project.processed_dir),
            "output_dir": str(project.output_dir)
        },
        files=project.files if hasattr(project, 'files') else {}, # Ensure files is at least an empty dict
        processing_history=getattr(project, 'processing_history', []) # Provide empty list if not set
    )

@router.post("/create-output", response_model=SimpleStatusResponse, summary="Add a new output file")
async def add_output_file(
    file_name: str = Body(..., embed=True),
    current_project: Optional[Project] = Depends(get_optional_current_project)
):
    """Adds a new output file to the current project."""
    if not current_project:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active project. Please create or load a project first.")
    print("Adding output file to project:", file_name)
    # Assuming the file is created or processed and now needs to be added
    await current_project.create_file(file_name, file_type="output")
    await current_project.save_metadata()
    await manager.broadcast(current_project.id, {"message": "Output file added", "file_name": file_name, "project_id": current_project.id})


    return SimpleStatusResponse(status="success", message=f"Output file '{file_name}' added successfully.")

@router.post("/remove-output", response_model=SimpleStatusResponse, summary="Remove an output file")
async def remove_output_file(
    file_name: str = Body(..., embed=True, description="The name of the output file to remove."),
    current_project: Optional[Project] = Depends(get_optional_current_project)
):
    """Removes an output file from the current project."""
    if not current_project:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active project. Please create or load a project first.")

    print(f"Attempting to remove output file: {file_name} from project {current_project.id}")
    success = await current_project.delete_file(file_name, file_type="output")
    
    if not success:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to delete output file '{file_name}'. File may not exist or an error occurred.")

    await current_project.save_metadata()
    await manager.broadcast(current_project.id, {"message": "Output file removed", "file_name": file_name, "project_id": current_project.id, "project_data": current_project.to_dict()})

    return SimpleStatusResponse(status="success", message=f"Output file '{file_name}' removed successfully.")

@router.post("/rename-output", response_model=SimpleStatusResponse, summary="Rename an output file")
async def rename_output_file(
    old_file_name: str = Body(..., description="The current name of the output file."),
    new_file_name: str = Body(..., description="The new name for the output file."),
    current_project: Optional[Project] = Depends(get_optional_current_project)
):
    """Renames an output file in the current project."""
    if not current_project:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active project. Please create or load a project first.")

    print(f"Attempting to rename output file: {old_file_name} to {new_file_name} in project {current_project.id}")
    success = await current_project.rename_file(old_file_name, new_file_name, file_type="output")

    if not success:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to rename output file '{old_file_name}' to '{new_file_name}'. Check if the file exists or if the new name is valid.")

    await current_project.save_metadata()
    await manager.broadcast(current_project.id, {"message": "Output file renamed", "old_file_name": old_file_name, "new_file_name": new_file_name, "project_id": current_project.id, "project_data": current_project.to_dict()})

    return SimpleStatusResponse(status="success", message=f"Output file '{old_file_name}' renamed to '{new_file_name}' successfully.")

@router.post("/load/{project_id}", response_model=ProjectInfo, summary="Load an existing project")
async def load_project(
    project_id: str,
    app_state: Annotated[Dict, Depends(get_app_state)]
):
    """Loads project metadata and sets it as the current project."""
    projects = RegistryHandler.load_projects_registry()
    project_info_from_registry = next((p for p in projects if p["id"] == project_id), None)

    if not project_info_from_registry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found in registry")

    if app_state.get("current_project") and app_state["current_project"].id != project_id:
         await close_project_internal(app_state)

    base_dir_str = project_info_from_registry["base_dir"]
    project_name_from_registry = project_info_from_registry["name"]

    project_directory_name = f"{project_name_from_registry}_{project_id}"
    project_directory_path = Path(base_dir_str) / project_directory_name
    
    metadata_file_path = project_directory_path / "project_metadata.json"

    if not metadata_file_path.exists() or not metadata_file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project metadata file not found at expected path: {metadata_file_path}"
        )

    try:
        loaded_project = Project.load_from_metadata(str(metadata_file_path))
        # Update metadata to match actual folder structure
        await loaded_project.scan_and_update_files()
        await loaded_project.save_metadata()
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error loading project from {metadata_file_path}: {e}")

    if not loaded_project or loaded_project.id != project_id:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to load correct project or ID mismatch after loading from {metadata_file_path}.")

    app_state["current_project"] = loaded_project
    print(f"Project '{loaded_project.name}' ({loaded_project.id}) loaded and set as current.")
    await manager.broadcast(loaded_project.id, {"message": "Project loaded", "project_data": loaded_project.to_dict() if hasattr(loaded_project, 'to_dict') else {"id": loaded_project.id, "name": loaded_project.name}})

    return ProjectInfo(
        id=loaded_project.id,
        name=loaded_project.name,
        created_date=loaded_project.created_date,
        modified_date=loaded_project.modified_date,
        description=getattr(loaded_project, 'description', ""),
        tags=getattr(loaded_project, 'tags', []),
        directories={
            "base": str(loaded_project.base_dir),
            "project": str(loaded_project.project_dir),
            "input_dir": str(loaded_project.input_dir),
            "processed_dir": str(loaded_project.processed_dir),
            "output_dir": str(loaded_project.output_dir)
        },
        files=loaded_project.files if hasattr(loaded_project, 'files') else {},
        processing_history=getattr(loaded_project, 'processing_history', [])
    )




@router.post("/close", response_model=SimpleStatusResponse, summary="Close the current project")
async def close_project(
    app_state: Annotated[Dict, Depends(get_app_state)]
):
    """Saves metadata, updates registry, and clears the current project state."""
    await close_project_internal(app_state)
    return SimpleStatusResponse(status="success", message="Project closed successfully")


@router.get("/details", response_model=ProjectInfo, summary="Get details of the current project")
async def get_project_details(
    current_project: Annotated[Optional[Project], Depends(get_optional_current_project)]
):
    """Returns detailed information about the currently active project."""
    if not current_project:
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active project. Please create or load a project first."
         )
    await current_project.scan_and_update_files()

    return ProjectInfo(
        id=current_project.id,
        name=current_project.name,
        created_date=current_project.created_date,
        modified_date=current_project.modified_date,
        description=getattr(current_project, 'description', ""),
        tags=getattr(current_project, 'tags', []),
        directories={
            "base": str(current_project.base_dir),
            "project": str(current_project.project_dir),
            "input_dir": str(current_project.input_dir),
            "processed_dir": str(current_project.processed_dir),
            "output_dir": str(current_project.output_dir)
        },
        files=current_project.files if hasattr(current_project, 'files') else {},
        processing_history=getattr(current_project, 'processing_history', [])
    )


# --- Internal Helper Functions ---
async def close_project_internal(app_state: dict):
    """Internal logic to close the project, reusable by other endpoints."""
    project_to_close: Optional[Project] = app_state.get("current_project")

    if not project_to_close:
        print("No project was active to close.")
        return

    print(f"Closing project: {project_to_close.name} ({project_to_close.id})")
    project_to_close.modified_date = datetime.now()
    await project_to_close.save_metadata()

    projects = RegistryHandler.load_projects_registry()
    for p in projects:
        if p["id"] == project_to_close.id:
            p["modified_date"] = project_to_close.modified_date.isoformat()
            RegistryHandler.save_projects_registry(projects)
            break

    app_state["current_project"] = None
    print("Project closed and state cleared.")
