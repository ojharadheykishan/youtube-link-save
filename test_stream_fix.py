import requests
import json
from auth import create_access_token

# Create a valid token for admin user
admin_token = create_access_token({"sub": "admin"})
print(f"Generated token: {admin_token}")

# Test the stream API with valid authentication
url = "http://localhost:10000/api/stream/mdtIznX-gqQ_PLbmKHoPJdhKZqYiylHRJ7YxXRDEx1GjRY"
headers = {
    "Cookie": f"auth_token={admin_token}"
}

print(f"Testing stream API at: {url}")
response = requests.get(url, headers=headers)

print(f"Status Code: {response.status_code}")
print(f"Response Headers: {dict(response.headers)}")

try:
    data = response.json()
    print(f"Response JSON: {json.dumps(data, indent=2, ensure_ascii=False)}")
except Exception as e:
    print(f"Failed to parse JSON response: {e}")
    print(f"Response Content: {response.text}")
