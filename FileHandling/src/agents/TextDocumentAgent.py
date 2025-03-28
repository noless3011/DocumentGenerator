import litellm
import json
from typing import List, Dict, Any

class TextDocumentAgent:
    def __init__(self, model):
        self.model = model

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
        print("messages:", messages)
        print("image_data:", image_data)
        # Make API call to Gemini
        try:
            response = litellm.completion(
                model=self.model,
                messages=messages
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"Error generating document: {str(e)}"
        