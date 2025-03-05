import litellm
from pathlib import Path
import base64
import os
import pandas as pd
import json
from typing import List, Dict, Any

class DocumentGenerator:
    def __init__(self, api_key=None, model="gemini/gemini-2.0-flash"):
        """Initialize the document generator with API key and model."""
        if api_key:
            os.environ["GEMINI_API_KEY"] = api_key
        elif "GEMINI_API_KEY" not in os.environ:
            raise ValueError("Gemini API key must be provided or set as an environment variable")
            
        self.model = model
        litellm.set_verbose = False
        
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
    
    def generate_document(self, image_data: Dict[str, str], csv_data: Dict[str, Any]) -> str:
        """Generate a document using Gemini API with both image and CSV data."""
        # Prepare the prompt with CSV data
        csv_description = json.dumps(csv_data, indent=2)
        
        # Prepare messages array with text and images
        messages = [
            {
                "role": "user", 
                "content": [
                    {
                        "type": "text", 
                        "text": f"""Please create a detailed document that describes the program based on the following UI screenshots and feature data.
                        
The CSV data contains information about the program features:
{csv_description}

Based on both the UI screenshots and the feature data, please:
1. Identify the purpose of the application
2. Describe the main features and functionality
3. Explain the user interface components
4. Provide a concise summary of how the application works
5. Format your response as a professional document with clear sections

Please be detailed and thorough in your analysis."""
                    }
                ]
            }
        ]
        
        # Add image content to the first message
        for image_name, encoded_image in image_data.items():
            messages[0]["content"].append({
                "type": "image_url",
                "image_url": f"data:image/png;base64,{encoded_image}"
            })
        
        # Make API call to Gemini
        try:
            response = litellm.completion(
                model=self.model,
                messages=messages
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"Error generating document: {str(e)}"
    
    def save_document(self, content: str, output_file: str) -> None:
        """Save the generated document to a file."""
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"Document saved to {output_path}")
        
    def generate(self, data_dir: str, output_file: str = "output/program_documentation.md") -> str:
        """Main function to generate the document."""
        # Scan data directory
        files = self.scan_data_directory(data_dir)
        
        # Process CSV files
        csv_data = self.read_csv_data(files["csvs"])
        
        # Process image files
        image_data = self.prepare_images(files["images"])
        
        # Generate document
        document_content = self.generate_document(image_data, csv_data)
        
        # Save document
        self.save_document(document_content, output_file)
        
        return document_content


