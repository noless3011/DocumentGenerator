import litellm
from pathlib import Path
import base64
import os
import pandas as pd
import json
from typing import List, Dict, Any
from agents.TextDocumentAgent import TextDocumentAgent


class DocumentGenerator:
    def __init__(self, api_key=None, model="gemini/gemini-2.0-flash"):
        """Initialize the document generator with API key and model."""
        if api_key:
            os.environ["GEMINI_API_KEY"] = api_key
        elif "GEMINI_API_KEY" not in os.environ:
            raise ValueError("Gemini API key must be provided or set as an environment variable")
            
        self.model = model
        litellm.set_verbose = False
        self.text_generator = TextDocumentAgent(model)
        
    def scan_data_directory(self, data_dir: str) -> Dict[str, List[Path]]:
        """Scan the data directory for images and CSV files."""
        data_path = Path(data_dir)
        if not data_path.exists():
            raise FileNotFoundError(f"Data directory '{data_dir}' not found")
            
        files = {
            "images": list(data_path.glob("**/*.png")) + list(data_path.glob("**/*.jpg")) + list(data_path.glob("**/*.jpeg")),
            "csvs": list(data_path.glob("**/*.csv"))
        }
        
        return files
        
    def read_csv_data(self, csv_files: List[Path]) -> Dict[str, Any]:
        """Read CSV files and return their contents as structured data."""
        csv_data = {}
        
        for file_path in csv_files:
            try:
                df = pd.read_csv(file_path)
                csv_data[file_path.name] = {
                    "data": df.to_dict(orient="records"),
                    "columns": df.columns.tolist(),
                    "shape": df.shape
                }
            except Exception as e:
                print(f"Error reading {file_path.name}: {str(e)}")
                
        return csv_data
    
    def prepare_images(self, image_files: List[Path]) -> Dict[str, str]:
        """Convert images to base64 encoded strings."""
        image_data = {}
        
        for image_path in image_files:
            try:
                image_bytes = image_path.read_bytes()
                encoded_data = base64.b64encode(image_bytes).decode("utf-8")
                image_data[image_path.name] = encoded_data
            except Exception as e:
                print(f"Error processing image {image_path.name}: {str(e)}")
                
        return image_data
    
    
    def save_document(self, content: str, output_file: str) -> None:
        """Save the generated document to a file."""
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"Document saved to {output_path}")
        
    def save_images(self, image_data: Dict[str, str], output_dir: str) -> None:
        """Save the input images to the output directory."""
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        for image_name, encoded_image in image_data.items():
            try:
                image_bytes = base64.b64decode(encoded_image)
                image_output_path = output_path / image_name
                with open(image_output_path, 'wb') as f:
                    f.write(image_bytes)
                print(f"Image saved to {image_output_path}")
            except Exception as e:
                print(f"Error saving image {image_name}: {str(e)}")
    
    def save_json(self, data: Dict[str, Any], output_file: str) -> None:
        """Save data as JSON file."""
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        
        print(f"JSON saved to {output_path}")
        
    def generate(self, data_dir: str, output_dir: str = "output") -> List[str]:
        """Generate documents and diagrams, returning paths to all created files."""
        # Scan data directory
        files = self.scan_data_directory(data_dir)
        
        # Process CSV files
        csv_data = self.read_csv_data(files["csvs"])
        
        # Process image files
        image_data = self.prepare_images(files["images"])
        
        # Generate main document
        document_content = self.text_generator.generate_document(image_data, csv_data)
        
        # Set up output directory
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Save document
        main_doc_path = output_dir / "program_documentation.md"
        self.save_document(document_content, str(main_doc_path))
        
        # Save images to output folder
        images_dir = output_dir / "images"
        self.save_images(image_data, str(images_dir))
        
        # Generate various diagrams
        class_diagram = self.generate_class_diagram(csv_data)
        db_diagram = self.generate_database_diagram(csv_data)
        usecase_diagram = self.generate_usecase_diagram(csv_data)
        activity_diagram = self.generate_activity_diagram(csv_data)
        
        # Save diagrams
        class_diagram_path = output_dir / "class_diagram.json"
        db_diagram_path = output_dir / "database_diagram.json"
        usecase_diagram_path = output_dir / "usecase_diagram.json"
        activity_diagram_path = output_dir / "activity_diagram.json"
        
        self.save_json(class_diagram, str(class_diagram_path))
        self.save_json(db_diagram, str(db_diagram_path))
        self.save_json(usecase_diagram, str(usecase_diagram_path))
        self.save_json(activity_diagram, str(activity_diagram_path))
        
        # Collect and return all file paths
        generated_files = [
            str(main_doc_path),
            str(class_diagram_path),
            str(db_diagram_path),
            str(usecase_diagram_path),
            str(activity_diagram_path)
        ]
        
        # Add image files
        for image_file in images_dir.glob("*.*"):
            generated_files.append(str(image_file))
        
        return generated_files
        
    def generate_class_diagram(self, csv_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate class diagram representation in JSON format using Gemini API."""

        # Prepare the prompt with CSV data
        csv_description = json.dumps(csv_data, indent=2)

        # Prepare messages array with text prompt
        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": f"""
                        Analyze the provided feature data (in CSV format, described in JSON) and generate a class diagram in JSON format.

                        The JSON output should be structured as follows:
                        {{
                          "classes": [
                            {{ "name": "ClassName", "properties": ["propertyName: propertyType", ...], "methods": ["methodName(): returnType", ... ] }},
                            ...
                          ],
                          "relationships": [
                            {{ "from": "ClassName1", "to": "ClassName2", "type": "RelationshipType" }},
                            ...
                          ]
                        }}

                        Identify the key classes, their properties, methods, and relationships based on the feature data.
                        Return ONLY the JSON object in your response, without any extra text or explanations.

                        Here is the feature data in CSV format (described in JSON):
                        {csv_description}
                        """
                    }
                ]
            }
        ]

        # Make API call to Gemini for class diagram data
        try:
            response = litellm.completion(
                model=self.model,
                messages=messages,
                temperature=0.3 # Keep temperature low for more consistent JSON output
            )
            gemini_response_content = response.choices[0].message.content
            print("Gemini API Response (Class Diagram):\n", gemini_response_content) # Debugging

            try:
                # Attempt to parse Gemini's response as JSON
                class_diagram_json_data = json.loads(gemini_response_content)
            except json.JSONDecodeError as e:
                print(f"Warning: Gemini did not return valid JSON. JSONDecodeError: {e}")
                print("Gemini Response Content:\n", gemini_response_content) # Print full response for debugging
                class_diagram_json_data = {
                    "type": "class_diagram",
                    "entities": [],
                    "associations": [],
                    "error": "Gemini returned invalid JSON. See server logs for raw response." # Indicate error in JSON
                }


        except Exception as gemini_e:
            print(f"Error generating class diagram data from Gemini: {str(gemini_e)}")
            class_diagram_json_data = {
                "type": "class_diagram",
                "entities": [],
                "associations": [],
                "error": f"Error generating class diagram from Gemini: {str(gemini_e)}" # Indicate error in JSON
            }

        return class_diagram_json_data
        
    def generate_database_diagram(self, csv_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate database diagram representation in JSON format."""
        # Implementation would go here
        return {"type": "database_diagram", "tables": []}
        
    def generate_usecase_diagram(self, csv_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate use case diagram representation in JSON format."""
        # Implementation would go here
        return {"type": "usecase_diagram", "actors": [], "usecases": []}
        
    def generate_activity_diagram(self, csv_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate activity diagram representation in JSON format."""
        # Implementation would go here
        return {"type": "activity_diagram", "activities": [], "flows": []}


