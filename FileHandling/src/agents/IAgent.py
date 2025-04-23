from abc import ABC, abstractmethod
from typing import Dict, Any, List
from utils.Message import Message   
from utils.Context import Context
class IAgent(ABC):
    """Interface for agents that can process tasks."""
    @abstractmethod
    def generate(self, context:Context) -> str:
        """
        Process a prompt with optional context and return a result.

        Args:
            prompt (str): The prompt to process
            context (Dict[str, Any], optional): Additional context data. Defaults to None.

        Returns:
            str: The processing result
        """
        pass
    @abstractmethod
    def update_context(self, context:Context) -> None:
        """
        Update the agent's context.

        Args:
            context (Context): The new context to set
        """
        pass
    @abstractmethod
    def edit(self, prompt:str, attached_context: str, context:Context) -> str:
        """
        Edit a document using the provided message and context.

        Args:
            prompt (str): The document content to edit
            attached_context (str): The context to attach to the document
            message (Message): The message containing the content to edit
            context (Context): The context for the editing process

        Returns:
            str: The edited document content
        """
        pass
