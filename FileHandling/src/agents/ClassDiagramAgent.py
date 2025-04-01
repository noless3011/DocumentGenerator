import litellm
import json
from typing import List, Dict, Any
from utils.Message import Message
from flask import current_app
from agents.IAgent import IAgent

class ClassDiagramAgent(IAgent):
    def __init__(self, model):
        self.model = model

    def generate(self, message: Message) -> Dict[str, Any]:
        """Generate a class diagram in JSON format using LLM with code/data files."""
        message.add_user_text("Based on the provided code files and data, create a class diagram. Output the result in JSON format with classes, attributes, methods, and relationships.")
        
        schema = {
            "type": "object",
            "properties": {
                "classes": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                    "name": {
                        "type": "string"
                    },
                    "attributes": {
                        "type": "array",
                        "items": {
                        "type": "object",
                        "properties": {
                            "name": {
                            "type": "string"
                            },
                            "type": {
                            "type": "string"
                            }
                        }
                        }
                    },
                    "methods": {
                        "type": "array",
                        "items": {
                        "type": "object",
                        "properties": {
                            "name": {
                            "type": "string"
                            },
                            "returnType": {
                            "type": "string"
                            }
                        }
                        }
                    }
                    }
                }
                },
                "relationships": {
                "type": "object",
                "properties": {
                    "from": {
                    "type": "string"
                    },
                    "to": {
                    "type": "string"
                    },
                    "type": {
                    "type": "string",
                    "enum": [
                        "association",
                        "aggregation",
                        "composition",
                        "inheritance ",
                        "dependency",
                        "realization"
                    ]
                    }
                }
                }
            }
            }

        response = litellm.completion(
            model=self.model,
            messages=message.get_conversation(),
            response_format={"type": "json_object", "response_schema": schema}
        )
        
        current_app.logger.info(f"Raw class diagram response received")
        
        try:
            # Extract JSON from the response
            content = response.choices[0].message.content
            if content.startswith("{") and content.endswith("}"):
                class_diagram = json.loads(content)
                return class_diagram
            else:
                current_app.logger.error("No JSON content found in response")
                return {"error": "No valid class diagram generated"}
                
        except json.JSONDecodeError as e:
            current_app.logger.error(f"Failed to parse JSON: {str(e)}")
            return {"error": "Failed to parse class diagram JSON", "raw_content": content}