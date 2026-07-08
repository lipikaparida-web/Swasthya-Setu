from services.firestore_client import db
from services.ai_parser import parse_health_report, generate_district_brief

# Test 1: Firestore
print("Testing Firestore...")
doc_ref = db.collection("test").document("ping")
doc_ref.set({"status": "connected"})
result = db.collection("test").document("ping").get().to_dict()
print(f"✅ Firestore: {result}")

# Test 2: English report
print("\nTesting Sarvam parser (English)...")
result1 = parse_health_report(
    "Doctor present. 8 beds total, 5 occupied. Paracetamol 200 tablets, ORS 50 packets. 32 patients today."
)
print(f"✅ English parsed: {result1}")

# Test 3: Hindi report
print("\nTesting Sarvam parser (Hindi)...")
result2 = parse_health_report(
    "Aaj doctor present hai. 10 beds hain, 6 occupied. Paracetamol 150 tablet bacha hai. 45 mareez aaye."
)
print(f"✅ Hindi parsed: {result2}")

# Test 4: District brief
print("\nTesting district brief...")
brief = generate_district_brief({
    "district": "Khordha",
    "centers_at_risk": ["PHC Bhubaneswar North", "PHC Jatni"],
    "stock_alerts": [{"center": "PHC Jatni", "item": "ORS", "days_left": 3}]
})
print(f"✅ Brief: {brief}")

# Cleanup
db.collection("test").document("ping").delete()
print("\n🎉 All tests passed!")