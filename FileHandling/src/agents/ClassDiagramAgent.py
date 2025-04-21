import litellm
import json
from typing import List, Dict, Any
from utils.Message import Message
from flask import current_app
from jsonschema import validate, ValidationError
from agents.IAgent import IAgent

class ClassDiagramAgent(IAgent):
    def __init__(self, model):
        self.model = model
        

    def generate(self, message: Message) -> Dict[str, Any]:
        """Generate a class diagram in JSON format using LLM with code/data files."""
        message.add_user_text('''
**Objective:**

The primary objective is to meticulously analyze the provided images and csv text file then make a structured representation suitable for automated processing, specifically a UML Class Diagram defined in JSON format according to the specified schema. This translation process requires several distinct steps:

1.  **Conceptual Modeling:** Deconstruct the system description and its images to identify the core conceptual entities. These entities will form the basis for the UML Classes, Interfaces, or Abstract Classes in the diagram.
2.  **Attribute and Method Extraction:** For each identified class/interface:
    *   Extract its defining characteristics and data points, translating them into Attributes. This includes assigning a name, inferring a suitable data type (e.g., primitive types like `String`, `int`, `boolean`; collection types like `List<Type>`; or custom class types), and determining appropriate visibility (public `+`, private `-`, protected `#`, package `~`). Assume private visibility for attributes unless context strongly suggests otherwise.
    *   Extract its behaviors and responsibilities, translating them into Methods. This includes assigning a name, identifying parameters (with names and types), determining the return type (including `void`), assigning appropriate visibility (assume public unless context suggests otherwise), and noting if a method is abstract (relevant for abstract classes or interfaces).
3.  **Relationship Identification and Classification:** Analyze the interactions and connections between the identified classes/interfaces. Make the relationship as detail as possible, carefully consider the relationship between 2 classes. Classify each relationship accurately as one of the standard UML types:
    *   `Generalization` (Inheritance: "is a")
    *   `Realization` (Interface Implementation: "implements")
    *   `Association` (General connection: "uses", "related to", "knows")
    *   `Aggregation` (Part-whole, independent lifecycle: "has a")
    *   `Composition` (Part-whole, dependent lifecycle: "owns a")
    *   `Dependency` (Usage relationship, often temporary: "depends on")
    For relevant relationships (especially Association, Aggregation, Composition), determine and specify the multiplicity at both ends (e.g., `1`, `*`, `0..1`, `1..*`), making logical inferences based on the description (e.g., "contains multiple" implies `*` or `1..*`).
4.  **Reasoning Documentation (Thought Process):** Before generating the final JSON, articulate the step-by-step reasoning process. This narrative should explain *how* the classes, attributes, methods, and relationships were derived from the text. Crucially, it must explicitly state any assumptions or inferences made regarding missing information (e.g., data types, visibility levels, specific multiplicities, choosing between Aggregation/Composition).
5.  **Schema-Compliant JSON Generation:** Construct a single, valid JSON object that precisely represents the deduced class diagram structure. This JSON object *must* strictly conform to the provided JSON schema, ensuring all required fields are present and correctly formatted. The output should be ready for potential parsing by other tools without modification.

The final deliverable will consist of two distinct parts: the textual "Thought Process" followed immediately by the structured "JSON Output" in a code block. No other text should precede or follow these two sections.

**Input:** A description of a system, its components, their properties, behaviors, and relationships.

**Output Structure:**

1.  **Thought Process:** (Plain text) A detailed step-by-step explanation...
2.  **JSON Output:** (Code block) A single JSON object strictly conforming to the schema below.

**JSON Schema:**

```json
{
  "diagramType": "UML Class Diagram",
  "diagramName": "string", // A descriptive name for the diagram (e.g., "Online Shopping System")
  "classes": [
    {
      "name": "string", // Name of the class (e.g., "User", "Order")
      "type": "string", // Type: "class", "abstract class", "interface" (default: "class")
      "attributes": [
        {
          "name": "string", // Attribute name (e.g., "userName", "orderId")
          "type": "string", // Data type (e.g., "String", "int", "Date", "List<OrderItem>")
          "visibility": "string" // "+ public", "- private", "# protected", "~ package" (default: "- private")
        }
        // ... more attributes
      ],
      "methods": [
        {
          "name": "string", // Method name (e.g., "login", "calculateTotal")
          "parameters": [
            {
              "name": "string", // Parameter name (e.g., "username", "quantity")
              "type": "string" // Parameter data type (e.g., "String", "int")
            }
            // ... more parameters
          ],
          "returnType": "string", // Return type (e.g., "boolean", "double", "void")
          "visibility": "string", // "+ public", "- private", "# protected", "~ package" (default: "+ public")
          "isAbstract": "boolean" // true if the method is abstract (optional, default: false)
        }
        // ... more methods
      ]
    }
    // ... more classes
  ],
  "relationships": [
    {
      "type": "string", // "Association", "Aggregation", "Composition", "Generalization", "Realization", "Dependency"
      "fromClass": "string", // Name of the source class
      "toClass": "string", // Name of the target class
      // --- Optional fields for specific relationship types ---
      "label": "string", // Optional: Name or description of the relationship (esp. for Association)
      "fromMultiplicity": "string", // Optional: Multiplicity at the source end (e.g., "1", "0..1", "*", "1..*")
      "toMultiplicity": "string" // Optional: Multiplicity at the target end (e.g., "1", "0..1", "*", "1..*")
      // --- Interpretation Guide ---
      // Generalization: fromClass=Subclass, toClass=Superclass
      // Realization: fromClass=Implementing Class, toClass=Interface
      // Dependency: fromClass=Client, toClass=Supplier
      // Association/Aggregation/Composition: Define ends based on context or label.
    }
    // ... more relationships
  ]
}
''')
        # Define the JSON schema for validation
        schema = {
            "type": "object",
            "required": ["diagramName", "classes"],
            "properties": {
                "diagramType": {
                    "type": "string",
                    "enum": ["UML Class Diagram"]
                },
                "diagramName": {"type": "string"},
                "classes": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": ["name"],
                        "properties": {
                            "name": {"type": "string"},
                            "type": {"type": "string", "default": "class"},
                            "attributes": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "required": ["name", "type"],
                                    "properties": {
                                        "name": {"type": "string"},
                                        "type": {"type": "string"},
                                        "visibility": {"type": "string", "default": "- private"}
                                    }
                                }
                            },
                            "methods": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "required": ["name", "returnType"],
                                    "properties": {
                                        "name": {"type": "string"},
                                        "parameters": {
                                            "type": "array",
                                            "items": {
                                                "type": "object",
                                                "required": ["name", "type"],
                                                "properties": {
                                                    "name": {"type": "string"},
                                                    "type": {"type": "string"}
                                                }
                                            }
                                        },
                                        "returnType": {"type": "string"},
                                        "visibility": {"type": "string", "default": "+ public"},
                                        "isAbstract": {"type": "boolean", "default": False}
                                    }
                                }
                            }
                        }
                    }
                },
                "relationships": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": ["type", "fromClass", "toClass"],
                        "properties": {
                            "type": {"type": "string", "enum": ["Association", "Aggregation", "Composition", "Generalization", "Realization", "Dependency"]},
                            "fromClass": {"type": "string"},
                            "toClass": {"type": "string"},
                            "label": {"type": "string"},
                            "fromMultiplicity": {"type": "string"},
                            "toMultiplicity": {"type": "string"}
                        }
                    }
                }
            }
        }
        response = litellm.completion(
            model=self.model,
            messages=message.get_conversation(),
            # response_format={"type": "json_object", "response_schema": schema, "enforce_validation": True}
        )
        
        current_app.logger.info(f"Raw class diagram response received")
        
        try:
            # Extract JSON from the response
            content = response.choices[0].message.content
            current_app.logger.info(f"Raw content: {content}")
            # Look for JSON content between ```json and ``` markers
            json_start = content.find("```json")
            if json_start != -1:
                json_start += 7  # Move past the ```json marker
                json_end = content.find("```", json_start)
                if json_end != -1:
                    json_str = content[json_start:json_end].strip()
                    try:
                        class_diagram_data = json.loads(json_str)
                        # Validate the JSON against the schema
                        validate(instance=class_diagram_data, schema=schema)
                        # Log the successful validation
                        current_app.logger.info("Class diagram JSON validated successfully.")
                        return class_diagram_data
                    except json.JSONDecodeError as e:
                        current_app.logger.error(f"Failed to parse extracted JSON: {str(e)}")
                        return {"error": "Invalid JSON in class diagram", "raw_content": json_str}
                    except ValidationError as e:
                        current_app.logger.error(f"Validation error: {str(e)}")
                        return {"error": "Class diagram JSON does not conform to schema", "raw_content": json_str}
            else:
                current_app.logger.error("No JSON content found in response")
                return {"error": "No valid class diagram generated"}
                
        except json.JSONDecodeError as e:
            current_app.logger.error(f"Failed to parse JSON: {str(e)}")
            return {"error": "Failed to parse class diagram JSON", "raw_content": content}