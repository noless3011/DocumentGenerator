import litellm
from pathlib import Path
import base64
import os
import pandas as pd
import json
from typing import List, Dict, Any
from utils.Message import Message
from utils.Project import Project
from agents.IAgent import IAgent
from agents.TextDocumentAgent import TextDocumentAgent
from agents.ClassDiagramAgent import ClassDiagramAgent
from agents.PrototypeAgent import PrototypeAgent
from flask import current_app

class GeneralAgent:
    def __init__(self, model="gemini/gemini-2.0-flash", project: Project=None, api_key=None):
        """Initialize the document generator with API key and model."""
        if api_key:
            os.environ["GEMINI_API_KEY"] = api_key
        elif "GEMINI_API_KEY" not in os.environ:
            raise ValueError("Gemini API key must be provided or set as an environment variable")
        self.project = project
        self.model = model
        self.agents = [IAgent] # type: List[IAgent]
        self.agents.append(TextDocumentAgent(model))
        self.agents.append(PrototypeAgent(model))
        self.agents.append(ClassDiagramAgent(model))
        self.init_message = Message()

    def change_project(self, project: Project):
        """Change the current project."""
        self.project = project
        self.initialize_message()


    def initialize_message(self):
        """Initialize a new message object."""
        # Add the text prompt to confirm the system prompt
        if self.project is None:
            raise ValueError("Project is not set")
        if len(self.init_message.messages) != 0:
            return
        self.init_message.add_user_text("You are a project planner and you task is to generate a document, diaagrams, and prototype application. Here is the project details extracted from a excel file. The files include images of the UI, images of rough sketched diagrams, and csv files of the project specifications. The user will ask you to generate a document, diagrams, and prototype application in the next questions. You will reply this message with a confirmation message YES, and start performing user request from the next message.")

        # Add the images from the project
        image_dirs = self.project.get_image_dirs()
        for image_dir in image_dirs:
            # Determine file extension
            file_extension = Path(image_dir).suffix.lower()
            if file_extension == '.png':
                mime_type = 'image/png'
            elif file_extension in ['.jpg', '.jpeg']:
                mime_type = 'image/jpeg'
            else:
                # Skip or handle unsupported image types
                print(f"Unsupported image format for {image_dir}, skipping")
                continue
            try: 
                image_bytes = Path(image_dir).read_bytes()
                encoded_data = base64.b64encode(image_bytes).decode("utf-8")
                self.init_message.add_user_image(f"data:{mime_type};base64,{encoded_data}")
            except Exception as e:
                print(f"Error reading image file: {e}")
        # Add the CSV files from the project
        csv_files = self.project.get_csv_dirs()
        for csv_file in csv_files:
            csv_path = self.project.get_csv_path(csv_file)
            csv_data = pd.read_csv(csv_path)
            csv_data_str = csv_data.to_string()
            self.init_message.add_user_text(f"Here is the content of the CSV file {csv_file}:")
            self.init_message.add_user_text(csv_data_str)
            
        res = litellm.completion(model=self.model, messages=self.init_message.get_conversation())
        self.init_message.append_llm_response(res)
        
    
    def save_document(self, content: str, output_file: str) -> None:
        """Save the generated document to a file."""
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            try:
                f.write(content)
            except Exception as e:
                #print err with traceback
                current_app.logger.error(f"Error writing to file: {e}")
                
        print(f"Document saved to {output_path}")
    
    def save_json(self, data: Dict[str, Any], output_file: str) -> None:
        """Save data as JSON file."""
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        
        print(f"JSON saved to {output_path}")
        
    def save_html(self, content: str, output_file: str) -> None:
        """Save the generated HTML to a file."""
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            try:
                f.write(content)
            except Exception as e:
                #print err with traceback
                current_app.logger.error(f"Error writing to file: {e}")
                
        print(f"HTML saved to {output_path}")
    
    def generate_text_document(self):
        """Generate a text document."""
        for agent in self.agents:
            if isinstance(agent, TextDocumentAgent):
                return agent.generate(self.init_message)
    def generate_prototype(self):
        """Generate a prototype."""
        for agent in self.agents:
            if isinstance(agent, PrototypeAgent):
                return agent.generate(self.init_message)
    
    def generate_class_diagram(self):
        """Generate a class diagram."""
        for agent in self.agents:
            if isinstance(agent, ClassDiagramAgent):
                return agent.generate(self.init_message)
    
        
        


