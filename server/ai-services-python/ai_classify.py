import os
import asyncio
import httpx
from typing import List, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

# --- Configuration ---
API_URL = os.getenv("HF_API_URL", "https://api-inference.huggingface.co/models/facebook/bart-large-mnli")
GEN_API_URL = os.getenv("HF_GEN_API_URL", "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3")
HF_TOKEN = os.getenv("HF_TOKEN")
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "service_db")

if not HF_TOKEN:
    raise EnvironmentError("Missing HF_TOKEN in .env file.")

HEADERS = {"Authorization": f"Bearer {HF_TOKEN}"}

# --- Database Setup ---
try:
    client = MongoClient(MONGO_URI)
    db = client[MONGO_DB_NAME]
    # Collection names
    LABEL_COL = "classificationlabels"
except Exception as e:
    print(f"MongoDB Connection Error: {e}")

app = FastAPI(title="Service Matcher AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ClassificationRequest(BaseModel):
    query: str

# --- Core Logic ---

async def get_dynamic_labels() -> List[Dict[str, Any]]:
    """Fetches atomic labels from DB. Each doc should have 'hypothesis_text' and 'display_name'."""
    fallback = [
        {"hypothesis_text": "Plumbing", "display_name": "Plumbing & Leak Fixes", "slug": "plumbing"},
        {"hypothesis_text": "Electrical", "display_name": "Electrical & Lighting", "slug": "electrical"},
        {"hypothesis_text": "Appliances", "display_name": "Appliance Repair", "slug": "appliance-repair"},
        {"hypothesis_text": "Cleaning", "display_name": "Home Cleaning Services", "slug": "cleaning"},
        {"hypothesis_text": "HVAC", "display_name": "AC & Heating Repair", "slug": "hvac"},
        {"hypothesis_text": "Carpentry", "display_name": "Carpentry & Woodwork", "slug": "carpentry"},
        {"hypothesis_text": "Painting", "display_name": "Painting & Decor", "slug": "painting"},
        {"hypothesis_text": "Landscaping", "display_name": "Lawn & Landscaping", "slug": "landscaping"},
        {"hypothesis_text": "Moving", "display_name": "Movers & Packers", "slug": "moving"},
        {"hypothesis_text": "Pest Control", "display_name": "Pest Control", "slug": "pest-control"},
        {"hypothesis_text": "Handyman", "display_name": "General Handyman", "slug": "handyman"}
    ]
    try:
        cursor = db[LABEL_COL].find({"isActive": True})
        labels = list(cursor)
        return labels if labels else fallback
    except:
        return fallback

async def call_classification(client: httpx.AsyncClient, query: str, labels: List[str]) -> Dict:
    """Zero-shot classification to find the right category."""
    catch_all = "Unrelated General Inquiry"
    candidate_labels = labels + [catch_all]
    payload = {"inputs": query, "parameters": {"candidate_labels": candidate_labels}}
    
    try:
        response = await client.post(API_URL, headers=HEADERS, json=payload, timeout=20.0)
        result = response.json()
        
        # Extract label and score
        if isinstance(result, dict) and "labels" in result:
            label = result[0]["labels"][0]
            score = result[0]["scores"][0]
            if score < 0.35 or label == catch_all: # Threshold check
                return {"label": "General", "confidence": round(score*100, 2)}
            return {"label": label, "confidence": round(score*100, 2)}
    except Exception as e:
        print(f"Classification Error: {e}")
    return {"label": "General", "confidence": 0}

async def call_diagnosis(client: httpx.AsyncClient, query: str) -> str:
    """Mistral-based expert advice for immediate value."""
    system_prompt = (
        "ACT AS: Home Service Expert. Provide 1 safety tip and 2 triage questions for the user's issue. "
        "Keep it under 80 words. Use Markdown."
    )
    full_prompt = f"<s>[INST] {system_prompt} \nUser Issue: {query} [/INST]</s>"
    
    payload = {
        "inputs": full_prompt,
        "parameters": {"max_new_tokens": 150, "temperature": 0.7}
    }
    try:
        response = await client.post(GEN_API_URL, headers=HEADERS, json=payload, timeout=20.0)
        result = response.json()
        if isinstance(result, list): return result[0].get("generated_text", "")
        return result.get("generated_text", "Expert advice is currently unavailable.")
    except Exception as e:
        return "Please stay safe. We are matching you with a professional now."

# --- API Endpoints ---

@app.post("/recommend")
async def recommend_service(request: ClassificationRequest):
    """
    Main Endpoint: Performs classification AND diagnosis in parallel.
    This provides the 'Recommended Service' AND the 'Expert Advice' instantly.
    """
    label_data = await get_dynamic_labels()
    hypothesis_list = [item["hypothesis_text"] for item in label_data]

    async with httpx.AsyncClient() as client:
        # Parallel Execution
        classification_task = call_classification(client, request.query, hypothesis_list)
        diagnosis_task = call_diagnosis(client, request.query)
        
        classification_res, advice = await asyncio.gather(classification_task, diagnosis_task)

    # Match the internal hypothesis back to a pretty Display Name
    display_name = "General Home Maintenance"
    slug = "general"
    for item in label_data:
        if item["hypothesis_text"] == classification_res["label"]:
            display_name = item.get("display_name", display_name)
            slug = item.get("slug", slug)

    return {
        "recommended_service": display_name,
        "slug": slug,
        "confidence": classification_res["confidence"],
        "expert_advice": advice,
        "action_required": "We are searching for vendors in your area."
    }

@app.get("/health")
def health():
    return {"status": "online"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)