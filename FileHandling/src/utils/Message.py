import base64
import os
from pathlib import Path
import litellm
import pprint
class Message:
    def __init__(self):
        # Maintain a list of messages (each message is a dict with "role" and "content")
        self.messages = []
    def replace_init_message(self, new_init_message):
        """Replace the initial message in the conversation."""
        if self.messages:
            self.messages[0] = {"role": "user", "content": [{"type": "text", "text": new_init_message}]}
        else:
            raise IndexError("No messages available to replace.")
    def add_user_text(self, text, cache_control=None):
        """Add a user text message to the conversation."""
        entry = {"type": "text", "text": text}
        if cache_control:
            entry["cache_control"] = cache_control
        self.messages.append({"role": "user", "content": [entry]})

    def add_user_image_from_file(self, image_path, mime_type="image/png"):
        """Read an image file, encode it in base64, and add it as a user image message."""
        image_bytes = Path(image_path).read_bytes()
        encoded_data = base64.b64encode(image_bytes).decode("utf-8")
        data_uri = f"data:{mime_type};base64,{encoded_data}"
        self.add_user_image(data_uri)

    def add_user_image(self, image_url):
        """Add a user image message using a data URI or direct URL."""
        entry = {"type": "image_url", "image_url": image_url}
        self.messages.append({"role": "user", "content": [entry]})

    def append_to_last_message(self, entry):
        """
        Append a new content entry (text, image, etc.) to the last message.
        Useful if you want to add more elements to an existing message block.
        """
        if self.messages:
            self.messages[-1]["content"].append(entry)
        else:
            raise IndexError("No messages available to append to.")

    def append_llm_response(self, llm_response):
        """
        Append the assistant's response to the conversation.
        Assumes `llm_response` is a dict in the format:
          {"choices": [{"message": {"role": "assistant", "content": [ ... ]}}]}
        """
        try:
            assistant_msg = llm_response["choices"][0]["message"]
            # Optionally, you could merge with previous assistant messages
            self.messages.append(assistant_msg)
        except (KeyError, IndexError) as e:
            raise ValueError("LLM response format is not as expected.") from e
        
    def get_conversation(self):
        """Return the full conversation history as a list of message dictionaries."""
        return self.messages


