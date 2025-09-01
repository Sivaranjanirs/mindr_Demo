from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import asyncio, json, re, uuid, time
from pathlib import Path
from rag_index import LocalRAG
from typing import List, Dict
from collections import deque
import statistics

app = FastAPI()

# Allow frontend to talk to backend (both dev and container environments)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost", "http://localhost:80"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# simplistic demo redactor: emails/phones get masked
import re
PHI_PATTERNS = [re.compile(r'\b[\w\.-]+@[\w\.-]+\.\w+\b'),
                re.compile(r'\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b')]
def deidentify(text:str)->str:
    for pat in PHI_PATTERNS:
        text = pat.sub("[REDACTED]", text)
    return text

# Use container data path or fall back to repo path for local dev
DATA_DIR = Path("/app/data/snippets") if Path("/app/data/snippets").exists() else Path(__file__).resolve().parents[1] / "data" / "snippets"
rag = LocalRAG(data_dir=DATA_DIR)

# Latency tracking - keep last 100 requests
latency_metrics = {
    "retrieve_times": deque(maxlen=100),
    "total_stream_times": deque(maxlen=100)
}

# Intent Hint Router - keyword to document mapping
INTENT_MAP = {
    "sleep": ["sleep-hygiene.md"],
    "exercise": ["exercise-aerobic.md"], 
    "diet": ["mind-diet.md"],
    "nutrition": ["mind-diet.md"],
    "stress": ["stress-management.md"],
    "anxiety": ["stress-management.md"],
    "workout": ["exercise-aerobic.md"],
    "fitness": ["exercise-aerobic.md"]
}

