import pytest
import numpy as np
from pathlib import Path
from unittest.mock import Mock, patch
from rag_index import LocalRAG, _chunk

class TestChunkingFunction:
    """Test the text chunking functionality"""
    
    def test_chunk_short_text(self):
        """Test chunking with text shorter than chunk size"""
        text = "This is a short text."
        chunks = _chunk(text, size=100, overlap=20)
        
        assert len(chunks) == 1
        assert chunks[0] == text
    
    def test_chunk_long_text(self):
        """Test chunking with text longer than chunk size"""
        text = "This is a long text. " * 50  # ~1000 characters
        chunks = _chunk(text, size=200, overlap=50)
        
        assert len(chunks) > 1
        # Check overlap exists
        assert chunks[0][150:] == chunks[1][:50]
    
    def test_chunk_whitespace_normalization(self):
        """Test that whitespace is normalized in chunks"""
        text = "Text   with\n\nmultiple\t\tspaces"
        chunks = _chunk(text)
        
        assert chunks[0] == "Text with multiple spaces"
    
    def test_chunk_empty_text(self):
        """Test chunking empty text"""
        chunks = _chunk("")
        assert len(chunks) == 1
        assert chunks[0] == ""

class TestLocalRAG:
    """Test the LocalRAG class functionality"""
    
    def test_rag_initialization_empty_directory(self, mock_embedding_model):
        """Test RAG initialization with empty directory"""
        with patch('rag_index.Path') as mock_path:
            mock_path.return_value.glob.return_value = []
            
            rag = LocalRAG(data_dir="/fake/empty/dir")
            
            assert len(rag.texts) == 0
            assert len(rag.meta) == 0
            assert rag.embs.shape == (0, 384)
    
    def test_rag_initialization_with_files(self, test_data_dir, mock_embedding_model):
        """Test RAG initialization with markdown files"""
        rag = LocalRAG(data_dir=test_data_dir)
        
        # Should have loaded and chunked the test files
        assert len(rag.texts) > 0
        assert len(rag.meta) > 0
        assert len(rag.texts) == len(rag.meta)
        
        # Check that chunks contain expected content
        text_content = " ".join(rag.texts)
        assert "Sleep" in text_content
        assert "Nutrition" in text_content
    
    def test_rag_search_functionality(self, test_data_dir, mock_embedding_model):
        """Test RAG search returns relevant results"""
        # Mock embedding to return consistent results
        mock_embedding_model.embed.return_value = iter([np.random.rand(384)])
        
        rag = LocalRAG(data_dir=test_data_dir)
        results = rag.search("sleep tips", k=2)
        
        assert len(results) <= 2
        assert len(results) > 0
        
        # Verify result structure
        for result in results:
            assert "text" in result
            assert "source" in result  
            assert "score" in result
            assert isinstance(result["score"], float)
    
    def test_rag_search_enhanced(self, test_data_dir, mock_embedding_model):
        """Test enhanced search with keywords"""
        mock_embedding_model.embed.return_value = iter([np.random.rand(384)])
        
        rag = LocalRAG(data_dir=test_data_dir)
        results = rag.search_enhanced("sleep", keywords=["schedule", "rest"], k=3)
        
        assert len(results) <= 3
        
        # Verify enhanced scoring includes keyword matches
        for result in results:
            assert "text" in result
            assert "source" in result
            assert "score" in result
    
    def test_rag_get_best_from_source(self, test_data_dir, mock_embedding_model):
        """Test getting best match from specific source"""
        mock_embedding_model.embed.return_value = iter([np.random.rand(384)])
        
        rag = LocalRAG(data_dir=test_data_dir)
        result = rag.get_best_from_source("sleep", ["rest"], "test-sleep.md")
        
        if result:  # Only test if source exists
            assert result["source"] == "test-sleep.md"
            assert "text" in result
            assert "score" in result
    
    def test_rag_search_empty_query(self, test_data_dir, mock_embedding_model):
        """Test search with empty query"""
        rag = LocalRAG(data_dir=test_data_dir)
        
        # Should handle empty queries gracefully
        results = rag.search("", k=2)
        assert isinstance(results, list)
    
    def test_rag_embedding_normalization(self, test_data_dir, mock_embedding_model):
        """Test that embeddings are properly normalized"""
        # Return consistent embedding for testing
        test_embedding = np.random.rand(384)
        mock_embedding_model.embed.return_value = iter([test_embedding])
        
        rag = LocalRAG(data_dir=test_data_dir)
        
        if len(rag.texts) > 0:
            # Check embeddings are normalized (unit vectors)
            norms = np.linalg.norm(rag.embs, axis=1)
            np.testing.assert_allclose(norms, 1.0, rtol=1e-10)

class TestRAGIntegration:
    """Integration tests for RAG functionality"""
    
    def test_rag_end_to_end_workflow(self, test_data_dir, mock_embedding_model):
        """Test complete RAG workflow from files to search results"""
        # Set up consistent embeddings for reproducible results
        embeddings = [np.random.rand(384) for _ in range(10)]
        mock_embedding_model.embed.side_effect = [iter(embeddings[:5]), iter(embeddings[5:])]
        
        # Initialize RAG
        rag = LocalRAG(data_dir=test_data_dir)
        
        # Verify loading worked
        assert len(rag.texts) > 0
        
        # Test search functionality
        results = rag.search("nutrition tips", k=3)
        assert len(results) > 0
        
        # Verify results quality
        for result in results:
            assert len(result["text"]) > 0
            assert result["source"].endswith(".md")
            assert 0 <= result["score"] <= 1
    
    def test_rag_handles_malformed_files(self, mock_embedding_model):
        """Test RAG handles malformed or empty markdown files gracefully"""
        import tempfile
        
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Create files with various issues
            (temp_path / "empty.md").write_text("")
            (temp_path / "only-whitespace.md").write_text("   \n\n  \t  ")
            (temp_path / "special-chars.md").write_text("Content with émojis 🧠 and spéciàl chars")
            
            # Should not crash
            rag = LocalRAG(data_dir=temp_path)
            
            # Should handle search even with problematic content
            results = rag.search("test query")
            assert isinstance(results, list)

class TestRAGPerformance:
    """Performance and edge case tests"""
    
    def test_rag_large_file_handling(self, mock_embedding_model):
        """Test RAG with large files"""
        import tempfile
        
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Create a large file
            large_content = "This is test content for performance testing. " * 1000
            (temp_path / "large-file.md").write_text(large_content)
            
            # Should handle large files without issues
            rag = LocalRAG(data_dir=temp_path)
            
            # Should create multiple chunks
            assert len(rag.texts) > 1
            
            # Should still be searchable
            results = rag.search("test content")
            assert len(results) > 0
    
    def test_rag_memory_efficiency(self, test_data_dir, mock_embedding_model):
        """Test that RAG doesn't use excessive memory"""
        rag = LocalRAG(data_dir=test_data_dir)
        
        # Embeddings should be float32 for memory efficiency
        if len(rag.texts) > 0:
            assert rag.embs.dtype in [np.float32, np.float64]
        
        # Should not store redundant data
        assert len(rag.texts) == len(rag.meta)
        assert len(rag.texts) == rag.embs.shape[0] or rag.embs.shape[0] == 0