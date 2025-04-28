import litellm
import json
import re # Import the regular expression module
from typing import List, Dict, Any
from utils.Message import Message
from utils.Context import Context
from agents.IAgent import IAgent
class TextDocumentAgent(IAgent):
    def __init__(self, model:str):
        self.model = model
        self.message = Message()

    def _extract_markdown_content(self, response_content: str) -> tuple[str | None, str | None]:
        # Use regex to find the markdown block, ignoring case and allowing for whitespace
        match = re.search(r"```markdown\s*\n(.*?)\n```", response_content, re.DOTALL | re.IGNORECASE)
        if match:
            document_content = match.group(1).strip()
            first_line = document_content.split('\n', 1)[0].strip()

            document_name = ''.join(e for e in first_line if e.isalnum() or e.isspace())

            if document_name:
                return document_name, document_content
        return None, None 
    def _init_info(self, context: Context):
        for key in context.requirements:
            # if any value is empty, return None
            if not context.requirements[key]:
                print("Requirement key '%s' is empty. Skipping generation.", key)
                return None
        # Check if the CSV file is empty - Assuming csv_description holds content or path
        if not context.csv_description:
            print("CSV description is empty. Skipping generation.")
            return None
        program_features_str = ""
        if context.requirements.features:
            program_features_str = "\n".join([f"  + {feature_name}: {feature_desc}" for feature_name, feature_desc in context.requirements.features.items()] )

        generated_text_doc_str = ""
        if context.generated_text_doc:
            generated_text_doc_str = "\n".join([f"  === {doc_name}:\n{doc_text}\n===" for doc_name, doc_text in context.generated_text_doc.items()]) # Added newline for clarity

        init_text = f'''
You are a document writer for a programming project, you are capable of writing a dynamic range of document. You will be provided with a the context of the program.
You will generate a document in the markdown format. You have to put the document in the code block with the ```markdown``` tag. The first line inside the markdown block must be the title of the document (e.g., Software Requirements Specification).

Please be extremely meticulous and detailed in your documentation. Consider all edge cases, implementation details, and ensure technical accuracy in every section. Be thorough and precise with your explanations. Provide comprehensive code examples where appropriate, and explain each component's purpose and functionality.

Document the architecture thoroughly, including design patterns used, data flows, and component interactions. Include diagrams if possible (by describing them textually). Elaborate on performance considerations, security implications, and scalability aspects of the solution.

When documenting APIs, include complete parameter descriptions, return values, error handling, and usage examples. For complex algorithms, explain the underlying principles, time/space complexity, and alternative approaches considered.

Here is the infomation about the project:
- Project Name: {context.project_name}
- The image of the diagram is sent above, if dont see, keep it in mind that the image is not available.
- The program input requirement: {context.requirements.input_description}
- The program output requirement: {context.requirements.output_description}
- The program features: {program_features_str}
- Here is the tech stack of the program: {context.tech_stack}
- The program further requirements: {context.requirements.further_requirements}
- Here is the already generated text document. You must follow the document generated from before strictly to maintain the consistency of the program, do not violate this consistency that previous document. If this part dont have anything that mean this is the first text document generated. You will have to think thouroughly, planning so future document can depend on this document to generate further
{generated_text_doc_str}

Remember to validate your document against all requirements, ensure all technical details are accurate, and provide comprehensive coverage of all features and functionalities. Be systematic and leave no aspect undocumented. Your documentation should serve as a definitive reference that anticipates and answers all potential questions users might have about the system.
Example of the output:
- Your thinking process...
```markdown
Software Requirements Specification
The content of the document.
```
        '''
        return init_text # Return the generated text for further processing
    def generate(self, context: Context) -> str | None:
        """Generate a document using Gemini API with both image and CSV data."""
        init_text = self._init_info(context)
        if init_text is None:
            print("Initialization failed. Skipping generation.")
            return None
        if context.diagram_image: # Check if list is not empty
            for image in context.diagram_image:
                # Add the image to the message
                self.message.add_user_image_from_file(image)

        try:
            response = litellm.completion(
                model=self.model,
                messages=self.message.get_conversation()
            )
            response_content = response.choices[0].message.content
            self.message.append_llm_response(response_content)

            # Extract the content and name using the new method
            document_name, document_content = self._extract_markdown_content(response_content)

            if document_content and document_name:
                return document_content
            else:
                print("Could not extract markdown content from LLM response.")
                return None # Indicate failure if extraction fails

        except Exception as e:
            print(f"Error during litellm completion or processing: {e}")
            return None # Return None on API error or other exceptions


    def update_context(self, context: Context) -> None:
        new_init_message = self._init_info(context)
        # Replace the initial system message with the updated context
        self.message.replace_init_message(new_init_message)


    def edit(self, prompt:str, attached_context: str, context:Context) -> str | None: # Added attached_context type hint and return type hint
        """Edit a document using the provided message and context."""
        # Check if there's a conversation history to edit upon
        if len(self.message.messages) == 0:
            print("Cannot edit: No previous conversation history.")
            return None
        # Basic validation checks (similar to generate)
        for key in context.requirements:
            if not context.requirements[key]:
                print("Requirement key '%s' is empty during edit. Context might be incomplete.", key)
                # Decide if you want to return None here or proceed with potentially incomplete info
                # return None
        if not context.csv_description:
            print("CSV description is empty during edit. Context might be incomplete.")
            # return None
        self.update_context(context) # Update the context with the new document
        # Add the user's edit request
        # Consider adding attached_context if relevant for the edit prompt
        self.message.add_user_text(f"You must rewrite the *entire document* based on the previous response, following my instructions precisely. Remember to keep the ```markdown``` format with the title on the first line.\n\nMy instructions: {prompt}")

        try:
            response = litellm.completion(
                model=self.model,
                messages=self.message.get_conversation()
            )
            response_content = response.choices[0].message.content
            self.message.append_llm_response(response_content)

            # Extract the updated content and name using the reusable method
            document_name, document_content = self._extract_markdown_content(response_content)

            if document_content and document_name:
                return document_content
            else:
                print("Could not extract markdown content from LLM response during edit.")
                return None # Indicate failure if extraction fails

        except Exception as e:
            print(f"Error during litellm completion or processing in edit: {e}")
            return None # Return None on API error or other exceptions
