#!/usr/bin/env python3
"""
Test script for the new serve API functionality.
"""
import requests
import json

def test_serve_api():
    """Test the serve API endpoints."""
    base_url = "http://localhost:5000"
    
    print("🚀 Starting Serve API tests...")
    print("\n⚠️  Make sure the server is running on http://localhost:5000")
    
    # Test if server is running
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Server is running!")
        else:
            print("❌ Server health check failed")
            return
    except requests.exceptions.RequestException as e:
        print(f"❌ Server is not responding: {e}")
        return
    
    print("\n🧪 Testing Serve API Endpoints")
    
    # Test 1: List HTML files for test_3_2f7b8850 (known to have prototype.html)
    project_id = "test_3_2f7b8850"
    print(f"1️⃣ Testing list files endpoint for project {project_id}...")
    try:
        response = requests.get(f"{base_url}/serve/projects/{project_id}/files")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Files found: {data['count']} HTML files")
            for file in data['html_files']:
                print(f"      📄 {file['filename']} ({file['size']} bytes)")
                print(f"         URL: {file['url']}")
        else:
            print(f"   ❌ Failed: {response.status_code} - {response.text}")
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Request failed: {e}")
    
    # Test 2: Serve a specific HTML file
    print(f"\n2️⃣ Testing HTML file serving...")
    try:
        response = requests.get(f"{base_url}/serve/html/{project_id}/test_3_prototype.html")
        if response.status_code == 200:
            content = response.text
            print(f"   ✅ HTML file served successfully")
            print(f"   📄 Content length: {len(content)} characters")
            if content.strip().startswith('<!DOCTYPE html') or content.strip().startswith('<html'):
                print("   ✅ Valid HTML structure detected")
            else:
                print("   ⚠️  Content doesn't appear to be valid HTML")
        else:
            print(f"   ❌ Failed: {response.status_code} - {response.text}")
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Request failed: {e}")
    
    # Test 3: Test with non-existent project
    print(f"\n3️⃣ Testing with non-existent project...")
    try:
        response = requests.get(f"{base_url}/serve/projects/nonexistent/files")
        if response.status_code == 404:
            print("   ✅ Correctly returned 404 for non-existent project")
        else:
            print(f"   ❌ Unexpected response: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Request failed: {e}")
    
    print("\n🎯 Serve API testing complete!")

if __name__ == "__main__":
    test_serve_api()
