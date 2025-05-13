import os
import datetime
import json
from typing import List, Dict, Optional, Any
from .WebSocketManager import manager

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
        
        # Set base directory and create folder structure
        self.base_dir = os.path.abspath(base_dir) if base_dir else os.getcwd()
        self.project_dir = os.path.join(self.base_dir, f"{self.name}_{self.id}")
        
        # Define standard directories
        self.input_dir = os.path.join(self.project_dir, "input")
        self.processed_dir = os.path.join(self.project_dir, "processed")
        self.output_dir = os.path.join(self.project_dir, "output")
        
        # Additional metadata
        self.description = ""
        self.tags = []
        self.files = {
            "input": [],
            "processed": [],
            "output": []
        }
        
        # Tracking processing history
        self.processing_history = []
    
    async def _broadcast_update(self):
        """Broadcasts the current project state."""
        if self.id: # Ensure project has an ID to broadcast to
            await manager.broadcast(self.id, self.to_dict())

    def to_dict(self) -> Dict[str, Any]:
        """Converts project object to a dictionary for broadcasting."""
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
            "processing_history": self.processing_history
        }

    def _generate_id(self) -> str:
        """Generate a unique ID based on timestamp."""
        timestamp = int(datetime.datetime.now().timestamp())
        return f"{timestamp:x}"[-6:]  # Use last 6 hex digits of timestamp
    def get_preview_html_dir(self)->str:
        for file in self.files["processed"]:
            if file["path"].endswith('.html'):
                return file["path"]
        return None

    def get_image_dirs(self) -> List[str]:
        """Get the list of directories containing images."""
        return [file["path"] for file in self.files["processed"] if file["path"].endswith(('.png', '.jpg', '.jpeg'))]
    def get_csv_dirs(self) -> List[str]:
        """Get the list of CSV files in the project."""
        return [file["path"] for file in self.files["processed"] if file["path"].endswith('.csv')]
    async def scan_and_update_files(self) -> None:
        self.files = {
            "input": [],
            "processed": [],
            "output": []
        }
        for directory, type_key in [
            (self.input_dir, "input"), 
            (self.processed_dir, "processed"), 
            (self.output_dir, "output")
        ]:
            if os.path.exists(directory):
                for file in os.listdir(directory):
                    file_path = os.path.join(directory, file)
                    if os.path.isfile(file_path):
                        # Ignore .geometry.json files
                        if file.lower().endswith('.geometry.json'):
                            continue

                        file_lower = file.lower()
                        should_include = False

                        if type_key == "input" and (file_lower.endswith('.xls') or file_lower.endswith('.xlsx')):
                            should_include = True
                        elif type_key == "processed" and (file_lower.endswith('.png') or 
                                                          file_lower.endswith('.jpeg') or 
                                                          file_lower.endswith('.jpg')):
                            should_include = True
                        elif type_key == "output" and (file_lower.endswith('.html') or 
                                                       file_lower.endswith('.json') or 
                                                       file_lower.endswith('.md')):
                            should_include = True

                        if should_include:
                            self.files[type_key].append({
                                "path": file_path,
                                "name": file,
                                "added_date": datetime.datetime.now().isoformat()
                            })
                            
        self.modified_date = datetime.datetime.now()
        await self._broadcast_update()

    def create_directory_structure(self) -> bool:
        """Create the project directory structure."""
        try:
            os.makedirs(self.project_dir, exist_ok=True)
            os.makedirs(self.input_dir, exist_ok=True)
            os.makedirs(self.processed_dir, exist_ok=True)
            os.makedirs(self.output_dir, exist_ok=True)
            return True
        except Exception as e:
            print(f"Error creating directory structure: {e}")
            return False
    

    async def create_file(self, file_name: str, file_type: str) -> bool:
        """
        Create a new file in the project directory.
        If a file with the same name exists, appends a number to make it unique.
        
        Args:
            file_name: Name of the new file
            file_type: Type of file ("input", "processed", or "output")
        
        Returns:
            bool: Success status
        """
        if file_type not in self.files:
            print(f"Invalid file type: {file_type}")
            return False
        
        try:
            # Determine destination directory
            if file_type == "input":
                dest_dir = self.input_dir
            elif file_type == "processed":
                dest_dir = self.processed_dir
            elif file_type == "output":
                dest_dir = self.output_dir
            else:
                print(f"Unknown file type for destination directory: {file_type}")
                return False
            
            original_file_name, file_extension = os.path.splitext(file_name)
            current_file_name = file_name
            new_file_path = os.path.join(dest_dir, current_file_name)
            counter = 1
            
            # Check for existing file and append number if necessary
            while os.path.exists(new_file_path):
                current_file_name = f"{original_file_name}_{counter}{file_extension}"
                new_file_path = os.path.join(dest_dir, current_file_name)
                counter += 1
            
            # Create the new file
            with open(new_file_path, 'w') as f:
                f.write("")  # Create an empty file
            
            self.files[file_type].append({
                "path": new_file_path,
                "name": current_file_name, # Use the potentially modified file name
                "added_date": datetime.datetime.now().isoformat()
            })
            
            self.modified_date = datetime.datetime.now()
            await self._broadcast_update()
            return True
        except Exception as e:
            print(f"Error creating file {file_name}: {e}")
            return False
    async def delete_file(self, file_name: str, file_type: str) -> bool:
        """
        Delete a file from the project directory.
        
        Args:
            file_name: Name of the file to delete
            file_type: Type of file ("input", "processed", or "output")
        
        Returns:
            bool: Success status
        """
        if file_type not in self.files:
            print(f"Invalid file type: {file_type}")
            return False
        
        try:
            # Determine destination directory
            if file_type == "input":
                dest_dir = self.input_dir
            elif file_type == "processed":
                dest_dir = self.processed_dir
            elif file_type == "output":
                dest_dir = self.output_dir
            else:
                print(f"Unknown file type for destination directory: {file_type}")
                return False
            
            # Find the file in the list and remove it
            for i, file in enumerate(self.files[file_type]):
                if file["name"] == file_name:
                    os.remove(file["path"])  # Delete the actual file
                    del self.files[file_type][i]  # Remove from the list
                    break
            
            self.modified_date = datetime.datetime.now()
            await self._broadcast_update()
            return True
        except Exception as e:
            print(f"Error deleting file {file_name}: {e}")
            return False
        
    async def rename_file(self, file_name: str, new_name: str, file_type: str) -> bool:
        """
        Rename a file in the project directory.
        
        Args:
            file_name: Current name of the file
            new_name: New name for the file
            file_type: Type of file ("input", "processed", or "output")
        
        Returns:
            bool: Success status
        """
        if file_type not in self.files:
            print(f"Invalid file type: {file_type}")
            return False
        
        try:
            # Determine destination directory
            if file_type == "input":
                dest_dir = self.input_dir
            elif file_type == "processed":
                dest_dir = self.processed_dir
            elif file_type == "output":
                dest_dir = self.output_dir
            else:
                print(f"Unknown file type for destination directory: {file_type}")
                return False
            
            # Find the file in the list and rename it
            for i, file in enumerate(self.files[file_type]):
                if file["name"] == file_name:
                    old_path = file["path"]
                    new_path = os.path.join(dest_dir, new_name)
                    os.rename(old_path, new_path)  # Rename the actual file
                    self.files[file_type][i]["path"] = new_path  # Update path in the list
                    self.files[file_type][i]["name"] = new_name  # Update name in the list
                    break
            
            self.modified_date = datetime.datetime.now()
            await self._broadcast_update()
            return True
        except Exception as e:
            print(f"Error renaming file {file_name} to {new_name}: {e}")
            return False

    async def save_metadata(self) -> bool:
        """Save project metadata to a JSON file in the project directory."""
        try:
            metadata = {
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
                "processing_history": self.processing_history
            }
            
            meta_path = os.path.join(self.project_dir, "project_metadata.json")
            with open(meta_path, 'w') as f:
                json.dump(self.to_dict(), f, indent=2)
            await self._broadcast_update()
            return True
        except Exception as e:
            print(f"Error saving metadata: {e}")
            return False
    

    @classmethod
    def load_from_metadata(cls, metadata_path: str) -> Optional['Project']:
        """
        Load a project from its metadata file.
        
        Args:
            metadata_path: Path to the metadata JSON file
            
        Returns:
            Project instance or None if loading fails
        """
        try:
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
            
            # Create a new project instance
            project = cls(metadata["name"])
            
            # Restore properties from metadata
            project.id = metadata["id"]
            project.created_date = datetime.datetime.fromisoformat(metadata["created_date"])
            project.modified_date = datetime.datetime.fromisoformat(metadata["modified_date"])
            project.description = metadata["description"]
            project.tags = metadata["tags"]
            
            # Restore directory structure
            project.base_dir = metadata["directories"]["base"]
            project.project_dir = metadata["directories"]["project"]
            project.input_dir = metadata["directories"]["input"]
            project.processed_dir = metadata["directories"]["processed"]
            project.output_dir = metadata["directories"]["output"]
            
            # Restore files and processing history
            project.files = metadata["files"]
            project.processing_history = metadata["processing_history"]
            return project
        except Exception as e:
            print(f"Error loading project: {e}")
            return None
    
    async def add_processing_record(self, operation: str, input_files: List[str], 
                             output_files: List[str], details: Dict[str, Any] = None) -> None:
        """
        Add a record of processing to the project history.
        
        Args:
            operation: Type of processing performed
            input_files: List of input files used
            output_files: List of output files created
            details: Additional details about the processing
        """
        record = {
            "timestamp": datetime.datetime.now().isoformat(),
            "operation": operation,
            "input_files": input_files,
            "output_files": output_files,
            "details": details or {}
        }
        self.processing_history.append(record)
        self.modified_date = datetime.datetime.now()
        await self._broadcast_update()
    
    def __str__(self) -> str:
        """String representation of the project."""
        return f"Project: {self.name} (ID: {self.id}, Created: {self.created_date.strftime('%Y-%m-%d')})"