import litellm
import json
from typing import List, Dict, Any
from utils.Message import Message
from flask import current_app
from agents.IAgent import IAgent

# TODO: Implement the ClassDiagramAgent class with structured input/output
class ClassDiagramAgent(IAgent):
    def __init__(self, model):
        self.model = model

    def generate(self, message: Message) -> Dict[str, Any]:
        """Generate a class diagram in JSON format using LLM with code/data files."""
        message.add_user_text("Based on the provided code files and data, create a class diagram. Output the result in JSON format with classes, attributes, methods, and relationships.")
        
        response = litellm.completion(
            model=self.model,
            messages=message.get_conversation()
        )
        
        current_app.logger.info(f"Raw class diagram response received")
        
        try:
            # Extract JSON from the response
            content = response.choices[0].message.content
            # Find JSON content (assuming it might be in a code block or mixed with text)
            json_start = content.find('{')
            json_end = content.rfind('}') + 1
            
            if json_start >= 0 and json_end > json_start:
                json_content = content[json_start:json_end]
                class_diagram = json.loads(json_content)
                return class_diagram
            else:
                current_app.logger.error("No JSON content found in response")
                return {"error": "No valid class diagram generated"}
                
        except json.JSONDecodeError as e:
            current_app.logger.error(f"Failed to parse JSON: {str(e)}")
            return {"error": "Failed to parse class diagram JSON", "raw_content": content}