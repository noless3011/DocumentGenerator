import litellm
from typing import Optional
from utils.Context import Context
from utils.Project import Project
from config import settings


class TextDocumentAgent:
    """
    Agent for generating and editing text documents (primarily Markdown).
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
        Generate a markdown document based on project context and prompt.
        
        Args:
            project: The current project instance
            prompt: Description of what document to generate
            
        Returns:
            Generated markdown content or None if generation fails
        """
        try:
            # Ensure we have the latest project context
            self.update_context(project)
            
            # Build context information
            context_info = self._build_context_string()
            
            # Create the system message for document generation
            system_message = f"""You are a technical documentation expert. Generate high-quality Markdown documents based on project data and requirements.

Project Context:
{context_info}

Guidelines for document generation:
- Use proper Markdown formatting with headers, lists, tables, and code blocks
- Start with a clear title using # header
- Include relevant sections based on the project context
- Use the project data and requirements to create meaningful content
- Ensure the document is well-structured and professional
- Include technical details when appropriate
- Use tables for structured data representation
- Add code examples if relevant to the tech stack

Generate a comprehensive document that addresses the user's request while incorporating the project context."""

            messages = [
                {"role": "system", "content": system_message},
                {"role": "user", "content": f"Generate a document: {prompt}"}
            ]
            
            # Use litellm to call the AI model
            response = litellm.completion(
                model=self.model,
                messages=messages,
                api_key=settings.GEMINI_API_KEY
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            print(f"Error in TextDocumentAgent.generate: {e}")
            return None
    
    def edit(self, instructions: str, current_content: str, project: Project) -> Optional[str]:
        """
        Edit existing document content based on instructions.
        
        Args:
            instructions: What changes to make
            current_content: The current document content
            project: The current project instance
            
        Returns:
            Updated document content or None if editing fails
        """
        try:
            # Ensure we have the latest project context
            self.update_context(project)
            
            # Build context information
            context_info = self._build_context_string()
            
            # Create the system message for document editing
            system_message = f"""You are a technical documentation editor. Edit and improve Markdown documents based on specific instructions.

Project Context:
{context_info}

Guidelines for document editing:
- Maintain the existing Markdown formatting style
- Follow the provided instructions precisely
- Preserve the document structure unless instructed otherwise
- Ensure consistency in formatting and style
- Keep the document professional and well-organized
- Use project context to enhance content when relevant
- Return the complete edited document, not just the changes"""

            messages = [
                {"role": "system", "content": system_message},
                {"role": "user", "content": f"""Please edit the following document according to these instructions:

Instructions: {instructions}

Current Document Content:
{current_content}

Please provide the complete edited document."""}
            ]
            
            # Use litellm to call the AI model
            response = litellm.completion(
                model=self.model,
                messages=messages,
                api_key=settings.GEMINI_API_KEY
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            print(f"Error in TextDocumentAgent.edit: {e}")
            return None
    
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
            if req.further_requirements:
                context_parts.append(f"Additional Requirements: {req.further_requirements}")
        
        # Add CSV data for content generation
        if self.context.csv_description:
            context_parts.append(f"Available Data: {len(self.context.csv_description)} CSV files processed")
            # Include CSV data for document generation
            for i, csv_data in enumerate(self.context.csv_description):
                if csv_data:
                    preview = csv_data[:1000]  # Larger preview for document generation
                    if len(csv_data) > 1000:
                        preview += "..."
                    context_parts.append(f"CSV Data {i+1}:\n{preview}")
        
        # Add generated content info
        if self.context.generated_text_doc:
            context_parts.append(f"Previously Generated Documents: {list(self.context.generated_text_doc.keys())}")
        
        return "\n".join(context_parts)