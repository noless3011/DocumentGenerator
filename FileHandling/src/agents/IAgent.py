from abc import ABC, abstractmethod
from typing import Dict, Any, List

class IAgent(ABC):
    """Interface for agents that can process tasks."""

    @abstractmethod
    def generate(self, prompt: str, context: Dict[str, Any] = None) -> str:
        """
        Process a prompt with optional context and return a result.

        Args:
            prompt (str): The prompt to process
            context (Dict[str, Any], optional): Additional context data. Defaults to None.

        Returns:
            str: The processing result
        """
        pass

