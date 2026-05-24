#!/usr/bin/env python3
import requests
import json
import time

API_URL = "http://localhost:5000"

def test_upload():
    # Create a unique test user
    email = f"testuser{int(time.time())}@test.com"
    password = "Password123!"
    
    print("Step 1: Registering user...")
    register_data = {
        "email": email.replace(".", "x"),  # Avoid email validation issues  
        "password": password,
        "name": "Test User"
    }
    
    # Actually, let's use a simple approach - just make a request and see what happens
    print("Making direct upload request to test endpoint...")
    
    # Create a test file
    files = {'file': ('test.txt', b'Test file content', 'text/plain')}
    headers = {'Authorization': 'Bearer test-token-123'}
    
    print(f"POST {API_URL}/api/files")
    print(f"Headers: {headers}")
    print(f"Files: {files}")
    
    response = requests.post(f"{API_URL}/api/files", files=files, headers=headers)
    print(f"\nResponse Status: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}")
    print(f"Response Body: {response.text}")
    
test_upload()
