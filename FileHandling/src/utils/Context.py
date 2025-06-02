from typing import Dict, List, Any, TYPE_CHECKING
import csv

if TYPE_CHECKING:
    from utils.Project import Project # Forward declaration for type hinting

class Requirements:
    def __init__(self):
        self.input_description: str = ""
        self.output_description: str = ""
        # Features can be edited (dictionary)
        self.features: Dict[str, str] = {}
        self.further_requirements: str = ""

class Context:
    def __init__(self, project_instance: 'Project'):
        self.project: 'Project' = project_instance # Store the project instance

        # raw data from the excel file - populated by update_from_project
        self.csv_description: List[str] = []
        self.ui_image: List[str] = [] # Potentially UI mockups
        self.diagram_image: List[str] = [] # Processed diagram images

        # initial context from the excel file and user prompt
        self.project_name: str = ""
        self.requirements = Requirements()
        self.tech_stack: str = ""

        # generated files - these are ephemeral and reflect current generation cycle
        self.generated_text_doc: Dict[str, str] = {}  # name and the text of the doc
        self.generated_diagram: Dict[Any] = {} # type and the json data of the diagram
        self.prototype_code: str = ""

        self.update_from_project() # Initial population based on project state

    def update_from_project(self) -> None:
        """
        Update the context based on the current state of the associated project.
        This is typically called after project files change or project metadata is loaded.
        """
        self.project_name = self.project.name

        self.csv_description = []
        for csv_file_path in self.project.get_csv_dirs():
            try:
                with open(csv_file_path, 'r', encoding='utf-8') as file:
                    csv_content = file.read()
                    self.csv_description.append(csv_content)
            except Exception as e:
                print(f"Error reading CSV file {csv_file_path} for context: {e}")

        # Assuming all processed images might be relevant.
        # Specific differentiation between UI and Diagram images might need more logic
        # or separate categorized storage in Project if critical.
        all_images = self.project.get_image_dirs()
        self.ui_image = all_images # For now, assign all. Could be refined.
        self.diagram_image = all_images # For now, assign all.

    def update_requirements_and_stack(self,
                                      input_desc: str,
                                      output_desc: str,
                                      features: Dict[str, str],
                                      further_reqs: str,
                                      tech_stack: str) -> None:
        """
        Updates the requirements and tech stack for the project's context.
        This should trigger a save of project metadata.
        """
        self.requirements.input_description = input_desc
        self.requirements.output_description = output_desc
        self.requirements.features = features
        self.requirements.further_requirements = further_reqs
        self.tech_stack = tech_stack

        # After updating, the project metadata should be saved.
        # This can be done by the caller, or we can add a call here:
        # asyncio.create_task(self.project.save_metadata()) # If self.project.save_metadata is async

    def add_generated_text_doc(self, name: str, content: str) -> None:
        self.generated_text_doc[name] = content

    def add_generated_diagram(self, diagram_name: str, diagram_data: Any) -> None:
        self.generated_diagram[diagram_name] = diagram_data

    def set_prototype_code(self, html_code: str) -> None:
        self.prototype_code = html_code
