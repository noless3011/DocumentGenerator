import base64
import os
from typing import Optional, List, Dict, Any
from utils.Project import Project


class MultimodalMixin:
    """
    Mixin class that provides multimodal capabilities (image handling) to agents.
    """
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.images_sent = False  # Track if images have been sent already
    
    def _encode_image_to_base64(self, image_path: str) -> Optional[str]:
        """Encode an image file to base64 string."""
        try:
            with open(image_path, 'rb') as image_file:
                encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
                return encoded_string
        except Exception as e:
            print(f"Error encoding image {image_path}: {e}")
            return None
    
    def _prepare_multimodal_content(self, prompt: str, include_images: bool = True) -> List[Dict[str, Any]]:
        """
        Prepare multimodal content including text and images for the user message.
        
        Args:
            prompt: The text prompt
            include_images: Whether to include images (default True)
            
        Returns:
            List of content objects for multimodal message
        """
        # Add images only on the first message and if we have a project with images
        if include_images and not self.images_sent and hasattr(self, 'project') and self.project:
            image_paths = self.project.get_image_dirs()
            
            if image_paths:
                print(f"Adding {len(image_paths)} images to multimodal message")
                
                # Create enhanced prompt with image context
                image_filenames = [os.path.basename(path) for path in image_paths[:10]]
                enhanced_prompt = f"""{prompt}

Note: I'm also analyzing {len(image_filenames)} images from this project's processed directory:
{', '.join(image_filenames)}

Please consider these images when generating the response."""
                
                content = [{"type": "text", "text": enhanced_prompt}]
                
                for image_path in image_paths[:10]:  # Limit to first 10 images to avoid token limits
                    encoded_image = self._encode_image_to_base64(image_path)
                    if encoded_image:
                        # Get file extension to determine mime type
                        file_extension = os.path.splitext(image_path)[1].lower()
                        mime_type = "image/png" if file_extension == ".png" else "image/jpeg"
                        
                        content.append({
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{encoded_image}"
                            }
                        })
                
                self.images_sent = True  # Mark that images have been sent
                return content
        
        # If no images or images already sent, return simple text content
        return [{"type": "text", "text": prompt}]
    
    def reset_multimodal_state(self) -> None:
        """Reset the multimodal state to allow sending images again on the next message."""
        self.images_sent = False
    
    def update_context(self, project: Project) -> None:
        """
        Update the agent with the current project context.
        This method should be called by inheriting classes.
        """
        if hasattr(super(), 'update_context'):
            super().update_context(project)
        self.images_sent = False  # Reset when context changes
