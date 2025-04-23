import litellm
import json
from typing import List, Dict, Any
from utils.Message import Message
from utils.Context import Context
from flask import current_app
from agents.IAgent import IAgent
class TextDocumentAgent(IAgent):
    def __init__(self, model:str):
        self.model = model
        self.message = Message()

    def generate(self, context: Context) -> str:
        """Generate a document using Gemini API with both image and CSV data."""
        for key in context.requirements:
            # if any value is empty, return None
            if not context.requirements[key]:
                return None
        # Check if the CSV file is empty
        if not context.csv_description:
            return None
        program_features_str = ""
        if context.requirements.features:
            program_features_str = "\n".join([f"  + {feature_name}: {feature_desc}" for feature_name, feature_desc in context.requirements.features.items()] )
        
        generated_text_doc_str = ""
        if context.generated_text_doc:
            generated_text_doc_str = "\n".join([f"  === {doc_name}: {doc_text} \n===" for doc_name, doc_text in context.generated_text_doc.items()])

        self.message.add_user_text(f'''
You are a document writer for a programming project, you are capable of writing a dynamic range of document. You will be provided with a the context of the program.
You will generate a document in the markdown format. You have to put the document in the code block with the ```markdown``` tag. At the beginning, you must have the name of the project.

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
- Your thinking process
```markdown
Software Requirements Specification
The content of the document.
```
        ''')
        for image in context.diagram_image:
            # Add the image to the message
            self.message.add_user_image_from_file(image)

        response = litellm.completion(
            model=self.model,
            messages=self.message.get_conversation()
        )
        self.message.append_llm_response(response.choices[0].message.content)
        # extract the content of the document in the ```markdown``` format
        document_content = response.choices[0].message.content.split('```markdown')[1].split('```')[0]
        document_name = document_content.split('\n')[0].strip()
        document_name = ''.join(e for e in document_name if e.isalnum())
        context.generated_text_doc[document_name] = document_content
        return document_content
    
    def update_context(self, context: Context) -> None:
        for key in context.requirements:
            # if any value is empty, return None
            if not context.requirements[key]:
                return None
        # Check if the CSV file is empty
        if not context.csv_description:
            return None
        program_features_str = ""
        if context.requirements.features:
            program_features_str = "\n".join([f"  + {feature_name}: {feature_desc}" for feature_name, feature_desc in context.requirements.features.items()] )
        
        generated_text_doc_str = ""
        if context.generated_text_doc:
            generated_text_doc_str = "\n".join([f"  === {doc_name}: {doc_text} \n===" for doc_name, doc_text in context.generated_text_doc.items()])

        new_init_message = f'''
You are a document writer for a programming project, you are capable of writing a dynamic range of document. You will be provided with a the context of the program.
You will generate a document in the markdown format. You have to put the document in the code block with the ```markdown``` tag. At the beginning, you must have the name of the project.

Please be extremely meticulous and detailed in your documentation. Consider all edge cases, implementation details, and ensure technical accuracy in every section. Be thorough and precise with your explanations. Provide comprehensive code examples where appropriate, and explain each component's purpose and functionality.

Document the architecture thoroughly, including design patterns used, data flows, and component interactions. Include diagrams if possible (by describing them textually). Elaborate on performance considerations, security implications, and scalability aspects of the solution.

When documenting APIs, include complete parameter descriptions, return values, error handling, and usage examples. For complex algorithms, explain the underlying principles, time/space complexity, and alternative approaches considered.

Here is the infomation about the project:
- Project Name: {context.project_name}
- The program input requirement: {context.requirements.input_description}
- The program output requirement: {context.requirements.output_description}
- The program features: {program_features_str}
- Here is the tech stack of the program: {context.tech_stack}
- The program further requirements: {context.requirements.further_requirements}
- Here is the already generated text document. You must follow the document generated from before strictly to maintain the consistency of the program, do not violate this consistency that previous document. If this part dont have anything that mean this is the first text document generated. You will have to think thouroughly, planning so future document can depend on this document to generate further 
{generated_text_doc_str}

Remember to validate your document against all requirements, ensure all technical details are accurate, and provide comprehensive coverage of all features and functionalities. Be systematic and leave no aspect undocumented. Your documentation should serve as a definitive reference that anticipates and answers all potential questions users might have about the system.
Example of the output:
- Your thinking process
```markdown
Software Requirements Specification
The content of the document.
```
        '''
        self.message.replace_init_message(new_init_message)

    def edit(self, prompt:str, attached_context: str, context:Context) -> str:
        """Edit a document using the provided message and context."""
        if len(self.message.messages) == 0:
            return None
        for key in context.requirements:
            # if any value is empty, return None
            if not context.requirements[key]:
                return None
        # Check if the CSV file is empty
        if not context.csv_description:
            return None

        self.message.add_user_text("You must rewrite the whole document with the specified format when follow my prompt. My prompt: "+prompt)
        response = litellm.completion(
            model=self.model,
            messages=self.message.get_conversation()
        )
        self.message.append_llm_response(response.choices[0].message.content)
        # extract the content of the document in the ```markdown``` format
        document_content = response.choices[0].message.content.split('```markdown')[1].split('```')[0]
        document_name = document_content.split('\n')[0].strip()
        document_name = ''.join(e for e in document_name if e.isalnum())
        context.generated_text_doc[document_name] = document_content
        return document_content

