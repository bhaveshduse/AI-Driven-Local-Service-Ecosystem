from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "service_db")

def seed_labels():
    try:
        client = MongoClient(MONGO_URI)
        db = client[MONGO_DB_NAME]
        collection = db["classificationlabels"]

        collection.delete_many({})
        print("Cleared existing labels.")

        # OPTIMIZED: hypothesis_text is now concise for better AI accuracy
        # display_name is what the user sees in the UI
        labels = [
            {"hypothesis_text": "Plumbing", "display_name": "Plumbing & Gas Repair", "slug": "plumbing", "isActive": True},
            {"hypothesis_text": "Electrical", "display_name": "Electrical Help", "slug": "electrical", "isActive": True},
            {"hypothesis_text": "Painting", "display_name": "Painting & Decor", "slug": "painting", "isActive": True},
            {"hypothesis_text": "Automotive", "display_name": "Mechanic & Auto Repair", "slug": "auto-repair", "isActive": True},
            {"hypothesis_text": "Carpentry", "display_name": "Carpentry & Woodwork", "slug": "carpentry", "isActive": True},
            {"hypothesis_text": "Interior Design", "display_name": "Interior Design", "slug": "interior-design", "isActive": True},
            {"hypothesis_text": "Cleaning", "display_name": "Deep Cleaning Services", "slug": "cleaning", "isActive": True},
            {"hypothesis_text": "Landscaping", "display_name": "Lawn & Landscaping", "slug": "landscaping", "isActive": True},
            {"hypothesis_text": "Appliances", "display_name": "Appliance Repair", "slug": "appliance-repair", "isActive": True},
            {"hypothesis_text": "HVAC", "display_name": "AC & Heating Repair", "slug": "hvac", "isActive": True},
            {"hypothesis_text": "Pest Control", "display_name": "Pest Control", "slug": "pest-control", "isActive": True},
            {"hypothesis_text": "Roofing", "display_name": "Roofing & Waterproofing", "slug": "roofing", "isActive": True},
            {"hypothesis_text": "Moving", "display_name": "Movers & Packers", "slug": "moving", "isActive": True},
            {"hypothesis_text": "Handyman", "display_name": "General Handyman", "slug": "handyman", "isActive": True}
        ]

        result = collection.insert_many(labels)
        print(f"Successfully seeded {len(result.inserted_ids)} labels.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    seed_labels()