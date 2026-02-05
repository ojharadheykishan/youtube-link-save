import pytest
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

def test_logout_redirect():
    """Test that logout redirects to main page instead of login page"""
    response = client.get("/logout", follow_redirects=False)
    assert response.status_code == 303
    assert response.headers["location"] == "/"
    
    response = client.post("/logout", follow_redirects=False)
    assert response.status_code == 303
    assert response.headers["location"] == "/"

if __name__ == "__main__":
    test_logout_redirect()
    print("✅ Logout redirect test passed!")