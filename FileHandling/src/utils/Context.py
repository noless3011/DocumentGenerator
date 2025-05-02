from utils.Project import Project
from typing import Dict, List, Any
import csv

class Requirements:
    def __init__(self):
        self.input_description: str = ""
        self.output_description: str = ""
        # Features can be edited (dictionary)
        self.features: Dict[str, str] = {}
        self.further_requirements: str = ""

class Context:
    def __init__(self):
        # raw data from the excel file
        self.csv_description: List[str] = []
        self.ui_image: List[str] = []
        self.diagram_image: List[str] = []

        # initial context from the excel file and user prompt
        self.project_name: str = ""
        self.requirements = Requirements()
        self.tech_stack: str = ""

        # generated files
        self.generated_text_doc: Dict[str, str] = {}  # name and the text of the doc
        self.generated_diagram: Dict[Any] = {}
        self.prototype_code: str = ""
        
    def update_context(self, project: Project)->None:
        """
        Update the context with project information.
        
        Args:
            project (Project): The project to update the context with.
        """
        self.csv_description = []
        for csv_file in project.get_csv_dirs():
            with open(csv_file, 'r') as file:
                csv_content = file.read()
                self.csv_description.append(csv_content)
        
        self.ui_image = project.get_image_dirs()