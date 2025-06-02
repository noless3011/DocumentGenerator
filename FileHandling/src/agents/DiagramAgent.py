import litellm
import json
from typing import Optional
from utils.Context import Context
from utils.Project import Project
from config import settings
from agents.schema.ClassDiagramSchema import VALIDATE_SCHEMA_CLASS_DIAGRAM, JSON_CLASS_DIAGRAM_SCHEMA_STRING
from agents.schema.SequenceDiagramSchema import VALIDATE_SCHEMA_SEQUENCE_DIAGRAM


class DiagramAgent:
    """
    Agent for generating UML diagrams in JSON format.
    """
    
    def __init__(self, model: str, project: Optional[Project] = None):
        self.model = model
        self.project = project
        self.context = None
        if project:
            self.update_context(project)
    
    def update_context(self, project: Project) -> None:
        """Update the agent with the current project context."""
        self.project = project
        self.context = project.context if project else None
    
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

Generate a complete, valid JSON diagram that represents the project structure and requirements."""

            messages = [
                {"role": "system", "content": system_message},
                {"role": "user", "content": f"Generate a {diagram_type} for this project: {prompt}"}
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