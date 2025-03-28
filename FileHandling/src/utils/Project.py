import os
import datetime
import json
from typing import List, Dict, Optional, Any

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
    
    def _generate_id(self) -> str:
        """Generate a unique ID based on timestamp."""
        timestamp = int(datetime.datetime.now().timestamp())
        return f"{timestamp:x}"[-6:]  # Use last 6 hex digits of timestamp
    
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
    
    def add_file(self, file_path: str, file_type: str = "input") -> bool:
        """
        Add a file to the project tracking.
        
        Args:
            file_path: Path to the file
            file_type: Type of file ("input", "processed", or "output")
        
        Returns:
            bool: Success status
        """
        if file_type not in self.files:
            return False
        
        if os.path.exists(file_path):
            self.files[file_type].append({
                "path": file_path, 
                "name": os.path.basename(file_path),
                "added_date": datetime.datetime.now().isoformat()
            })
            self.modified_date = datetime.datetime.now()
            return True
        return False
    
    def save_metadata(self) -> bool:
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
                json.dump(metadata, f, indent=2)
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
    
    def add_processing_record(self, operation: str, input_files: List[str], 
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
    
    def __str__(self) -> str:
        """String representation of the project."""
        return f"Project: {self.name} (ID: {self.id}, Created: {self.created_date.strftime('%Y-%m-%d')})"