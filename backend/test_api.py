import pytest
import json
from unittest.mock import patch, Mock

class TestHealthEndpoint:
    """Test suite for the /health endpoint"""
    
    def test_health_endpoint_success(self, test_client, mock_rag):
        """Test health endpoint returns correct status"""
        # Mock RAG to return test data
        mock_rag.texts = ["test text 1", "test text 2"]
        mock_rag.meta = [{"source": "test1.md"}, {"source": "test2.md"}]
        
        response = test_client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields
        assert data["ok"] is True
        assert "snippets" in data
        assert "files" in data
        assert "timestamp" in data
        assert "version" in data
        assert "status" in data
        assert "ops_truth" in data
        assert "latency_report" in data
        assert "request_count" in data
        
        # Verify health data structure
        assert data["status"] == "operational"
        assert isinstance(data["ops_truth"], dict)
        assert "health" in data["ops_truth"]
    
    def test_health_endpoint_with_empty_rag(self, test_client):
        """Test health endpoint when RAG has no data"""
        with patch('app.rag') as mock_rag:
            mock_rag.texts = []
            mock_rag.meta = []
            
            response = test_client.get("/health")
            
            assert response.status_code == 200
            data = response.json()
            assert data["snippets"] == 0
            assert data["files"] == 0

class TestChatEndpoint:
    """Test suite for the /chat endpoint"""
    
    def test_chat_endpoint_success(self, test_client, mock_rag):
        """Test successful chat interaction"""
        # Mock RAG search results
        mock_rag.search_enhanced.return_value = [
            {
                "text": "Sleep is crucial for health. Here are some tips:",
                "source": "sleep-hygiene.md",
                "score": 0.9
            }
        ]
        
        response = test_client.post(
            "/chat",
            json={"message": "Tell me about sleep"}
        )
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/event-stream; charset=utf-8"
        
        # Verify SSE stream contains expected data
        content = response.text
        assert "data: " in content
        assert '"token":' in content or '"sources":' in content
    
    def test_chat_endpoint_medical_question(self, test_client, mock_rag):
        """Test medical question detection and appropriate response"""
        response = test_client.post(
            "/chat", 
            json={"message": "Can you diagnose my headache?"}
        )
        
        assert response.status_code == 200
        content = response.text
        
        # Should contain medical disclaimer
        assert any(keyword in content.lower() for keyword in 
                  ["educational", "medical", "doctor", "healthcare"])
    
    def test_chat_endpoint_invalid_input(self, test_client):
        """Test chat endpoint with invalid input"""
        response = test_client.post("/chat", json={})
        assert response.status_code == 422
        
        response = test_client.post("/chat", json={"message": ""})
        assert response.status_code == 422
        
        response = test_client.post("/chat", json={"wrong_field": "test"})
        assert response.status_code == 422
    
    def test_chat_endpoint_long_message(self, test_client, mock_rag):
        """Test chat endpoint with very long message"""
        long_message = "test " * 1000  # 5000 characters
        
        response = test_client.post(
            "/chat",
            json={"message": long_message}
        )
        
        assert response.status_code == 200
    
    def test_chat_endpoint_special_characters(self, test_client, mock_rag):
        """Test chat endpoint with special characters and unicode"""
        special_message = "Hello! 🧠 How about émojis & spéciàl chars? <script>alert('test')</script>"
        
        response = test_client.post(
            "/chat",
            json={"message": special_message}
        )
        
        assert response.status_code == 200

class TestCORSHeaders:
    """Test CORS configuration"""
    
    def test_cors_preflight(self, test_client):
        """Test CORS preflight request"""
        response = test_client.options(
            "/chat",
            headers={
                "Origin": "http://localhost",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type"
            }
        )
        
        assert response.status_code == 200
        assert "access-control-allow-origin" in response.headers
        assert response.headers["access-control-allow-origin"] == "http://localhost"
    
    def test_cors_actual_request(self, test_client, mock_rag):
        """Test CORS headers on actual request"""
        response = test_client.post(
            "/chat",
            json={"message": "test"},
            headers={"Origin": "http://localhost"}
        )
        
        assert response.status_code == 200
        # Note: TestClient doesn't automatically add CORS headers, 
        # but this tests the endpoint works with Origin header

class TestSecurityFeatures:
    """Test security features like PHI redaction"""
    
    def test_phi_redaction_email(self, test_client, mock_rag):
        """Test that emails are redacted from responses"""
        message_with_email = "My email is test@example.com, can you help?"
        
        response = test_client.post(
            "/chat",
            json={"message": message_with_email}
        )
        
        assert response.status_code == 200
        # The redaction happens in the streaming response
        content = response.text
        assert "test@example.com" not in content
    
    def test_phi_redaction_phone(self, test_client, mock_rag):
        """Test that phone numbers are redacted"""
        message_with_phone = "Call me at 555-123-4567 for more info"
        
        response = test_client.post(
            "/chat", 
            json={"message": message_with_phone}
        )
        
        assert response.status_code == 200
        content = response.text
        assert "555-123-4567" not in content

class TestLatencyMetrics:
    """Test latency tracking functionality"""
    
    def test_latency_metrics_updated(self, test_client, mock_rag):
        """Test that latency metrics are updated after requests"""
        # Make a request to populate metrics
        response = test_client.post(
            "/chat",
            json={"message": "test latency"}
        )
        
        assert response.status_code == 200
        
        # Check health endpoint shows updated metrics
        health_response = test_client.get("/health")
        health_data = health_response.json()
        
        # After one request, request_count should be at least 1
        assert health_data["request_count"] >= 1
        assert "latency_report" in health_data
    
    def test_health_metrics_format(self, test_client):
        """Test health metrics have correct format"""
        response = test_client.get("/health")
        data = response.json()
        
        # Verify latency report format
        latency_report = data["latency_report"]
        assert "ms p50" in latency_report
        assert "ms p95" in latency_report
        assert "Retrieve" in latency_report
        assert "total" in latency_report