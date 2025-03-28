import litellm
from pathlib import Path
import base64
from utils.Project import Project
from utils.Message import Message

class PrototypeAgent:
    def __init__(self, model: str):
        self.model = model
        litellm.set_verbose = True

    def generate_html(self, project: Project, message: Message) -> str:
        """Generate a HTML preview of the images in the project."""
        message.add_user_text("From the images of the UI above create the html preview of the program from the images of these UI, make sure the button that switch between pages work. ")

        response = litellm.completion(
            model=self.model,
            messages=message.get_conversation()
        )
        return response