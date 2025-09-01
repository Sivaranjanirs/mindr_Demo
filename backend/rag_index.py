import os, glob, re
from typing import List, Dict
from pathlib import Path
import numpy as np
from fastembed import TextEmbedding

def _chunk(text: str, size=600, overlap=80):
    text = re.sub(r"\s+", " ", text).strip()
    chunks = []
    i = 0
    while i < len(text):
        chunks.append(text[i:i+size])
        i += size - overlap
    return chunks

class LocalRAG:
    def __init__(self, data_dir: str | os.PathLike, model_name="sentence-transformers/all-MiniLM-L6-v2"):
        self.data_dir = Path(data_dir)
        self.model = TextEmbedding(model_name=model_name)
        self.texts: List[str] = []
        self.meta: List[Dict] = []
        self._load()
        self._build()

    def _load(self):
        for fp in sorted(self.data_dir.glob("*.md")):
            raw = fp.read_text(encoding="utf-8")
            for idx, ch in enumerate(_chunk(raw)):
                self.texts.append(ch)
                self.meta.append({"source": fp.name, "chunk": idx})

    def _build(self):
        if not self.texts:
            print(f"Warning: No text files found in {self.data_dir}")
            self.embs = np.array([]).reshape(0, 384)  # Empty array with correct dimensions
            return
        embs = np.stack(list(self.model.embed(self.texts)))
        self.embs = embs / (np.linalg.norm(embs, axis=1, keepdims=True) + 1e-12)

    def search(self, query: str, k: int = 4):
        if len(self.texts) == 0:
            return []
        q = next(self.model.embed([query]))
        q = q / (np.linalg.norm(q) + 1e-12)
        sims = self.embs @ q  # cosine
        order = np.argsort(-sims)

        # Return top k results by relevance, not limited by source
        out = []
        for idx in order[:k]:
            out.append({
                "text": self.texts[idx],
                "source": self.meta[idx]["source"],
                "score": float(sims[idx])
            })
        return out
    
    def search_enhanced(self, query: str, keywords: list, k: int = 4):
        """Enhanced search with keyword overlap and field boosting"""
        q = next(self.model.embed([query]))
        q = q / (np.linalg.norm(q) + 1e-12)
        cosine_sims = self.embs @ q
        
        # Calculate enhanced scores with keyword overlap and field boosting
        enhanced_scores = []
        query_lower = query.lower()
        
        for idx, text in enumerate(self.texts):
            text_lower = text.lower()
            
            # Start with cosine similarity
            score = float(cosine_sims[idx])
            
            # Add keyword overlap bonus (lightweight)
            keyword_matches = sum(1 for kw in keywords if kw in text_lower)
            if keyword_matches > 0:
                score += 0.1 * keyword_matches  # 10% boost per keyword match
            
            # Extra boost if query hits Title/Key-ideas fields
            lines = text.split('\n')
            for line in lines[:3]:  # Check first 3 lines for title/key content
                line_lower = line.lower()
                if ('title:' in line_lower or 'key ideas:' in line_lower):
                    # Check if any query words appear in these important fields
                    query_words = query_lower.split()
                    field_matches = sum(1 for word in query_words if word in line_lower)
                    if field_matches > 0:
                        score += 0.15 * field_matches  # 15% boost for title/key field matches
                        break
            
            enhanced_scores.append((idx, score))
        
        # Sort by enhanced score
        enhanced_scores.sort(key=lambda x: x[1], reverse=True)
        
        # Return top k results
        out = []
        for idx, score in enhanced_scores[:k]:
            out.append({
                "text": self.texts[idx],
                "source": self.meta[idx]["source"],
                "score": score
            })
        return out
    
    def get_best_from_source(self, query: str, keywords: list, source_name: str):
        """Get the best matching chunk from a specific source"""
        q = next(self.model.embed([query]))
        q = q / (np.linalg.norm(q) + 1e-12)
        
        best_idx = -1
        best_score = -1
        
        for idx, meta in enumerate(self.meta):
            if meta["source"] == source_name:
                score = float(self.embs[idx] @ q)
                
                # Add keyword bonus
                text_lower = self.texts[idx].lower()
                keyword_matches = sum(1 for kw in keywords if kw in text_lower)
                score += 0.1 * keyword_matches
                
                if score > best_score:
                    best_score = score
                    best_idx = idx
        
        if best_idx >= 0:
            return {
                "text": self.texts[best_idx],
                "source": self.meta[best_idx]["source"],
                "score": best_score
            }
        return None
