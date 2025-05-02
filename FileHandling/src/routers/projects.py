# routers/projects.py

import os
import time
from typing import List, Annotated, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, status, Body
from pathlib import Path

from datetime import datetime
from utils.Project import Project
from utils import RegistryHandler # Import the module
from models import ProjectCreateRequest, ProjectInfo, ProjectListItem, SimpleStatusResponse, ErrorResponse
from dependencies import get_app_state, get_agent_instance, get_optional_current_project

router = APIRouter(
    prefix="/projects",
    tags=["Projects"],
    responses={404: {"description": "Not found", "model": ErrorResponse}},
)

@router.get("/list", response_model=List[ProjectListItem], summary="List all projects")
async def list_projects():
    """Lists all projects recorded in the registry."""
    projects_data = RegistryHandler.load_projects_registry()
    # Convert datetime objects back to isoformat strings if they were stored as datetime
    # For now, assuming they are stored as strings as per original load/save
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


    project = Project(name=project_name, base_dir=str(base_dir)) # Project expects str
    project.create_directory_structure()
    project.save_metadata()

    # Update app state
    app_state["current_project"] = project
    print(f"Project '{project.name}' ({project.id}) created and set as current.")


    # Update projects registry
    projects = RegistryHandler.load_projects_registry()
    projects.append({
        "id": project.id,
        "name": project.name,
        "base_dir": str(base_dir), # Store as string
        "created_date": project.created_date.isoformat(),
        "modified_date": project.modified_date.isoformat()
    })
    RegistryHandler.save_projects_registry(projects)

    return ProjectInfo(
        id=project.id,
        name=project.name,
        base_dir=str(project.base_dir),
        created_date=project.created_date,
        modified_date=project.modified_date,
        project_dir=str(project.project_dir),
        files=project.files
    )


@router.post("/load/{project_id}", response_model=ProjectInfo, summary="Load an existing project")
async def load_project(
    project_id: str,
    app_state: Annotated[Dict, Depends(get_app_state)]
):
    """Loads project metadata and sets it as the current project."""
    projects = RegistryHandler.load_projects_registry()
    project_info = next((p for p in projects if p["id"] == project_id), None)

    if not project_info:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found in registry")

    # Close existing project if any
    if app_state.get("current_project") and app_state["current_project"].id != project_id:
         await close_project_internal(app_state) # Use internal helper

    base_dir = Path(project_info["base_dir"])
    project_dir_suffix = f"_{project_id}"
    loaded_project = None

    # Search for the project directory within the base directory
    if base_dir.exists() and base_dir.is_dir():
        for item in base_dir.iterdir():
            if item.is_dir() and item.name.endswith(project_dir_suffix):
                metadata_path = item / "project_metadata.json"
                if metadata_path.exists():
                    try:
                        project = Project.load_from_metadata(str(metadata_path))
                        if project:
                            loaded_project = project
                            break # Found the project
                    except Exception as e:
                         print(f"Error loading project from {metadata_path}: {e}")
                         # Continue searching in case of multiple matches (though unlikely)


    if not loaded_project:
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Project files not found in expected location under {base_dir}")

    # Update app state
    app_state["current_project"] = loaded_project
    print(f"Project '{loaded_project.name}' ({loaded_project.id}) loaded and set as current.")

    return ProjectInfo(
        id=loaded_project.id,
        name=loaded_project.name,
        base_dir=str(loaded_project.base_dir),
        created_date=loaded_project.created_date,
        modified_date=loaded_project.modified_date,
        project_dir=str(loaded_project.project_dir),
        files=loaded_project.files
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
    current_project: Annotated[Project, Depends(get_optional_current_project)] # Use optional here
):
    """Returns detailed information about the currently active project."""
    if not current_project:
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active project. Please create or load a project first."
         )
    # Ensure files are up-to-date before returning details
    current_project.scan_and_update_files() # Good place to refresh
    return ProjectInfo(
        id=current_project.id,
        name=current_project.name,
        base_dir=str(current_project.base_dir),
        created_date=current_project.created_date,
        modified_date=current_project.modified_date, # Reflects last save/load
        project_dir=str(current_project.project_dir),
        files=current_project.files
    )


# --- Internal Helper Functions ---
# TODO: remove the GeneralAgent parameter because it has been deleted
async def close_project_internal(app_state: dict):
    """Internal logic to close the project, reusable by other endpoints."""
    project_to_close: Optional[Project] = app_state.get("current_project")

    if not project_to_close:
        print("No project was active to close.")
        return # Nothing to do

    print(f"Closing project: {project_to_close.name} ({project_to_close.id})")
    # Save the current project metadata
    project_to_close.modified_date = datetime.now() # Update modified time on close
    project_to_close.save_metadata()

    # Update project in registry
    projects = RegistryHandler.load_projects_registry()
    for p in projects:
        if p["id"] == project_to_close.id:
            p["modified_date"] = project_to_close.modified_date.isoformat()
            RegistryHandler.save_projects_registry(projects)
            break

    # Clear the current project state and update generator
    app_state["current_project"] = None
    print("Project closed and state cleared.")