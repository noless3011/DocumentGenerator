import litellm
from typing import Optional
from utils.Context import Context
from utils.Project import Project
from config import settings
from agents.MultimodalMixin import MultimodalMixin


class PrototypeAgent(MultimodalMixin):
    """
    Agent for generating HTML prototypes/mockups based on project requirements.
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
    
    def generate(self, project: Project, prompt: str = None) -> Optional[str]:
        """
        Generate an HTML prototype based on project context and requirements.
        
        Args:
            project: The current project instance
            prompt: Optional specific instructions for the prototype
            
        Returns:
            Generated HTML content or None if generation fails
        """
        try:
            # Ensure we have the latest project context
            self.update_context(project)
            
            # Build context information
            context_info = self._build_context_string()
            
            # Determine what type of prototype to generate based on context
            prototype_description = prompt or self._determine_prototype_type()
              # Create the system message for prototype generation
            system_message = f"""You are a web developer and UI/UX expert. Generate complete, functional HTML prototypes based on project requirements.

Project Context:
{context_info}

If images are provided, analyze them to understand:
- Existing UI patterns and design elements
- Color schemes and typography
- Layout structures and component placement
- User interface flows and interactions
- Design consistency requirements

Guidelines for HTML prototype generation:
- Create a complete, standalone HTML file with embedded CSS and JavaScript
- Use modern, responsive design principles
- Include proper HTML5 structure with semantic elements
- Use CSS Grid or Flexbox for layouts
- Make the design clean, professional, and user-friendly
- Include interactive elements where appropriate
- Use meaningful placeholder content based on the project context
- Ensure accessibility with proper ARIA labels and semantic HTML
- Include navigation, forms, tables, or other components as needed
- Use a consistent color scheme and typography
- Make it mobile-responsive
- Include sample data from the project context where relevant
- If UI images are provided, incorporate their design patterns and styling

