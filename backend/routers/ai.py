from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, List
from services.ai_parser import parse_health_report, generate_district_brief

router = APIRouter(prefix="/ai", tags=["AI"])


class ParseReportRequest(BaseModel):
    text: str


class DistrictBriefRequest(BaseModel):
    district: str
    centers_at_risk: List[str] = []
    stock_alerts: List[Dict] = []
    extra_data: Optional[Dict] = None


@router.post("/parse-report")
async def parse_report(body: ParseReportRequest):
    """
    Parse a free-text / voice-transcribed health center report using Sarvam AI.
    Returns structured JSON with doctor presence, bed counts, stock levels, etc.
    """
    if not body.text or not body.text.strip():
        raise HTTPException(status_code=400, detail="text field is required and must not be empty")
    try:
        result = parse_health_report(body.text)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI parsing failed: {str(e)}")


@router.post("/district-brief")
async def district_brief(body: DistrictBriefRequest):
    """
    Generate a 3-5 sentence AI brief for a district administrator using Sarvam AI.
    """
    district_data = {
        "district": body.district,
        "centers_at_risk": body.centers_at_risk,
        "stock_alerts": body.stock_alerts,
    }
    if body.extra_data:
        district_data.update(body.extra_data)

    try:
        brief_text = generate_district_brief(district_data)
        return {"success": True, "brief": brief_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Brief generation failed: {str(e)}")
