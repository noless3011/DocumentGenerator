import os
import datetime
import json
from fastapi import File
from typing import List, Dict, Optional, Any
from .WebSocketManager import project_socket_manager
from .Context import Context # Import the new Context class

class Project:
    """
    Class representing a document generation project,
    containing metadata and directory structures.
    """

    def __init__(self, name: str, base_dir: str = None):
        """
        Initialize a new project.

        Args:
            name: The name of the project
            base_dir: Base directory for the project (if None, creates in current directory)
        """
        self.name = name
        self.created_date = datetime.datetime.now()
        self.modified_date = self.created_date
        self.id = self._generate_id()

        self.base_dir = os.path.abspath(base_dir) if base_dir else os.getcwd()
        self.project_dir = os.path.join(self.base_dir, f"{self.name.replace(' ', '_')}_{self.id}") # Sanitize name for folder

        self.input_dir = os.path.join(self.project_dir, "input")
        self.processed_dir = os.path.join(self.project_dir, "processed")
        self.output_dir = os.path.join(self.project_dir, "output")

        self.description = ""
        self.tags = []
        self.files = {
            "input": [],
            "processed": [],
            "output": []
        }
        self.processing_history = []

        # Initialize Context
        self.context = Context(self)

    async def _broadcast_update(self):
        """Broadcasts the current project state."""
        if self.id:
            await project_socket_manager.broadcast(self.id, self.to_dict())

    def to_dict(self) -> Dict[str, Any]:
        """Converts project object to a dictionary for broadcasting and saving."""
        return {
            "name": self.name,
            "id": self.id,
            "created_date": self.created_date.isoformat(),
            "modified_date": self.modified_date.isoformat(),
            "description": self.description,
            "tags": self.tags,
            "directories": {
                "base": self.base_dir,
                "project": self.project_dir,
                "input": self.input_dir,
                "processed": self.processed_dir,
                "output": self.output_dir
            },
            "files": self.files,
            "processing_history": self.processing_history,
            # Add context-related fields
            "requirements": {
                "input_description": self.context.requirements.input_description,
                "output_description": self.context.requirements.output_description,
                "features": self.context.requirements.features,
                "further_requirements": self.context.requirements.further_requirements,
            },
            "tech_stack": self.context.tech_stack,
            # Ephemeral generated data from context (might not always be needed in full broadcast)
            # "generated_text_docs_summary": list(self.context.generated_text_doc.keys()),
            # "generated_diagrams_summary": list(self.context.generated_diagram.keys()),
            # "has_prototype_code": bool(self.context.prototype_code)
        }

    def _generate_id(self) -> str:
        """Generate a unique ID based on timestamp."""
        timestamp = int(datetime.datetime.now().timestamp() * 1000) # milliseconds for more uniqueness
        return f"{timestamp:x}"[-8:]

    def _get_file_type_from_extension(self, file_name: str) -> str:
        """
        Determine file type from file extension.
        
        Args:
            file_name: Name of the file
            
        Returns:
            File type string based on extension
        """
        _, extension = os.path.splitext(file_name)
        extension = extension.lower()
        
        if extension in ['.txt', '.md', '.csv']:
            return 'text'
        elif extension in ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg']:
            return 'image'
        elif extension in ['.xlsx', '.xls']:
            return 'excel'
        elif extension in ['.pdf']:
            return 'pdf'
        elif extension in ['.json']:
            return 'json'
        elif extension in ['.html', '.htm']:
            return 'html'
        else:
            return 'file'

    def get_preview_html_dir(self)->str:
        # Check output first, then processed for HTML files
        for file_list_key in ["output", "processed"]:
            for file_info in self.files[file_list_key]:
                if file_info["path"].lower().endswith('.html'):
                    return file_info["path"]
        return None

    def get_image_dirs(self) -> List[str]:
        """Get the list of paths to image files in the processed directory."""
        return [file["path"] for file in self.files["processed"] if file["path"].lower().endswith(('.png', '.jpg', '.jpeg'))]

    def get_csv_dirs(self) -> List[str]:
        """Get the list of paths to CSV files in the processed directory."""
        return [file["path"] for file in self.files["processed"] if file["path"].lower().endswith('.csv')]

    async def scan_and_update_files(self) -> None:
        self.files = {
            "input": [],
            "processed": [],
            "output": []
        }
        dir_map = {
            self.input_dir: "input",
            self.processed_dir: "processed",
            self.output_dir: "output"
        }

        for directory, type_key in dir_map.items():
            if os.path.exists(directory):
                for file_name in os.listdir(directory):
                    file_path = os.path.join(directory, file_name)
                    if os.path.isfile(file_path):
                        if file_name.lower().endswith('.geometry.json'):
                            continue           
                        if not any(f['path'] == file_path for f in self.files[type_key]):
                            self.files[type_key].append({
                                "path": file_path,
                                "name": file_name,
                                "type": self._get_file_type_from_extension(file_name),
                                "added_date": datetime.datetime.fromtimestamp(os.path.getctime(file_path)).isoformat(),
                                "modified_date": datetime.datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat(),
                                "size": os.path.getsize(file_path)
                            })
            # Sort files by name for consistent display
            self.files[type_key] = sorted(self.files[type_key], key=lambda x: x['name'])

        self.modified_date = datetime.datetime.now()
        self.context.update_from_project() # Update context after file scan
        await self._broadcast_update()
        print(f"Scanned and updated files for project {self.name}. Total files: {sum(len(v) for v in self.files.values())}")
        print(self.files)


    def create_directory_structure(self) -> bool:
        """Create the project directory structure."""
        try:
            os.makedirs(self.project_dir, exist_ok=True)
            os.makedirs(self.input_dir, exist_ok=True)
            os.makedirs(self.processed_dir, exist_ok=True)
            os.makedirs(self.output_dir, exist_ok=True)
            return True
        except Exception as e:
            print(f"Error creating directory structure for {self.name}: {e}")
            return False


    async def create_file(self, file_name: str, file_type: str, content: str = "") -> Optional[str]:
        """
        file_name: Name of the file to create (without path).
        file_type: Type of the file ('input', 'processed', 'output').
        content: Initial content to write into the file (default is empty).
        Create a new empty file (or with initial content) in the project directory.
        If a file with the same name exists, appends a number to make it unique.
        Returns the path to the created file or None on failure.
        """
        if file_type not in self.files:
            print(f"Invalid file type: {file_type}")
            return None

        dest_dir_map = {
            "input": self.input_dir,
            "processed": self.processed_dir,
            "output": self.output_dir
        }
        dest_dir = dest_dir_map.get(file_type)
        if not dest_dir:
            print(f"Unknown file type for destination directory: {file_type}")
            return None
        
        original_file_name, file_extension = os.path.splitext(file_name)
        current_file_name = file_name
        new_file_path = os.path.join(dest_dir, current_file_name)
        counter = 1

        while os.path.exists(new_file_path):
            current_file_name = f"{original_file_name}_{counter}{file_extension}"
            new_file_path = os.path.join(dest_dir, current_file_name)
            counter += 1
        try:
            with open(new_file_path, 'w', encoding='utf-8') as f:
                f.write(content)

            await self.add_file(new_file_path, file_type, current_file_name)
            print(f"Created file: {new_file_path}")
            
            return new_file_path
        except Exception as e:
            print(f"Error creating file {current_file_name}: {e}")
            return None

    async def add_file(self, file_path: str, file_type: str, file_name: Optional[str] = None) -> bool:
        """
        Adds a file record to the project metadata.
        file_path: Full path to the file that has already been saved.
        file_type: Type of the file ('input', 'processed', 'output').
        file_name: Optional name to use for the file (if None, uses the base name from file_path).
        Returns True if successful, False otherwise.
        """
        if file_type not in self.files:
            print(f"Invalid file type: {file_type}")
            return False
        
        if not file_name:
            file_name = os.path.basename(file_path)

        # Verify the file actually exists
        if not os.path.exists(file_path):
            print(f"File {file_path} does not exist on disk. Cannot add to project.")
            return False        # Check if file is already tracked
        if any(f['path'] == file_path for f in self.files[file_type]):
            print(f"File {file_path} already tracked in {file_type} directory.")
            return True  # Return True since it's already added

        try:
            # Use scan_and_update_files to refresh file list instead of direct manipulation
            await self.scan_and_update_files()
            self.modified_date = datetime.datetime.now()
            return True
        except Exception as e:
            print(f"Error adding file {file_name} to {file_type}: {e}")
            return False
        
    
    async def delete_file(self, file_name: str, file_type: str) -> bool:
        """
        Deletes a file from the project metadata and filesystem by name.
        file_name: Name of the file to delete.
        file_type: Type of the file ('input', 'processed', 'output').
        Returns True if successful, False otherwise.
        """
        if file_type not in self.files:
            print(f"Invalid file type: {file_type}")
            return False        
        for file_info in self.files[file_type]:
            if file_info["name"] == file_name:
                try:
                    os.remove(file_info["path"])
                    # Use scan_and_update_files to refresh file list instead of direct manipulation
                    await self.scan_and_update_files()
                    self.modified_date = datetime.datetime.now()
                    return True
                except Exception as e:
                    print(f"Error deleting file {file_name}: {e}")
                    return False

        print(f"File '{file_name}' not found in type '{file_type}' for deletion.")
        return False    
    async def rename_file(self, file_name: str, new_name: str, file_type: str) -> bool:
        if file_type not in self.files:
            print(f"Invalid file type: {file_type}")
            return False

        dest_dir_map = {
            "input": self.input_dir,
            "processed": self.processed_dir,
            "output": self.output_dir
        }
        dest_dir = dest_dir_map.get(file_type)
        if not dest_dir:
            print(f"Unknown file type for destination directory: {file_type}")
            return False

        for file_info in self.files[file_type]:
            if file_info["name"] == file_name:
                old_path = file_info["path"]
                if not os.path.exists(old_path):
                    print(f"Error: Original file path does not exist: {old_path}")
                    # Try to rescan and then retry, or just fail
                    await self.scan_and_update_files() # Rescan to fix potential inconsistencies
                    # Re-check after scan
                    if not any(f["name"] == file_name and f["path"] == old_path for f in self.files[file_type]):
                         print(f"File {file_name} still not found after rescan. Cannot rename.")
                         return False

                new_path = os.path.join(dest_dir, new_name)

                if os.path.exists(new_path):
                    print(f"Error: New file name '{new_name}' already exists at '{new_path}'.")
                    return False
                try:
                    os.rename(old_path, new_path)
                    # Use scan_and_update_files to refresh file list instead of direct manipulation
                    await self.scan_and_update_files()
                    self.modified_date = datetime.datetime.now()
                    return True
                except Exception as e:
                    print(f"Error renaming file {file_name} to {new_name}: {e}")
                    return False

        print(f"File '{file_name}' not found in type '{file_type}' for renaming.")
        return False

    async def save_metadata(self) -> bool:
        """Save project metadata to a JSON file in the project directory."""
        try:
            meta_path = os.path.join(self.project_dir, "project_metadata.json")
            with open(meta_path, 'w', encoding='utf-8') as f:
                json.dump(self.to_dict(), f, indent=2)
            # No broadcast here, as save_metadata is often called after an action that already broadcasted.
            # If called standalone, then a broadcast might be desired.
            # await self._broadcast_update() # Consider if needed here or if callers handle it.
            return True
        except Exception as e:
            print(f"Error saving metadata for {self.name}: {e}")
            return False


    @classmethod
    def load_from_metadata(cls, metadata_path: str) -> Optional['Project']:
        try:
            with open(metadata_path, 'r', encoding='utf-8') as f:
                metadata = json.load(f)

            project = cls(metadata["name"], metadata["directories"]["base"]) # Pass base_dir

            project.id = metadata["id"]
            # Ensure project_dir is correctly set from loaded id and name
            project.project_dir = os.path.join(project.base_dir, f"{project.name.replace(' ', '_')}_{project.id}")
            project.input_dir = os.path.join(project.project_dir, "input")
            project.processed_dir = os.path.join(project.project_dir, "processed")
            project.output_dir = os.path.join(project.project_dir, "output")

            project.created_date = datetime.datetime.fromisoformat(metadata["created_date"])
            project.modified_date = datetime.datetime.fromisoformat(metadata["modified_date"])
            project.description = metadata.get("description", "")
            project.tags = metadata.get("tags", [])

            project.files = metadata.get("files", {"input": [], "processed": [], "output": []})
            project.processing_history = metadata.get("processing_history", [])

            # Initialize context (it will call update_from_project itself)
            project.context = Context(project)

            # Restore requirements and tech_stack from metadata into the context
            if "requirements" in metadata:
                req_data = metadata["requirements"]
                project.context.requirements.input_description = req_data.get("input_description", "")
                project.context.requirements.output_description = req_data.get("output_description", "")
                project.context.requirements.features = req_data.get("features", {})
                project.context.requirements.further_requirements = req_data.get("further_requirements", "")

            project.context.tech_stack = metadata.get("tech_stack", "")

            # Context's __init__ calls update_from_project, which uses project.name and project.get_xxx_dirs.
            # These are now correctly set before Context is fully initialized.
            # A final update_from_project might be redundant but ensures consistency if loading logic changes.
            project.context.update_from_project()

            return project
        except Exception as e:
            print(f"Error loading project from {metadata_path}: {e}")
            import traceback
            traceback.print_exc()
            return None

    async def add_processing_record(self, operation: str, input_files: List[str],
                             output_files: List[Dict[str,str]], details: Dict[str, Any] = None) -> None: # output_files now List[Dict]
        record = {
            "timestamp": datetime.datetime.now().isoformat(),
            "operation": operation,
            "input_files": input_files, # List of paths
            "output_files": output_files, # List of {"path": "...", "name": "..."}
            "details": details or {}
        }
        self.processing_history.append(record)
        self.modified_date = datetime.datetime.now()
        await self._broadcast_update()

    def __str__(self) -> str:
        return f"Project: {self.name} (ID: {self.id}, Created: {self.created_date.strftime('%Y-%m-%d')})"
