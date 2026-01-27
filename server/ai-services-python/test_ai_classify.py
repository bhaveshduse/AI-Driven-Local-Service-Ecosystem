import os
import sys
import unittest
import asyncio
from unittest.mock import MagicMock, patch

# --- Setup Mocks Before Import ---
os.environ["HF_TOKEN"] = "mock_test_token"
os.environ["MONGO_URI"] = "mongodb://mock_uri"
os.environ["MONGO_DB_NAME"] = "mock_db"

# Mock pymongo
mock_mongo = MagicMock()
sys.modules["pymongo"] = mock_mongo
sys.modules["pymongo.MongoClient"] = MagicMock()

from ai_classify import app
from fastapi.testclient import TestClient

client = TestClient(app)

# Helper to mock async return values
def async_return(result):
    f = asyncio.Future()
    f.set_result(result)
    return f

class TestAIClassify(unittest.TestCase):
    
    @patch("ai_classify.call_classification")
    @patch("ai_classify.call_diagnosis")
    @patch("ai_classify.get_dynamic_labels")
    def test_recommend_endpoint(self, mock_get_labels, mock_diagnosis, mock_call_class):
        """Test the /recommend endpoint with async mocks."""
        
        # 1. Mock Data
        mock_get_labels.return_value = async_return([
            {"hypothesis_text": "Plumbing", "display_name": "Plumbing Service", "slug": "plumbing-slug"}
        ])
        mock_call_class.return_value = async_return({
            "label": "Plumbing", 
            "confidence": 95.5
        })
        mock_diagnosis.return_value = async_return("Turn off the main water valve.")

        # 2. Request
        response = client.post("/recommend", json={"query": "leak"})
        
        # 3. Assertions
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        self.assertEqual(data["recommended_service"], "Plumbing Service")
        self.assertEqual(data["slug"], "plumbing-slug")
        self.assertEqual(data["expert_advice"], "Turn off the main water valve.")
        self.assertIn("confidence", data)

if __name__ == "__main__":
    unittest.main()
