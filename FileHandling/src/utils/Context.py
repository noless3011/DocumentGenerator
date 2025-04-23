from utils.Project import Project
from typing import Dict, List

class Requirements:
    input_description: str = ""
    output_description: str = ""
    # Features can be edited (dictionary)
    features: Dict[str, str]
    further_requirements: str = ""

class Context:
    def __init__(self):
        # raw data from the excel file
        self.csv_description = str
        self.ui_image = List[str]
        self.diagram_image = List[str]

        # initial context from the excel file and user prompt
        self.project_name = str
        self.requirements = Requirements()
        self.tech_stack = str

        # generated files
        self.generated_text_doc = Dict[str, str] # name and the text of the doc
        self.generated_diagram = Dict[any]
        self.prototype_code = str
