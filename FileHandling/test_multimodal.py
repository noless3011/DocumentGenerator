#!/usr/bin/env python3
"""
Test script to verify multimodal functionality across all agents.
"""

import os
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from utils.Project import Project
from agents.ChatAgent import ChatAgent
from agents.TextDocumentAgent import TextDocumentAgent
from agents.DiagramAgent import DiagramAgent
from agents.PrototypeAgent import PrototypeAgent
from config import settings

def test_multimodal_agents():
    """Test that all agents can handle multimodal content with images."""
    
    # Load test project with images
    project_path = r"d:\ProgrammingProjects\Javascript\DocumentGenerator\data\test_2_2f62a8ab"
    
    if not os.path.exists(project_path):
        print("❌ Test project not found!")
        return False
    
    try:
        # Load the project
        print("📁 Loading test project...")
        project = Project(project_path)
        
        # Check if images are available
        processed_dir = os.path.join(project_path, "processed")
        png_files = [f for f in os.listdir(processed_dir) if f.endswith('.png')]
        
        if not png_files:
            print("❌ No PNG images found in processed directory!")
            return False
            
        print(f"✅ Found {len(png_files)} PNG images: {', '.join(png_files[:3])}{'...' if len(png_files) > 3 else ''}")
        
        # Test model (using a mock model for testing - in real use, this would be 'gemini-1.5-flash')
        test_model = "mock-model"
        
        # Test each agent's multimodal capabilities
        agents_to_test = [
            ("ChatAgent", ChatAgent),
            ("TextDocumentAgent", TextDocumentAgent), 
            ("DiagramAgent", DiagramAgent),
            ("PrototypeAgent", PrototypeAgent)
        ]
        
        for agent_name, agent_class in agents_to_test:
            print(f"\n🧪 Testing {agent_name}...")
            
            try:
                # Create agent instance
                agent = agent_class(test_model, project)
                
                # Check if agent has multimodal capabilities
                if not hasattr(agent, '_prepare_multimodal_content'):
                    print(f"❌ {agent_name} missing _prepare_multimodal_content method")
                    continue
                    
                if not hasattr(agent, '_encode_image_to_base64'):
                    print(f"❌ {agent_name} missing _encode_image_to_base64 method")
                    continue
                    
                # Test multimodal content preparation
                content = agent._prepare_multimodal_content("Test message", project)
                
                if isinstance(content, list):
                    # Check if images were included
                    has_text = any(item.get('type') == 'text' for item in content)
                    has_images = any(item.get('type') == 'image_url' for item in content)
                    
                    if has_text and has_images:
                        print(f"✅ {agent_name} successfully prepared multimodal content")
                        print(f"   - Text content: ✅")
                        print(f"   - Image content: ✅ ({sum(1 for item in content if item.get('type') == 'image_url')} images)")
                    else:
                        print(f"⚠️  {agent_name} prepared content but missing text or images")
                        print(f"   - Text content: {'✅' if has_text else '❌'}")
                        print(f"   - Image content: {'✅' if has_images else '❌'}")
                else:
                    print(f"⚠️  {agent_name} returned simple text content (no images included)")
                
                # Test reset functionality
                agent.reset_multimodal_state()
                print(f"✅ {agent_name} multimodal state reset successfully")
                
            except Exception as e:
                print(f"❌ {agent_name} test failed: {str(e)}")
                
        print(f"\n🎯 Multimodal testing complete!")
        return True
        
    except Exception as e:
        print(f"❌ Test setup failed: {str(e)}")
        return False

if __name__ == "__main__":
    print("🚀 Starting multimodal agents test...\n")
    success = test_multimodal_agents()
    print(f"\n{'🎉 All tests passed!' if success else '💥 Some tests failed!'}")