def extract_keywords(query: str) -> List[str]:
    """Extract meaningful keywords from query"""
    query = query.lower()
    words = re.findall(r'\b\w+\b', query)
    # Filter out common stop words
    stop_words = {"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "how", "what", "when", "where", "why", "tips", "help", "advice", "guide"}
    return [w for w in words if w not in stop_words and len(w) > 2]

def is_medical_query(query: str) -> bool:
    """Detect medical/diagnostic queries that are out of scope"""
    medical_keywords = [
        "diagnose", "diagnosis", "disease", "disorder", "syndrome", "condition",
        "symptoms", "treatment", "medication", "medicine", "pills", "prescription",
        "doctor", "physician", "hospital", "clinic", "emergency", "urgent",
        "cancer", "diabetes", "heart attack", "stroke", "depression", "anxiety disorder",
        "alzheimer", "dementia", "bipolar", "schizophrenia", "adhd", "autism",
        "pain", "hurt", "injury", "wound", "infection", "fever", "sick", "illness",
        "blood pressure", "cholesterol", "thyroid", "liver", "kidney", "lung"
    ]
    
    diagnostic_patterns = [
        r'\b(do i have|am i|could i have|might i have)\b.*\b(disease|disorder|condition)\b',
        r'\b(what (is|are) my|check my|test my)\b.*\b(symptoms|levels|results)\b',
        r'\b(should i see|need to see|go to)\b.*\b(doctor|physician|hospital|er|emergency)\b'
    ]
    
    query_lower = query.lower()
    
    # Check for medical keywords
    for keyword in medical_keywords:
        if keyword in query_lower:
            return True
    
    # Check for diagnostic patterns
    for pattern in diagnostic_patterns:
        if re.search(pattern, query_lower):
            return True
    
    return False

def get_medical_redirect_response():
    """Return safe medical redirect message"""
    return {
        "text": "I'm designed to provide general wellness guidance, not medical advice. For health concerns, symptoms, or medical questions, please consult with a healthcare professional.\n\n🏥 If this is urgent: Call 911 or go to your nearest emergency room\n📞 For non-urgent care: Contact your primary care physician\n🩺 Find local healthcare: Search for providers in your area\n\nI'm happy to help with general wellness topics like sleep hygiene, nutrition basics, exercise routines, or stress management techniques instead!",
        "bullets": [
            "Consult a healthcare professional for any medical concerns, symptoms, or health questions - starting immediately if urgent.",
            "Call 911 or visit an emergency room for urgent health issues - don't delay if experiencing serious symptoms.",
            "Contact your primary care physician for non-urgent health questions - schedule an appointment within a few days.",
            "Focus on general wellness practices like good sleep, nutrition, and exercise - these support overall health but don't replace medical care."
        ],
        "sources": [
            {
                "name": "medical-disclaimer.md",
                "preview": "This service provides general wellness information only and should not replace professional medical advice, diagnosis, or treatment.",
                "score": 1.0
            }
        ]
    }

def compose_bullet(text: str, query_keywords: List[str]) -> str:
    """Transform raw snippet into behavior change format: Do X, How Often, Starting When"""
    
    # Split into sentences and find best content
    sentences = text.split(".")
    content_sentences = []
    
    for sentence in sentences:
        sentence = sentence.strip()
        
        # Skip metadata lines
        if (sentence.startswith("Title:") or 
            sentence.startswith("source:") or 
            len(sentence) < 20):
            continue
            
        # Remove field labels
        clean_sentence = re.sub(r'^[^:]+:\s*', '', sentence)
        if clean_sentence and len(clean_sentence) > 15:
            content_sentences.append(clean_sentence)
    
    if not content_sentences:
        return "Focus on this wellness practice regularly, starting this week."
    
    # Find the most relevant sentence
    best_sentence = content_sentences[0]
    best_score = 0
    
    for sentence in content_sentences:
        score = 0
        # Boost if contains query keywords
        for keyword in query_keywords:
            if keyword in sentence.lower():
                score += 3
        # Boost if has specific numbers or frequencies
        if re.search(r'\d+', sentence):
            score += 2
        # Boost if mentions time/frequency
        if any(word in sentence.lower() for word in ['daily', 'weekly', 'times', 'minutes', 'hours', 'days']):
            score += 2
            
        if score > best_score:
            best_score = score
            best_sentence = sentence
    
    # Transform into behavior change format
    bullet = transform_to_behavior_change(best_sentence)
    
    return bullet[:200] + "…" if len(bullet) > 200 else bullet

def calculate_percentiles(values: List[float], p50: bool = True, p95: bool = True) -> Dict[str, float]:
    """Calculate p50 and p95 percentiles from a list of values"""
    if not values:
        return {"p50": 0, "p95": 0}
    
    result = {}
    if p50:
        result["p50"] = statistics.median(values)
    if p95:
        result["p95"] = statistics.quantiles(values, n=20)[18] if len(values) >= 20 else max(values)
    
    return result

def transform_to_behavior_change(sentence: str) -> str:
    """Transform sentence into 'Do X, How Often, Starting When' format"""
    
    # Extract frequency information if present
    frequency_patterns = {
        r'(\d+)\s*times?\s*(per\s+|a\s+)?(day|week|month)': r'\1 times \3ly',
        r'(\d+)\s*minutes?\s*(per\s+|a\s+)?(day|daily)': r'\1 minutes daily',
        r'(\d+)\s*hours?\s*(per\s+|a\s+)?(day|week)': r'\1 hours per \3',
        r'daily|every\s+day': 'daily',
        r'weekly|every\s+week|once\s+a\s+week': 'weekly',
        r'(\d+[-–]\d+)\s*(times|hours|minutes)': r'\1 \2',
        r'(\d+)\s*servings?': r'\1 servings',
    }
    
    frequency = "regularly"
    for pattern, replacement in frequency_patterns.items():
        match = re.search(pattern, sentence, re.IGNORECASE)
        if match:
            if 'times' in replacement or 'minutes' in replacement or 'hours' in replacement:
                frequency = re.sub(pattern, replacement, sentence, flags=re.IGNORECASE)
                frequency = re.search(r'(\d+(?:[-–]\d+)?\s*(?:times|minutes|hours|servings)(?:\s+(?:daily|weekly|per\s+\w+))?)', frequency, re.IGNORECASE)
                frequency = frequency.group(1) if frequency else "regularly"
            else:
                frequency = replacement
            break
    
    # Extract the main action
    action_verbs = ['aim', 'try', 'practice', 'maintain', 'keep', 'create', 'use', 'avoid', 'limit', 'stop', 'start', 'include', 'eat', 'drink', 'exercise', 'sleep', 'breathe', 'focus', 'set', 'take', 'get', 'go', 'choose', 'replace']
    
    # Clean the sentence and extract main action
    clean_sentence = sentence.lower().strip()
    
    # Remove common prefixes
    clean_sentence = re.sub(r'^(adults should|try to|it\'s important to|you should|make sure to|be sure to|remember to)\s*', '', clean_sentence)
    
    # Find the main action
    action = ""
    for verb in action_verbs:
        if verb in clean_sentence:
            # Extract the action phrase starting with this verb
            verb_match = re.search(rf'\b{verb}\b.*?(?=\.|,|;|$)', clean_sentence)
            if verb_match:
                action = verb_match.group(0).strip()
                break
    
    # If no clear action found, use the beginning of the sentence
    if not action:
        # Take first meaningful part
        parts = clean_sentence.split(',')
        action = parts[0].strip()
        if len(action) < 10 and len(parts) > 1:
            action = ', '.join(parts[:2]).strip()
    
    # Ensure action starts with a verb
    if not any(action.startswith(verb) for verb in action_verbs):
        action = f"practice {action}" if not action.startswith(('practice', 'try', 'aim')) else action
    
    # Capitalize first letter
    action = action[0].upper() + action[1:] if action else "Focus on this practice"
    
    # Construct the behavior change format
    if frequency == "regularly":
        result = f"{action} {frequency}, starting this week."
    else:
        result = f"{action} {frequency}, starting this week."
    
    # Clean up any redundancy
    result = re.sub(r'\s+', ' ', result)
    result = re.sub(r',\s*,', ',', result)
    
    return result

def get_source_preview(text: str) -> str:
    """Generate 1-2 sentence preview for source tooltip"""
    sentences = text.split(".")[:3]  # First 3 sentences max
    preview_sentences = []
    
    for sentence in sentences:
        sentence = sentence.strip()
        if (not sentence.startswith(("Title:", "source:")) and 
            len(sentence) > 15 and 
            len(preview_sentences) < 2):
            
            # Clean up field labels
            clean_sentence = re.sub(r'^[^:]+:\s*', '', sentence)
            if clean_sentence:
                preview_sentences.append(clean_sentence + ".")
    
    return " ".join(preview_sentences) if preview_sentences else "Health and wellness guidance."

@app.get("/health")
async def health_check():
    """Health check endpoint for operational readiness monitoring"""
    try:
        # Count available snippets
        snippet_count = len(rag.texts) if rag and rag.texts else 0
        
        # Basic system checks
        data_dir_exists = DATA_DIR.exists()
        snippet_files = list(DATA_DIR.glob("*.md")) if data_dir_exists else []
        
        # Calculate actual latency metrics
        retrieve_metrics = calculate_percentiles(list(latency_metrics["retrieve_times"]))
        total_metrics = calculate_percentiles(list(latency_metrics["total_stream_times"]))
        
        # Format latency report
        latency_report = f"Retrieve {retrieve_metrics['p50']:.0f}ms p50 / {retrieve_metrics['p95']:.0f}ms p95; total {total_metrics['p50']:.0f}ms p50 / {total_metrics['p95']:.0f}ms p95."
        
        return {
            "ok": True,
            "snippets": snippet_count,
            "files": len(snippet_files),
            "timestamp": int(time.time()),
            "version": "1.0.0",
            "status": "operational",
            "ops_truth": {
                "health": {"ok": True, "snippets": snippet_count}
            },
            "latency_report": latency_report,
            "request_count": len(latency_metrics["total_stream_times"])
        }
    except Exception as e:
        return {
            "ok": False,
            "error": "System not ready",
            "timestamp": int(time.time()),
            "status": "error"
        }

@app.post("/chat")
async def chat(request: Request):
    # Generate unique request ID for tracking
    request_id = str(uuid.uuid4())[:8]
    start_time = time.time()
    
    body = await request.json()
    raw_msg = body.get("message", "")
    user_msg = deidentify(raw_msg)

    # PHI-safe logging - NEVER log raw text content
    # This is critical for HIPAA compliance and patient privacy
    log_data = {
        "request_id": request_id,
        "endpoint": "POST /chat",
        "input_length": len(raw_msg),
        "redacted_length": len(user_msg),
        "phi_detected": len(raw_msg) != len(user_msg),  # True if PHI was redacted
        "timestamp": int(start_time)
    }
    print("REQUEST_START", json.dumps(log_data))

    # Check for out-of-scope medical queries
    if is_medical_query(user_msg):
        print("MEDICAL_QUERY_DETECTED", json.dumps({"request_id": request_id, "query_type": "medical"}))
        
        async def medical_stream():
            medical_response = get_medical_redirect_response()
            last_heartbeat = time.time()
            
            # Stream the safety message
            for ch in medical_response["text"]:
                # Send heartbeat every ~15 seconds
                current_time = time.time()
                if current_time - last_heartbeat >= 15:
                    yield ":\n\n"  # Heartbeat comment to keep connection alive
                    last_heartbeat = current_time
                
                yield f"data: {json.dumps({'token': ch})}\n\n"
                await asyncio.sleep(0.01)
            
            # Don't send bullets or sources for medical responses
            yield "data: [DONE]\n\n"
            
            # Log completion
            end_time = time.time()
            completion_log = {
                "request_id": request_id,
                "status": "medical_redirect",
                "duration_ms": int((end_time - start_time) * 1000),
                "timestamp": int(end_time)
            }
            print("REQUEST_COMPLETE", json.dumps(completion_log))
        
        return StreamingResponse(
            medical_stream(),
            media_type="text/event-stream",
            headers={
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )

    # Extract keywords for intent routing and bullet composition
    keywords = extract_keywords(user_msg)
    
    # Track retrieval latency
    retrieve_start = time.time()
    # Get RAG results with enhanced relevance
    results = rag.search_enhanced(user_msg, keywords, k=4)
    retrieve_time = (time.time() - retrieve_start) * 1000  # Convert to ms
    latency_metrics["retrieve_times"].append(retrieve_time)
    
    # Apply intent hint routing to ensure at least one on-topic result
    forced_sources = set()
    for keyword in keywords:
        if keyword in INTENT_MAP:
            forced_sources.update(INTENT_MAP[keyword])
    
    # If we have intent hints, ensure at least one result from those sources
    if forced_sources:
        has_forced_source = any(r["source"] in forced_sources for r in results)
        if not has_forced_source and len(results) > 0:
            # Replace the lowest scoring result with one from the forced source
            for source in forced_sources:
                forced_result = rag.get_best_from_source(user_msg, keywords, source)
                if forced_result:
                    results[-1] = forced_result
                    break

    async def stream():
        last_heartbeat = time.time()
        
        # Short, personalized intro
        preface = f"Based on your question about '{user_msg}', here's what can help:\n"
        for ch in preface:
            # Send heartbeat every ~15 seconds
            current_time = time.time()
            if current_time - last_heartbeat >= 15:
                yield ":\n\n"  # Heartbeat comment to keep connection alive
                last_heartbeat = current_time
            
            yield f"data: {json.dumps({'token': ch})}\n\n"
            await asyncio.sleep(0.01)  # Small delay for smooth streaming

        # Compose high-quality bullets
        bullets = []
        for r in results:
            bullet = compose_bullet(r["text"], keywords)
            if bullet and bullet != "No actionable advice found.":
                bullets.append(bullet)
        
        # Ensure we have good bullets
        bullets = bullets[:4]  # Limit to 4 bullets max
        
        # Stream bullets one by one for snappy feel
        for i, bullet in enumerate(bullets):
            # Send heartbeat if needed
            current_time = time.time()
            if current_time - last_heartbeat >= 15:
                yield ":\n\n"  # Heartbeat comment to keep connection alive
                last_heartbeat = current_time
            
            await asyncio.sleep(0.15)  # Sub-200ms delay between bullets
            single_bullet_data = {"bullet_index": i, "bullet": bullet}
            yield f"data: {json.dumps(single_bullet_data)}\n\n"

        # After all bullets, send the complete bullets array
        yield f"data: {json.dumps({'bullets': bullets})}\n\n"

        # Enhanced sources with previews and deduplication
        unique_sources = {}
        for r in results:
            source = r["source"]
            if source not in unique_sources:
                preview = get_source_preview(r["text"])
                unique_sources[source] = {
                    "name": source,
                    "preview": preview,
                    "score": r.get("score", 0)
                }
        
        # Sort sources by score (descending)
        sorted_sources = sorted(unique_sources.values(), key=lambda x: x["score"], reverse=True)
        
        # Filter sources: score ≥0.55 threshold and limit to 3 max
        filtered_sources = [s for s in sorted_sources if s["score"] >= 0.55][:3]
        
        yield f"data: {json.dumps({'sources': filtered_sources})}\n\n"
        yield "data: [DONE]\n\n"
        
        # PHI-safe completion logging
        end_time = time.time()
        total_time = (end_time - start_time) * 1000  # Convert to ms
        latency_metrics["total_stream_times"].append(total_time)
        
        completion_log = {
            "request_id": request_id,
            "status": "completed",
            "duration_ms": int(total_time),
            "retrieve_ms": int(retrieve_time),
            "bullets_generated": len(bullets),
            "sources_used": len(filtered_sources),
            "timestamp": int(end_time)
        }
        print("REQUEST_COMPLETE", json.dumps(completion_log))

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache", 
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@app.post("/reindex")
async def reindex():
    """Reindex the RAG system with current data"""
    try:
        print("POST /reindex - starting reindexing...")
        
        # Reinitialize the RAG system to pick up new data
        global rag
        rag = LocalRAG(data_dir=DATA_DIR)
        
        print("POST /reindex - completed successfully")
        return {"status": "success", "message": "Reindexing completed successfully"}
    except Exception as e:
        print(f"POST /reindex - error: {e}")
        return {"status": "error", "message": f"Reindexing failed: {str(e)}"}
