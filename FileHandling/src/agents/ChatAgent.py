import litellm
from utils.Message import Message
from agents.IAgent import IAgent
from utils.Context import Context
from utils.Project import Project # Assuming Project might be needed for context

class ChatAgent(IAgent):
    def __init__(self, model: str, project: Project = None):
        self.model = model
        self.message = Message()
        self.project_context = None # Store project-level context if available
        if project:
            self.project_context = project.context
            self.update_context(project.context) # Initial context update

    def _init_chat_system_message(self, context: Context | None) -> str:
        # Basic system message, can be expanded based on context
        project_name_info = f"You are interacting within a project called '{context.project_name}'." if context and context.project_name else "You are a helpful assistant."
        
        # Further context details can be added here if needed for chat interactions
        # For example, current open files, project status, etc.
        # For now, keeping it simple.
        
        return (
            f"{project_name_info} "
            f"You can process user messages, answer questions, or execute commands. "
            f"Commands usually start with a '/'. For example, '/create filename.txt content' or '/edit filename.md Please change X to Y.'"
            f"When asked to create or edit files, respond with a confirmation or the result. "
            f"If a command is not clear, ask for clarification."
        ).strip()

    def update_context(self, context: Context) -> None:
        self.project_context = context # Store the latest context
        system_message = self._init_chat_system_message(context)
        self.message.replace_init_message(system_message)

    def generate(self, prompt: str, context: Context) -> str | None:
        if not prompt:
            print("Prompt is empty. Skipping generation/command.")
            return None

        # Ensure the agent's context (and thus system message) is up-to-date
        # This might be redundant if update_context is always called before, but good for safety.
        if self.project_context != context: # Optimize to avoid redundant system message updates
            self.update_context(context)
        
        # Add the user's prompt (message or command) to the conversation
        # The system message is already the first message due to update_context/constructor.
        self.message.add_user_text(prompt)

        try:
            response = litellm.completion(
                model=self.model,
                messages=self.message.get_conversation()
            )
            response_content = response.choices[0].message.content
            
            # Append LLM's response to maintain conversation flow
            self.message.append_llm_response(response_content)
            
            # For a chat agent, the direct response_content is usually what's returned.
            # If it's a /create command, the backend API should handle file creation,
            # and the LLM's response here would be a confirmation or status.
            return response_content

        except Exception as e:
            print(f"Error during litellm completion in ChatAgent.generate: {e}")
            self.message.append_llm_response(f"Error processing your request: {e}") # Add error to conversation
            return f"Error: Could not process your request. {e}"

    def edit(self, prompt: str, attached_context: str, context: Context) -> str | None:
        if not prompt:
            print("Edit prompt (instructions) is empty. Skipping edit.")
            return None
        
        if not attached_context:
            print("Attached context (content to edit) is empty. Skipping edit.")
            return None

        # Ensure the agent's context (and thus system message) is up-to-date
        if self.project_context != context:
            self.update_context(context)

        # Construct the edit message for the LLM
        # The system message is already set.
        edit_instruction = (
            f"You are tasked with editing the following content based on my instructions.\n\n"
            f"Original Content:\n```\n{attached_context}\n```\n\n"
            f"My editing instructions are:\n{prompt}\n\n"
            f"Please provide the fully revised content based on these instructions."
        )

        self.message.add_user_text(edit_instruction)

        try:
            response = litellm.completion(
                model=self.model,
                messages=self.message.get_conversation()
            )
            response_content = response.choices[0].message.content
            
            # Append LLM's response
            self.message.append_llm_response(response_content)
            
            # The response_content should be the edited text.
            # If it's an edit command for a file, the backend API handles actual file system changes.
            # The LLM provides the *new content* for that file or message.
            return response_content

        except Exception as e:
            print(f"Error during litellm completion in ChatAgent.edit: {e}")
            self.message.append_llm_response(f"Error processing your edit request: {e}")
            return f"Error: Could not process your edit request. {e}"

