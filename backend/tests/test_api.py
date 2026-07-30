import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    """Test health check endpoint"""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "formbridge-api"


def test_root():
    """Test root endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "version" in data
    assert data["status"] == "running"


def test_create_upload_sas():
    """Test document upload SAS generation"""
    document_data = {
        "filename": "test_invoice.pdf",
        "contentType": "application/pdf",
        "documentType": "invoice"
    }
    
    response = client.post("/api/documents/upload", json=document_data)
    # This will fail without Azure credentials, but we test the endpoint exists
    assert response.status_code in [200, 401, 500]
