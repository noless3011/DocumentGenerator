import litellm
from pathlib import Path
import base64
from utils.Project import Project
from utils.Message import Message
from agents.IAgent import IAgent
from utils.Context import Context

class PrototypeAgent(IAgent):
    def __init__(self, model: str):
        self.model = model
        self.message = Message()

    def generate(self, context: Context) -> str:
        """Generate a HTML preview of the images in the project."""
        # Initialize message with context if needed
        self.update_context(context)
        
        if not context.diagram_image or len(context.diagram_image) == 0:
            # Fallback HTML content if no images are found
            html_content = """
            <html>
            <head><title>Preview App</title></head>
            <body>
                <div style="text-align: center;">
                    <h1>Preview App</h1>
                    <div style="margin: 20px;">
                        <p>No image files were found in this project. Please process some Excel files or add images to generate a preview.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            return html_content
        
        # Add images to the message
        for image in context.diagram_image:
            self.message.add_user_image_from_file(image)
        
        self.message.add_user_text("From these images, write a detailed prompt to create a preview app using only HTML. Describe the flow process in detail so another AI can understand the full context of the application shown in the images.")

        response = litellm.completion(
            model=self.model,
            messages=self.message.get_conversation()
        )

        self.message.append_llm_response(response)
        generated_prompt = response.choices[0].message.content
        secondary_message = f"""
        Based on the following detailed prompt and the images I give you, generate a preview app using only HTML, CSS, and JavaScript.
        The preview should be fully functional as a static HTML page and visually match the screens in the images.
        Ensure the app:
        1. Is a single HTML file (no separate files).
        2. Is responsive and well-designed.
        3. Includes navigation to access different screens/views shown in the images.
        4. Uses vanilla JavaScript for interactivity (no external libraries).
        5. Has a clean, professional design.
        6. Implements client-side navigation using JavaScript to show and hide different sections/views within the single HTML file.
        7. Do not have any explaination, just the code.
        8. Do not include any comments in the code.
        

        Detailed Prompt:
        {generated_prompt}

        Generate the complete HTML code, including embedded CSS in `<style>` tags and JavaScript in `<script>` tags.
        """
        self.message.add_user_text(secondary_message)

        response = litellm.completion(
            model=self.model,
            messages=self.message.get_conversation()
        )
        self.message.append_llm_response(response)

        html_content = response.choices[0].message.content
        # remove everything above <!DOCTYPE html> and below </html>
        # Find the start of the HTML document
        start_index = html_content.find('<!DOCTYPE html>')
        # Find the end of the HTML document
        end_index = html_content.rfind('</html>') + len('</html>')
        # Extract the HTML content
        html_content = html_content[start_index:end_index]

        
        return html_content
        
    def update_context(self, context: Context) -> None:
        """
        Update the agent's context.
        
        Args:
            context (Context): The new context to set
        """
        # Reset message to clean state
        self.message = Message()
        
        # Initialize with system message about the agent's purpose
        init_message = f"""
        You are a prototype UI generator for a web application. Your task is to analyze UI mockup images and generate 
        a functional HTML prototype that resembles the provided designs as closely as possible.
        
        Project: {context.project_name}
        Description: {context.requirements.input_description if context.requirements else ""}
        
        Create a prototype that:
        1. Matches the visual design of the provided mockups
        2. Implements basic navigation and UI interactions
        3. Shows all main screens visible in the mockups
        4. Uses placeholder content where appropriate
        5. Has a consistent look and feel throughout
        """
        
        self.message.add_system_text(init_message.strip())
    
    def edit(self, prompt: str, attached_context: str, context: Context) -> str:
        """
        Edit a prototype HTML using the provided message and context.
        
        Args:
            prompt (str): The editing instructions
            attached_context (str): Additional context for the edit
            context (Context): The full context
            
        Returns:
            str: The edited HTML content
        """
        if not prompt:
            print("Prompt is empty. Skipping editing.")
            return None
            
        # Update the context first
        self.update_context(context)
        
        # Add current HTML to modify
        if attached_context:
            self.message.add_user_text(f"Here is the current HTML prototype:\n\n```html\n{attached_context}\n```")
            
        # Add edit instructions
        self.message.add_user_text(f"Please modify the HTML prototype according to these instructions:\n{prompt}\n\nProvide the complete updated HTML file with all changes applied.")
        
        try:
            response = litellm.completion(
                model=self.model,
                messages=self.message.get_conversation()
            )
            
            self.message.append_llm_response(response)
            edited_html = response.choices[0].message.content
            
            # Extract just the HTML content
            start_index = edited_html.find('<!DOCTYPE html>')
            if start_index == -1:
                # Try to find just the HTML tag if DOCTYPE is missing
                start_index = edited_html.find('<html')
                if start_index == -1:
                    print("Could not find valid HTML in the response")
                    return None
                    
            end_index = edited_html.rfind('</html>') + len('</html>')
            if end_index <= len('</html>'):
                print("Could not find end of HTML in the response")
                return None
                
            edited_html = edited_html[start_index:end_index]
            return edited_html
            
        except Exception as e:
            print(f"Error editing HTML prototype: {e}")
            return None