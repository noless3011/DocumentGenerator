import litellm
import json
from typing import List, Dict, Any
from utils.Message import Message
from flask import current_app
from agents.IAgent import IAgent
class TextDocumentAgent(IAgent):
    def __init__(self, model:str):
        self.model = model

    def generate(self, message: Message) -> str:
        """Generate a document using Gemini API with both image and CSV data."""
        message.add_user_text("From the csv files, images about the UI, create a general specification about the program.")
        response = litellm.completion(
            model=self.model,
            messages=message.get_conversation()
        )
        current_app.logger.info(f"Response: {response.choices[0].message.content}")
        return response.choices[0].message.content
        