The prototype should be a complete, working HTML page that demonstrates the application concept."""

            # Prepare multimodal content with images (only sent on first message)
            user_content = self._prepare_multimodal_content(
                f"Generate an HTML prototype: {prototype_description}",
                project
            )

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
            
            # Extract HTML from the response if it's in code blocks
            html_content = self._extract_html(content)
            
            return html_content or content
            
        except Exception as e:
            print(f"Error in PrototypeAgent.generate: {e}")
            return None
    
    def _determine_prototype_type(self) -> str:
        """Determine what type of prototype to generate based on project context."""
        if not self.context:
            return "A general web application interface"
        
        # Analyze project context to determine prototype type
        project_name = self.context.project_name.lower()
        tech_stack = (self.context.tech_stack or "").lower()
        
        # Check requirements for clues
        features = []
        if self.context.requirements:
            req = self.context.requirements
            features.extend([
                req.input_description or "",
                req.output_description or "",
                " ".join(req.features.values()) if req.features else "",
                req.further_requirements or ""
            ])
        
        features_text = " ".join(features).lower()
        
        # Determine prototype type based on keywords
        if any(word in project_name + tech_stack + features_text for word in ["dashboard", "admin", "management"]):
            return "An administrative dashboard with data tables, charts, and management controls"
        elif any(word in project_name + tech_stack + features_text for word in ["shop", "store", "ecommerce", "product"]):
            return "An e-commerce interface with product listings, shopping cart, and checkout"
        elif any(word in project_name + tech_stack + features_text for word in ["chat", "messaging", "communication"]):
            return "A messaging or chat application interface"
        elif any(word in project_name + tech_stack + features_text for word in ["blog", "news", "article", "content"]):
            return "A content management or blog interface"
        elif any(word in project_name + tech_stack + features_text for word in ["form", "survey", "input", "data entry"]):
            return "A data entry form interface with validation and submission"
        elif any(word in project_name + tech_stack + features_text for word in ["report", "analytics", "chart", "graph"]):
            return "A reporting and analytics dashboard with charts and data visualization"
        elif self.context.csv_description:
            return "A data management interface for viewing, editing, and analyzing tabular data"
        else:
            return f"A web application interface for {self.context.project_name}"
    
    def edit(self, instructions: str, current_content: str, project: Project) -> Optional[str]:
        """
        Edit existing HTML prototype content based on instructions.
        
        Args:
            instructions: User instructions for how to modify the content
            current_content: The current HTML content to be edited
            project: The current project instance
            
        Returns:
            Modified HTML content or None if editing fails
        """
        try:
            # Ensure we have the latest project context
            self.update_context(project)
            
            # Build context information
            context_info = self._build_context_string()
            
            # Create the system message for editing
            system_message = f"""You are a web developer and UI/UX expert. Edit the existing HTML prototype based on the user's instructions.

    Project Context:
    {context_info}

    Guidelines for editing HTML prototypes:
    - Maintain the existing structure unless specifically asked to change it
    - Preserve working functionality while implementing requested changes
    - Keep the design consistent with the existing style
    - Ensure the modified HTML remains a complete, standalone file
    - Use modern, responsive design principles for any new elements
    - Maintain proper HTML5 structure and semantic elements
    - Preserve accessibility features and add new ones as needed
    - Keep CSS and JavaScript embedded within the HTML file
    - Make sure all changes are compatible with the existing codebase
    - If adding new features, integrate them seamlessly with existing ones
    - Return the complete modified HTML file, not just the changes

    Current HTML Content:
    {current_content}

    User Instructions: {instructions}

    Please return the complete modified HTML file."""

            messages = [
                {"role": "system", "content": system_message},
                {"role": "user", "content": f"Edit the HTML prototype according to these instructions: {instructions}"}
            ]
            
            # Use litellm to call the AI model
            response = litellm.completion(
                model=self.model,
                messages=messages,
                api_key=settings.GEMINI_API_KEY
            )
            
            content = response.choices[0].message.content
            
            # Extract HTML from the response if it's in code blocks
            html_content = self._extract_html(content)
            
            return html_content or content
            
        except Exception as e:
            print(f"Error in PrototypeAgent.edit: {e}")
            return None

    def _extract_html(self, content: str) -> Optional[str]:
        """Extract HTML from the AI response."""
        # Look for HTML within code blocks
        import re
        html_pattern = r'```(?:html)?\s*(<!DOCTYPE html.*?</html>)\s*```'
        matches = re.findall(html_pattern, content, re.DOTALL | re.IGNORECASE)
        
        if matches:
            return matches[0]
        
        # Look for HTML-like content (starting with <!DOCTYPE or <html>)
        html_start_patterns = [r'<!DOCTYPE html', r'<html']
        
        for pattern in html_start_patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                start = match.start()
                # Find the closing </html> tag
                end_match = re.search(r'</html>', content[start:], re.IGNORECASE)
                if end_match:
                    end = start + end_match.end()
                    return content[start:end]
        
        return None
    
    def _build_context_string(self) -> str:
        """Build a context string from the current project."""
        if not self.context:
            return "No project context available."
        
        context_parts = [
            f"Project Name: {self.context.project_name}",
            f"Tech Stack: {self.context.tech_stack or 'Web-based application'}"
        ]
        
        # Add requirements info
        if self.context.requirements:
            req = self.context.requirements
            if req.input_description:
                context_parts.append(f"Input Requirements: {req.input_description}")
            if req.output_description:
                context_parts.append(f"Output Requirements: {req.output_description}")
            if req.features:
                features_list = [f"- {k}: {v}" for k, v in req.features.items()]
                context_parts.append(f"Key Features:\n" + "\n".join(features_list))
            if req.further_requirements:
                context_parts.append(f"Additional Requirements: {req.further_requirements}")
        
        # Add data structure information for UI design
        if self.context.csv_description:
            context_parts.append(f"Data Sources: {len(self.context.csv_description)} CSV files available")
            
            # Extract column information for form/table design
            for i, csv_data in enumerate(self.context.csv_description):
                if csv_data:
                    lines = csv_data.split('\n')
                    if lines:
                        headers = lines[0] if lines[0] else "No headers"
                        context_parts.append(f"Data Structure {i+1} - Columns: {headers}")
                        
                        # Add a few sample rows for context
                        if len(lines) > 1:
                            sample_rows = lines[1:4]  # Get 3 sample rows
                            context_parts.append(f"Sample Data {i+1}:")
                            for row in sample_rows:
                                if row.strip():
                                    context_parts.append(f"  {row}")
        
        # Add UI image context if available
        if self.context.ui_image:
            context_parts.append(f"UI References: {len(self.context.ui_image)} UI images available for design inspiration")
        
        return "\n".join(context_parts)