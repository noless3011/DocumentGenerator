import litellm
import json
from typing import List, Dict, Any
from utils.Message import Message
from jsonschema import validate, ValidationError
from utils.Context import Context
from agents.IAgent import IAgent
from agents.schema.ClassDiagramSchema import JSON_CLASS_DIAGRAM_SCHEMA_STRING, VALIDATE_SCHEMA_CLASS_DIAGRAM
import re
from utils.Project import Project

class DIAGRAM_TYPE:
    CLASS_DIAGRAM = "UML Class Diagram"
    SEQUENCE_DIAGRAM = "UML Sequence Diagram"
    ACTIVITY_DIAGRAM = "UML Activity Diagram"
    STATE_DIAGRAM = "UML State Diagram"
    USE_CASE_DIAGRAM = "UML Use Case Diagram"


class ClassDiagramAgent(IAgent):
    def __init__(self, name: str, model: str, project: Project = None):
        self.name = name
        self.model = model
        self.message = Message()
        self.diagram_type_str = None  # Initialize the diagram type
        if project:
            self.update_context(project.context)

    def _extract_json_content(self, content: str) -> Dict[str, Any]:
        # Look for JSON content that might be within ```json ... ``` blocks or standalone
        json_pattern = r'```(?:json)?\s*([\s\S]*?)```|(\{[\s\S]*\})'
        matches = re.findall(json_pattern, content)
        
        for match in matches:
            # Each match is a tuple with groups from the regex
            json_str = match[0] if match[0] else match[1]
            if json_str.strip():
                try:
                    # Parse and validate the JSON
                    json_data = json.loads(json_str)
                    try:
                        validate(instance=json_data, schema=VALIDATE_SCHEMA_CLASS_DIAGRAM)
                        return json_data
                    except ValidationError:
                        continue  # Try next match if this one fails validation
                except json.JSONDecodeError:
                    continue  # Try next match if this one isn't valid JSON
        
        # If no valid JSON was found
        return {}
    def _init_info(self, context: Context, diagram_type:DIAGRAM_TYPE):
        for key in context.requirements:
            # if any value is empty, return None
            if not context.requirements[key]:
                print("Requirement key '%s' is empty. Skipping generation.", key)
                return None
        # Check if the CSV file is empty - Assuming csv_description holds content or path
        if not context.csv_description:
            print("CSV description is empty. Skipping generation.")
            return None
        program_features_str = ""
        if context.requirements.features:
            program_features_str = "\n".join([f"  + {feature_name}: {feature_desc}" for feature_name, feature_desc in context.requirements.features.items()] )

        generated_text_doc_str = ""
        if context.generated_text_doc:
            generated_text_doc_str = "\n".join([f"  === {doc_name}:\n{doc_text}\n===" for doc_name, doc_text in context.generated_text_doc.items()]) # Added newline for clarity
        diagram_type_str = diagram_type.value if isinstance(diagram_type, DIAGRAM_TYPE) else diagram_type
        diagram_json_schema_string = ""
        validate_schema = None
        if diagram_type == DIAGRAM_TYPE.CLASS_DIAGRAM:
            diagram_json_schema_string = JSON_CLASS_DIAGRAM_SCHEMA_STRING
            validate_schema = VALIDATE_SCHEMA_CLASS_DIAGRAM
        if diagram_type == DIAGRAM_TYPE.SEQUENCE_DIAGRAM:
            diagram_json_schema_string = JSON_CLASS_DIAGRAM_SCHEMA_STRING
            validate_schema = VALIDATE_SCHEMA_CLASS_DIAGRAM
        if diagram_type == DIAGRAM_TYPE.ACTIVITY_DIAGRAM:
            diagram_json_schema_string = JSON_CLASS_DIAGRAM_SCHEMA_STRING
            validate_schema = VALIDATE_SCHEMA_CLASS_DIAGRAM
        if diagram_type == DIAGRAM_TYPE.STATE_DIAGRAM:
            diagram_json_schema_string = JSON_CLASS_DIAGRAM_SCHEMA_STRING
            validate_schema = VALIDATE_SCHEMA_CLASS_DIAGRAM
        if diagram_type == DIAGRAM_TYPE.USE_CASE_DIAGRAM:
            diagram_json_schema_string = JSON_CLASS_DIAGRAM_SCHEMA_STRING
            validate_schema = VALIDATE_SCHEMA_CLASS_DIAGRAM
        text = f'''
You are a {diagram_type_str} generator. You are writing a {diagram_type_str} for the following project. You are very meticulous and you pay attention to every detail. You will have to try your best to analyze the project and generate a diagram that is as accurate as possible. You will have to follow the schema strictly, the infomation about the diagram will be in json format between ```json ... ``` blocks. You will have to generate the {diagram_type_str} in json format. The json format is as follows:
```json
{diagram_json_schema_string}
```
Here is the infomation about the project:
- Project Name: {context.project_name}
- The image of the diagram is sent above, if dont see, keep it in mind that the image is not available.
- The program input requirement: {context.requirements.input_description}
- The program output requirement: {context.requirements.output_description}
- The program features: {program_features_str}
- Here is the tech stack of the program: {context.tech_stack}
- The program further requirements: {context.requirements.further_requirements}

Here is the generated text document, it contains the irreplaceable information about the project, you will have to follow it strictly, do not ignore any information in it:
{generated_text_doc_str}

Here is the previous generated diagram, you will have to follow it strictly, do not create any contradicting infomation with previous generated diagram:
{context.generated_diagram}

Remember to validate your document against all requirements, ensure all technical details are accurate, and provide comprehensive coverage of all features and functionalities. Be systematic and leave no aspect undocumented. Your documentation should serve as a definitive reference that anticipates and answers all potential questions users might have about the system.
Example of the output:
Your thinking process...
```json
...your json output...
```
'''
        return text, validate_schema, diagram_type_str

    def generate(self, context: Context, diagram_type: DIAGRAM_TYPE) -> str | None:
        init_message, validate_schema, diagram_type_str = self._init_info(context, diagram_type)
        if not init_message:
            print("Initialization message is empty. Skipping generation.")
            return None
        self.message.add_user_text(init_message)
        res = litellm.completion(model=self.model, messages=self.message.get_conversation())
        self.message.append_llm_response(res)
        json_content = self._extract_json_content(res)
        if not json_content:
            print("No valid JSON content found in the response.")
            return None
        try:
            validate(instance=json_content, schema=validate_schema)
            return json.dumps(json_content, indent=4)  # Pretty print JSON
        except ValidationError as e:
            print(f"Generated JSON does not match schema: {e}")
            return None
        except json.JSONDecodeError as e:
            print(f"Error decoding JSON: {e}")
            return None
        except Exception as e:
            print(f"Unexpected error: {e}")
            return None
    def update_context(self, context: Context) -> None:
        """Update the agent's context."""
        # Use a default diagram type if none is set
        diagram_type = DIAGRAM_TYPE.CLASS_DIAGRAM if self.diagram_type_str is None else self.diagram_type_str
        
        # Pass the diagram type to _init_info
        init_message, _, diagram_type_str = self._init_info(context, diagram_type)
        
        if not init_message:
            print("Initialization message is empty. Skipping update.")
            return None
            
        # Store the diagram type for future use
        self.diagram_type_str = diagram_type_str
        
        # Update the message with the new context
        self.message.replace_init_message(init_message)
    def edit(self, prompt: str, attached_context: str, context: Context) -> str:
        if not prompt:
            print("Prompt is empty. Skipping editing.")
            return None
        if len(prompt) == 0:
            print("Prompt is empty. Skipping editing.")
            return None
        # Basic validation checks (similar to generate)
        for key in context.requirements:
            if not context.requirements[key]:
                print("Requirement key '%s' is empty during edit. Context might be incomplete.", key)
                # Decide if you want to return None here or proceed with potentially incomplete info
                # return None
        if not context.csv_description:
            print("CSV description is empty during edit. Context might be incomplete.")
        self.update_context(context)
        self.message.add_user_text(f"You must write the *edit json* based on the previous response, following my instructions precisely. Dont rewrite or repeat unchanged part, just write the changed part into a json. Maintain the structure mention above\n\nMy instructions: {prompt}")
        try:
            response = litellm.completion(model=self.model, messages=self.message.get_conversation())
            self.message.append_llm_response(response)
            json_content = self._extract_json_content(response)
            diagram_type = json_content.get("diagramType", None)

            if json_content and diagram_type:
                return json_content
            else:
                print("No valid JSON content found in the response.")
                return None
        except json.JSONDecodeError as e:
            print(f"Error decoding JSON: {e}")
            return None
