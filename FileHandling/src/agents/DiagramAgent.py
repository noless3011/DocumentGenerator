import litellm
import json
from typing import Optional
from utils.Context import Context
from utils.Project import Project
from config import settings
from agents.schema.ClassDiagramSchema import VALIDATE_SCHEMA_CLASS_DIAGRAM, JSON_CLASS_DIAGRAM_SCHEMA_STRING
from agents.schema.SequenceDiagramSchema import VALIDATE_SCHEMA_SEQUENCE_DIAGRAM
from agents.schema.DatabaseDiagramSchema import VALIDATE_SCHEMA_DATABASE_DIAGRAM, JSON_DATABASE_DIAGRAM_SCHEMA_STRING
from agents.MultimodalMixin import MultimodalMixin


class DiagramAgent(MultimodalMixin):
    """
    Agent for generating UML diagrams in JSON format.
    """
    def __init__(self, model: str, project: Optional[Project] = None):
        super().__init__()
        self.model = model
        self.project = project
        self.context = None
        if project:
            self.update_context(project)
    def update_context(self, project: Project) -> None:
        """Update the agent with the current project context."""
        self.project = project
        self.context = project.context if project else None
        super().update_context(project)  # Call mixin's update_context
    
    def generate(self, project: Project, prompt: str) -> Optional[str]:
        """
        Generate a UML diagram in JSON format based on project context and prompt.
        
        Args:
            project: The current project instance
            prompt: Type of diagram to generate (e.g., "UML Class Diagram", "Sequence Diagram")
            
        Returns:
            Generated diagram JSON string or None if generation fails
        """
        try:
            # Ensure we have the latest project context
            self.update_context(project)
            
            # Build context information
            context_info = self._build_context_string()
            
            # Determine diagram type from prompt
            diagram_type = self._determine_diagram_type(prompt)
            
            # Get the appropriate schema and example
            schema_info = self._get_diagram_schema(diagram_type)
              # Create the system message for diagram generation
            system_message = f"""You are a UML diagram expert. Generate valid JSON representations of UML diagrams based on project data.

Project Context:
{context_info}

{schema_info}

Guidelines:
- Generate ONLY valid JSON that matches the schema
- Use project context and data to create meaningful diagram elements
- Ensure all required fields are included
- Use descriptive names for classes, methods, and relationships
- Base the diagram structure on the project's tech stack and requirements
- Include relevant attributes and methods based on the CSV data if available
- Ensure proper UML relationships and conventions
- When images are provided, analyze them to understand the application structure, UI components, and data flow to create more accurate diagrams

Generate a complete, valid JSON diagram that represents the project structure and requirements."""

            # Prepare multimodal content for the user message
            user_content = self._prepare_multimodal_content(f"Generate a {diagram_type} for this project: {prompt}")

            messages = [
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_content}
            ]
            
            # Use litellm to call the AI model
            response = litellm.completion(
                model=self.model,
                messages=messages,
                api_key=settings.GEMINI_API_KEY
            )
            
            content = response.choices[0].message.content
            
            # Try to extract JSON from the response
            json_content = self._extract_json(content)
            
            if json_content:
                # Validate the JSON structure
                if self._validate_diagram_json(json_content, diagram_type):
                    return json_content
                else:
                    print(f"Generated diagram JSON failed validation for {diagram_type}")
                    return json_content  # Return anyway, might be usable
            
            return content  # Return raw content if JSON extraction fails
            
        except Exception as e:
            print(f"Error in DiagramAgent.generate: {e}")
            return None
    def edit(self, instructions: str, current_content: str, project: Project) -> Optional[str]:
        """
        Edit an existing diagram JSON based on instructions using incremental changes.
        
        Args:
            instructions: User instructions for how to modify the diagram
            current_content: Current JSON content of the diagram
            project: The current project instance
            
        Returns:
            Modified diagram JSON string or None if editing fails
        """
        try:
            # Ensure we have the latest project context
            self.update_context(project)
            
            # Validate current content is valid JSON
            try:
                current_json = json.loads(current_content)
            except json.JSONDecodeError:
                print("Error: Current content is not valid JSON")
                return None
            
            # Determine diagram type from current content
            diagram_type = current_json.get("diagramType", "UML Class Diagram")
            
            # Build context information
            context_info = self._build_context_string()
            
            # Create the system message for diagram editing
            system_message = f"""You are a UML diagram expert. Analyze the user's instructions and return ONLY a JSON object describing the changes needed.

Project Context:
{context_info}

Current Diagram Type: {diagram_type}

Return a JSON object with this exact structure:
{{
  "changes": {{
    "classes": {{
      "add": [
        {{
          "name": "string", // Name of the class (e.g., "User", "Order")
          "type": "string", // Type: "class", "abstract class", "interface" (default: "class")
          "attributes": [
            {{
              "name": "string", // Attribute name (e.g., "userName", "orderId")
              "type": "string", // Data type (e.g., "String", "int", "Date", "List<OrderItem>")
              "visibility": "string" // "+ public", "- private", "# protected", "~ package" (default: "- private")
            }}
          ],
          "methods": [
            {{
              "name": "string", // Method name (e.g., "login", "calculateTotal")
              "parameters": [
                {{
                  "name": "string", // Parameter name (e.g., "username", "quantity")
                  "type": "string" // Parameter data type (e.g., "String", "int")
                }}
              ],
              "returnType": "string", // Return type (e.g., "boolean", "double", "void")
              "visibility": "string", // "+ public", "- private", "# protected", "~ package" (default: "+ public")
              "isAbstract": "boolean" // true if the method is abstract (optional, default: false)
            }}
          ]
        }}
      ],
      "remove": ["ClassNameToRemove1", "ClassNameToRemove2"]
    }},
    "relationships": {{
      "add": [
        {{
          "fromClass": "SourceClass",
          "toClass": "TargetClass", 
          "type": "inheritance|composition|aggregation|association|dependency",
          "label": "optional label"
        }}
      ],
      "remove": [
        {{
          "from": "SourceClass",
          "to": "TargetClass",
          "type": "relationship type to remove"
        }}
      ]
    }}
  }}
}}

Guidelines:
- Return ONLY the JSON change object
- Only include changes that are actually needed based on the instructions
- Use empty arrays [] for sections with no changes
- Be specific about class names and relationship types
- When images are provided, use them to understand context for the changes"""

            # Prepare multimodal content for the user message
            user_content = self._prepare_multimodal_content(f"""Current diagram structure:
{json.dumps(current_json, indent=2)}

Instructions: {instructions}

Return the JSON change object describing exactly what needs to be added or removed.""")

            messages = [
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_content}
            ]
            
            # Use litellm to call the AI model
            response = litellm.completion(
                model=self.model,
                messages=messages,
                api_key=settings.GEMINI_API_KEY
            )
            
            content = response.choices[0].message.content
            
            # Try to extract JSON from the response
            changes_json = self._extract_json(content)
            
            if changes_json:
                try:
                    changes = json.loads(changes_json)
                    # Apply the changes to the current diagram
                    modified_diagram = self._apply_changes(current_json, changes)
                    return json.dumps(modified_diagram, indent=2)
                except (json.JSONDecodeError, KeyError) as e:
                    print(f"Error parsing changes JSON: {e}")
                    return None
            
            print("Could not extract valid changes JSON from response")
            return None
            
        except Exception as e:
            print(f"Error in DiagramAgent.edit: {e}")
            return None
    
    def _apply_changes(self, current_diagram: dict, changes: dict) -> dict:
        """Apply the specified changes to the current diagram."""
        modified = current_diagram.copy()
        
        if "changes" not in changes:
            return modified
            
        change_data = changes["changes"]
        
        # Apply class changes
        if "classes" in change_data:
            class_changes = change_data["classes"]
            
            # Remove classes
            if "remove" in class_changes:
                classes_to_remove = set(class_changes["remove"])
                if "classes" in modified:
                    modified["classes"] = [
                        cls for cls in modified["classes"] 
                        if cls.get("name") not in classes_to_remove
                    ]
            
            # Add classes
            if "add" in class_changes:
                if "classes" not in modified:
                    modified["classes"] = []
                
                for new_class in class_changes["add"]:
                    # Check if class already exists
                    existing_names = {cls.get("name") for cls in modified["classes"]}
                    if new_class.get("name") not in existing_names:
                        modified["classes"].append(new_class)
        
        # Apply relationship changes
        if "relationships" in change_data:
            rel_changes = change_data["relationships"]
            
            # Remove relationships
            if "remove" in rel_changes:
                if "relationships" in modified:
                    for rel_to_remove in rel_changes["remove"]:
                        modified["relationships"] = [
                            rel for rel in modified["relationships"]
                            if not (rel.get("fromClass") == rel_to_remove.get("from") and
                                   rel.get("toClass") == rel_to_remove.get("to") and
                                   rel.get("type") == rel_to_remove.get("type"))
                        ]
            
            # Add relationships
            if "add" in rel_changes:
                if "relationships" not in modified:
                    modified["relationships"] = []
                
                for new_rel in rel_changes["add"]:
                    # Check if relationship already exists
                    exists = any(
                        rel.get("fromClass") == new_rel.get("fromClass") and
                        rel.get("toClass") == new_rel.get("toClass") and
                        rel.get("type") == new_rel.get("type")
                        for rel in modified["relationships"]
                    )
                    if not exists:
                        modified["relationships"].append(new_rel)
        
        return modified
    def _determine_diagram_type(self, prompt: str) -> str:
        """Determine the type of diagram from the prompt."""
        prompt_lower = prompt.lower()
        
        if "class" in prompt_lower:
            return "UML Class Diagram"
        elif "sequence" in prompt_lower:
            return "UML Sequence Diagram"
        elif "database" in prompt_lower or "er" in prompt_lower or "entity" in prompt_lower:
            return "Database Diagram"
        elif "use case" in prompt_lower or "usecase" in prompt_lower:
            return "Use Case Diagram"
        elif "activity" in prompt_lower:
            return "Activity Diagram"
        else:
            return "UML Class Diagram"  # Default
    def _get_diagram_schema(self, diagram_type: str) -> str:
        """Get the schema information for the specified diagram type."""
        if diagram_type == "UML Class Diagram":
            return f"""
Target Diagram Type: UML Class Diagram

Required JSON Schema:
{JSON_CLASS_DIAGRAM_SCHEMA_STRING}

The response must be valid JSON matching this exact structure."""
        
        elif diagram_type == "UML Sequence Diagram":
            return """
Target Diagram Type: UML Sequence Diagram

Required JSON Structure:
{
  "diagramType": "UML Sequence Diagram",
  "diagramName": "string",
  "participants": [
    {
      "name": "string",
      "type": "actor|object|component|database|boundary|control|entity",
      "description": "string"
    }
  ],
  "messages": [
    {
      "from": "string",
      "to": "string", 
      "name": "string",
      "type": "synchronous|asynchronous|reply|create|destroy|self",
      "order": integer,
      "condition": "string",
      "arguments": ["string"],
      "returnValue": "string"
    }
  ]
}

The response must be valid JSON matching this structure."""
        
        elif diagram_type == "Database Diagram":
            return f"""
Target Diagram Type: Database Schema/ER Diagram

Required JSON Schema:
{JSON_DATABASE_DIAGRAM_SCHEMA_STRING}

The response must be valid JSON matching this exact structure."""
        
        else:
            # Generic diagram structure
            return """
Target Diagram Type: Generic UML Diagram

Basic JSON Structure:
{
  "diagramType": "string",
  "diagramName": "string",
  "elements": [],
  "relationships": []
}

Adapt this structure based on the specific diagram type requested."""
    
    def _extract_json(self, content: str) -> Optional[str]:
        """Extract JSON from the AI response."""
        try:
            # Try to parse the entire content as JSON first
            json.loads(content)
            return content
        except json.JSONDecodeError:
            pass
        
        # Look for JSON within code blocks
        import re
        json_pattern = r'```(?:json)?\s*(\{.*?\})\s*```'
        matches = re.findall(json_pattern, content, re.DOTALL)
        
        for match in matches:
            try:
                json.loads(match)
                return match
            except json.JSONDecodeError:
                continue
        
        # Look for JSON-like content (starting with { and ending with })
        start = content.find('{')
        if start != -1:
            # Find the matching closing brace
            brace_count = 0
            for i, char in enumerate(content[start:], start):
                if char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        try:
                            json_content = content[start:i+1]
                            json.loads(json_content)
                            return json_content
                        except json.JSONDecodeError:
                            break
        
        return None
    def _validate_diagram_json(self, json_content: str, diagram_type: str) -> bool:
        """Validate the generated JSON against the expected schema."""
        try:
            data = json.loads(json_content)
            
            # Basic validation - check for required fields
            if not isinstance(data, dict):
                return False
            
            if diagram_type == "UML Class Diagram":
                return "diagramName" in data and "classes" in data
            elif diagram_type == "UML Sequence Diagram":
                return "diagramName" in data and "participants" in data and "messages" in data
            elif diagram_type == "Database Diagram":
                return "diagramName" in data and "tables" in data
            else:
                return "diagramName" in data
                
        except json.JSONDecodeError:
            return False
    
    def _build_context_string(self) -> str:
        """Build a context string from the current project."""
        if not self.context:
            return "No project context available."
        
        context_parts = [
            f"Project Name: {self.context.project_name}",
            f"Tech Stack: {self.context.tech_stack or 'Not specified'}"
        ]
        
        # Add requirements info
        if self.context.requirements:
            req = self.context.requirements
            if req.input_description:
                context_parts.append(f"Input Description: {req.input_description}")
            if req.output_description:
                context_parts.append(f"Output Description: {req.output_description}")
            if req.features:
                features_str = ", ".join([f"{k}: {v}" for k, v in req.features.items()])
                context_parts.append(f"Features: {features_str}")
        
        # Add CSV data for structure analysis
        if self.context.csv_description:
            context_parts.append(f"Available Data: {len(self.context.csv_description)} CSV files")
            # Include CSV headers and structure for diagram generation
            for i, csv_data in enumerate(self.context.csv_description):
                if csv_data:
                    # Extract headers (first few lines)
                    lines = csv_data.split('\n')[:10]
                    preview = '\n'.join(lines)
                    context_parts.append(f"CSV Data Structure {i+1}:\n{preview}")
        
        return "\n".join(context_parts)