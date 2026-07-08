"""
Seed Firestore with Swasthya Setu synthetic demo data.
Run from backend folder:
    python seed_firestore.py
Requires GOOGLE_APPLICATION_CREDENTIALS in .env.
"""
import json
from pathlib import Path
from services.firestore_client import db

DATA_FILE = Path(__file__).with_name("swasthya_setu_dataset.json")

def main():
    data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    batch = db.batch()
    ops = 0

    for center in data["centers"]:
        center_id = center["id"]
        doc_data = {k:v for k,v in center.items() if k != "id"}
        ref = db.collection("centers").document(center_id)
        batch.set(ref, doc_data)
        ops += 1
        if ops >= 400:
            batch.commit(); batch=db.batch(); ops=0

    if ops:
        batch.commit()

    for center_id, reports in data["daily_reports"].items():
        batch = db.batch(); ops = 0
        for report in reports:
            ref = (db.collection("centers").document(center_id)
                   .collection("daily_reports").document(report["date"]))
            batch.set(ref, report)
            ops += 1
            if ops >= 400:
                batch.commit(); batch=db.batch(); ops=0
        if ops:
            batch.commit()

    for rec in data["redistribution_recommendations"]:
        db.collection("redistribution_recommendations").document(rec["id"]).set(rec)

    print(f'Seeded {len(data["centers"])} centers, '
          f'{sum(len(v) for v in data["daily_reports"].values())} daily reports, '
          f'{len(data["redistribution_recommendations"])} redistribution recommendation(s).')

if __name__ == "__main__":
    main()
