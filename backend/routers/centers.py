from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, List, Any
from services.firestore_client import db

router = APIRouter(prefix="/centers", tags=["Centers"])


class StockItemModel(BaseModel):
    name: str
    quantity: float
    daily_consumption: float
    days_remaining: float


class ReportSubmission(BaseModel):
    centerId: str
    doctorPresent: bool
    doctorName: Optional[str] = None
    bedsTotal: int
    bedsOccupied: int
    patientCountToday: int
    stockQuantities: Dict[str, float] = {}
    notes: str = ""
    timestamp: str


@router.get("/")
async def list_centers():
    """
    Fetch all health centers from Firestore.
    Returns a list of center documents.
    """
    try:
        docs = db.collection("centers").stream()
        centers = []
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            centers.append(data)
        return {"success": True, "centers": centers, "count": len(centers)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Firestore error: {str(e)}")


@router.get("/{center_id}")
async def get_center(center_id: str):
    """
    Fetch a single health center by ID from Firestore.
    """
    try:
        doc = db.collection("centers").document(center_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail=f"Center '{center_id}' not found")
        data = doc.to_dict()
        data["id"] = doc.id
        return {"success": True, "center": data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Firestore error: {str(e)}")


@router.post("/report")
async def submit_report(body: ReportSubmission):
    """
    Submit a daily health report for a center.
    Saves the report to Firestore under reports/{centerId}/daily_reports.
    Also updates the center document with latest status.
    """
    if not body.centerId:
        raise HTTPException(status_code=400, detail="centerId is required")

    try:
        # Save report document
        report_ref = (
            db.collection("centers")
            .document(body.centerId)
            .collection("daily_reports")
            .document(body.timestamp[:10])  # Use date as document ID (YYYY-MM-DD)
        )
        report_data = body.model_dump()
        report_ref.set(report_data)

        # Update center-level snapshot fields
        center_ref = db.collection("centers").document(body.centerId)
        center_ref.set(
            {
                "doctor_present": body.doctorPresent,
                "doctor_name": body.doctorName,
                "beds_total": body.bedsTotal,
                "beds_occupied": body.bedsOccupied,
                "today_patient_count": body.patientCountToday,
                "last_report_time": body.timestamp,
                "last_report_days_ago": 0,
            },
            merge=True,
        )

        return {
            "success": True,
            "message": f"Report for center '{body.centerId}' saved successfully",
            "reportId": body.timestamp[:10],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save report: {str(e)}")


@router.put("/{center_id}")
async def update_center(center_id: str, data: Dict[str, Any]):
    """
    Update arbitrary fields on a health center document in Firestore.
    """
    try:
        center_ref = db.collection("centers").document(center_id)
        doc = center_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail=f"Center '{center_id}' not found")
        center_ref.set(data, merge=True)
        return {"success": True, "message": f"Center '{center_id}' updated"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Firestore error: {str(e)}")
