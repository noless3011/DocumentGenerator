#!/usr/bin/env python3
"""
Test script to verify the new preview app API endpoints.
"""

import requests
import json
import time
import os

def test_preview_api():
    """Test the preview app API endpoints."""
    
    base_url = "http://localhost:5000"
    test_project_dir = r"d:\ProgrammingProjects\Javascript\DocumentGenerator\data\test_2_2f62a8ab"
    
    print("🧪 Testing Preview App API Endpoints\n")
    
    # Test 1: Check preview status (should be empty initially)
    print("1️⃣ Testing preview status endpoint...")
    try:
        response = requests.get(f"{base_url}/generate/preview/status")
        if response.status_code == 200:
            status = response.json()
            print(f"   ✅ Status: {status}")
        else:
            print(f"   ❌ Status check failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Status check error: {e}")
    
    # Test 2: Test preview endpoint without generation (should return default)
    print("\n2️⃣ Testing preview endpoint without generation...")
    try:
        response = requests.get(f"{base_url}/generate/preview")
        if response.status_code == 200:
            print("   ✅ Preview endpoint accessible")
            print(f"   📄 Content length: {len(response.text)} characters")
        else:
            print(f"   ❌ Preview endpoint failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Preview endpoint error: {e}")
    
    # Test 3: Generate preview app
    print("\n3️⃣ Testing preview app generation...")
    if not os.path.exists(test_project_dir):
        print(f"   ⚠️  Test project not found: {test_project_dir}")
        print("   📁 Available projects:")
        data_dir = r"d:\ProgrammingProjects\Javascript\DocumentGenerator\data"
        if os.path.exists(data_dir):
            for item in os.listdir(data_dir):
                item_path = os.path.join(data_dir, item)
                if os.path.isdir(item_path):
                    print(f"      - {item_path}")
        return
    
    try:
        payload = {"projectDir": test_project_dir}
        response = requests.post(
            f"{base_url}/generate/preview-app",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ Generation successful: {result}")
        else:
            print(f"   ❌ Generation failed: {response.status_code}")
            try:
                error_detail = response.json()
                print(f"   🔍 Error details: {error_detail}")
            except:
                print(f"   🔍 Error text: {response.text}")
    except Exception as e:
        print(f"   ❌ Generation error: {e}")
    
    # Test 4: Check preview after generation
    print("\n4️⃣ Testing preview after generation...")
    try:
        time.sleep(1)  # Wait a moment for generation to complete
        response = requests.get(f"{base_url}/generate/preview")
        if response.status_code == 200:
            content = response.text
            print("   ✅ Preview available after generation")
            print(f"   📄 Content length: {len(content)} characters")
            
            # Check if it contains HTML structure
            if "<!DOCTYPE html" in content and "</html>" in content:
                print("   ✅ Valid HTML structure detected")
            else:
                print("   ⚠️  No HTML structure detected")
        else:
            print(f"   ❌ Preview retrieval failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Preview retrieval error: {e}")
    
    # Test 5: Check updated status
    print("\n5️⃣ Testing updated preview status...")
    try:
        response = requests.get(f"{base_url}/generate/preview/status")
        if response.status_code == 200:
            status = response.json()
            print(f"   ✅ Updated status: {status}")
        else:
            print(f"   ❌ Status check failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Status check error: {e}")
    
    # Test 6: Clear preview
    print("\n6️⃣ Testing preview clear...")
    try:
        response = requests.delete(f"{base_url}/generate/preview")
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ Clear successful: {result}")
        else:
            print(f"   ❌ Clear failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Clear error: {e}")
    
    print("\n🎯 Preview API testing complete!")

if __name__ == "__main__":
    print("🚀 Starting Preview API tests...\n")
    print("⚠️  Make sure the server is running on http://localhost:5000")
    print("   You can start it with: python src/main.py\n")
    
    try:
        # Quick server check
        response = requests.get("http://localhost:5000/health", timeout=5)
        if response.status_code == 200:
            print("✅ Server is running!\n")
            test_preview_api()
        else:
            print("❌ Server health check failed!")
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server. Make sure it's running on port 5000.")
    except Exception as e:
        print(f"❌ Server check error: {e}")
