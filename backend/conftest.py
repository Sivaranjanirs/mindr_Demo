import pytest
import os
import tempfile
from pathlib import Path
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch
import numpy as np

# Create test data directory
@pytest.fixture
def test_data_dir():
    with tempfile.TemporaryDirectory() as temp_dir:
        data_path = Path(temp_dir)
        
        # Create sample markdown files for testing
        (data_path / "test-sleep.md").write_text("""
Title: Sleep Hygiene Basics
Key ideas: Good sleep habits for better rest

## Sleep Tips
1. Maintain consistent sleep schedule
2. Create dark, cool environment
3. Avoid screens before bedtime
4. Exercise regularly but not late
""")
        
        (data_path / "test-nutrition.md").write_text("""
Title: Healthy Nutrition
Key ideas: Balanced diet for wellness

## Nutrition Guidelines  
1. Eat variety of whole foods
2. Stay hydrated throughout day
3. Limit processed foods
4. Include fruits and vegetables
""")
        
        yield data_path

@pytest.fixture
def mock_rag(test_data_dir):
    """Mock RAG instance for testing"""
    with patch('app.rag') as mock:
        # Mock search results
        mock.search.return_value = [
            {
                "text": "Sleep is important for health. Maintain consistent schedule.",
                "source": "test-sleep.md", 
                "score": 0.85
            }
        ]
        yield mock

@pytest.fixture
def test_client():
    """FastAPI test client"""
    from app import app
    return TestClient(app)

@pytest.fixture
def mock_embedding_model():
    """Mock the embedding model to avoid loading actual model in tests"""
    with patch('rag_index.TextEmbedding') as mock:
        # Mock embedding responses
        mock_instance = Mock()
        mock_instance.embed.return_value = iter([np.random.rand(384)])
        mock.return_value = mock_instance
        yield mock_instance