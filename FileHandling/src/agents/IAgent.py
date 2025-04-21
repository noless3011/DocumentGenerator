from abc import ABC, abstractmethod
from typing import Dict, Any, List
from utils.Message import Message   
class IAgent(ABC):
    """Interface for agents that can process tasks."""

    @abstractmethod
    def generate(self, message: Message) -> str:
        """
        Process a prompt with optional context and return a result.

        Args:
            prompt (str): The prompt to process
            context (Dict[str, Any], optional): Additional context data. Defaults to None.

        Returns:
            str: The processing result
        """
        pass

