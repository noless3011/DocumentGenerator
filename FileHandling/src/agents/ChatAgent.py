import litellm
import base64
import os
from typing import Optional, List, Dict, Any
from utils.Context import Context
from utils.Project import Project
from config import settings
from agents.MultimodalMixin import MultimodalMixin


class ChatAgent(MultimodalMixin):
    """
    Agent for handling chat conversations with project context.
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
        Generate a response to a chat message using project context.
        
        Args:
            project: The current project instance
            prompt: The user's message
            
        Returns:
            AI response string or None if generation fails
        """
        try:
            # Ensure we have the latest project context
            self.update_context(project)
            
            # Build context information
            context_info = self._build_context_string()
            
            # Create the system message with project context
            system_message = f"""You are a helpful AI assistant working on a document generation project.

Project Context:
{context_info}

You can help users with:
- Analyzing project files and data
- Answering questions about the project
- Providing suggestions for documentation
- Explaining project structure and content
- General assistance with document generation
- Analyzing uploaded images and screenshots from the project

Be concise but informative in your responses. When you see images, analyze them and provide insights about the UI/UX design, functionality, or any visual elements that might be relevant to the project documentation."""            # Prepare multimodal content for the user message
            user_content = self._prepare_multimodal_content(prompt)
            
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
            
            return response.choices[0].message.content
            
        except Exception as e:
            print(f"Error in ChatAgent.generate: {e}")
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
        
        # Add file information
        if self.project:
            input_files = len(self.project.files.get("input", []))
            processed_files = len(self.project.files.get("processed", []))
            output_files = len(self.project.files.get("output", []))
            context_parts.append(f"Files - Input: {input_files}, Processed: {processed_files}, Output: {output_files}")
        
        # Add CSV data preview if available
        if self.context.csv_description:
            context_parts.append(f"CSV Data: {len(self.context.csv_description)} files processed")
            # Add a preview of the first CSV file (truncated)
            if self.context.csv_description[0]:
                preview = self.context.csv_description[0][:500]
                if len(self.context.csv_description[0]) > 500:
                    preview += "..."
                context_parts.append(f"CSV Preview: {preview}")
        return "\n".join(context_parts)