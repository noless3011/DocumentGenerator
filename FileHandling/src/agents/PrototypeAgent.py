import litellm
from pathlib import Path
import base64
from utils.Project import Project
from utils.Message import Message
from agents.IAgent import IAgent

class PrototypeAgent(IAgent):
    def __init__(self, model: str):
        self.model = model

    def generate(self, message: Message) -> str:
        """Generate a HTML preview of the images in the project."""
        if message.messages.count == 0:
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
        
        message.add_user_text("From these images, write a detailed prompt to create a preview app using only HTML. Describe the flow process in detail so another AI can understand the full context of the application shown in the images.")

        response = litellm.completion(
            model=self.model,
            messages=message.get_conversation()
        )

        message.append_llm_response(response)
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
        message.add_user_text(secondary_message)

        response = litellm.completion(
            model=self.model,
            messages=message.get_conversation()
        )
        message.append_llm_response(response)

        html_content = response.choices[0].message.content
        # remove everything above <!DOCTYPE html> and below </html>
        # Find the start of the HTML document
        start_index = html_content.find('<!DOCTYPE html>')
        # Find the end of the HTML document
        end_index = html_content.rfind('</html>') + len('</html>')
        # Extract the HTML content
        html_content = html_content[start_index:end_index]

        
        return html_content