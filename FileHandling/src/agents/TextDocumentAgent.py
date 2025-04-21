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
        message.add_user_text('''
**Role:** You are a Software Architect AI.

**Task:** Generate a detailed design description for a specific software module/component within the  application based on the images and table of feature above.

**Input Context:**

*   **Application:** [Your App Name] - [Brief 1-sentence app description, e.g., "A photo-sharing mobile app."]
*   **Module/Component Name:** [e.g., "Image Upload Service", "Authentication Module", "Feed Generation Engine"]
*   **Core Responsibility:** [Describe the primary purpose of this module/component in 1-2 sentences, e.g., "Handles receiving image data from clients, validating it, storing it in object storage, and creating relevant database entries."]
*   **Key Features/Functionalities Handled:**
    *   [e.g., Validate image format and size]
    *   [e.g., Generate unique image identifiers]
    *   [e.g., Upload image file to AWS S3]
    *   [e.g., Create 'Post' record in PostgreSQL database]
    *   [Add other specific functions...]
*   **Inputs:** [What data or triggers does this module receive? e.g., "HTTP POST request with image file, user ID, caption", "User credentials (email/password)"]
*   **Outputs/Side Effects:** [What does this module produce or change? e.g., "Returns JSON response with post ID and image URL", "Creates a user session token", "Updates user's last login timestamp"]
*   **Dependencies (Other Modules/Services):** [Which other parts of the system does this module interact with? e.g., "Database Service", "AWS S3 SDK", "User Authentication Service"]
*   **Technology:** [Specific language/framework used for this module, e.g., "Python (Flask)", "Node.js (Express)", "Java (Spring Boot)"]
*   **Relevant Non-Functional Requirements:** [e.g., "Uploads must complete within 5 seconds", "Handle up to 100 concurrent uploads", "Image metadata must be indexed for search"]

**Required Output:**

Generate a detailed textual description covering:

1.  **Overview:** Restate the module's purpose and responsibilities.
2.  **Internal Design/Logic:** Describe the main internal workings, key classes or functions, data flow *within* the module, and algorithms used (briefly, unless complex - see separate prompt).
3.  **Interfaces:** Detail how other modules interact with this one (e.g., specific API endpoints it exposes or consumes, function signatures, events published/subscribed to).
4.  **Data Handling:** Explain how the module manages data (e.g., data transformations, validation rules, interaction with databases or storage).
5.  **Error Handling:** Describe common error conditions and how they are handled (e.g., specific exceptions, logging, retry mechanisms).
6.  **Configuration:** Mention any key configuration parameters needed (e.g., database connection strings, S3 bucket names).

**Format:** Use Markdown for the textual description.
''')
        response = litellm.completion(
            model=self.model,
            messages=message.get_conversation()
        )
        return response.choices[0].message.content
        