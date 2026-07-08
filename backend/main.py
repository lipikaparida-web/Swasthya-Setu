from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import ai, centers
import os

app = FastAPI(
    title="Swasthya Setu API",
    description="Backend API for the Swasthya Setu district health monitoring platform.",
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# CORS – restrict to known frontend origins
# Set FRONTEND_URL env var in production (e.g. https://swasthya-setu.vercel.app)
# ---------------------------------------------------------------------------
_frontend_url = os.getenv("FRONTEND_URL", "").strip()
_allowed_origins = [
    "http://localhost:3000",   # Vite dev server
    "http://localhost:5173",   # Vite default fallback
    "http://127.0.0.1:3000",
]
if _frontend_url:
    _allowed_origins.append(_frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(ai.router)
app.include_router(centers.router)


# ---------------------------------------------------------------------------
# Root & Health
# ---------------------------------------------------------------------------
@app.get("/", tags=["Root"])
def root():
    return {
        "project": "Swasthya Setu",
        "status": "running",
        "docs": "/docs",
        "endpoints": {
            "health": "/health",
            "parse_report": "POST /ai/parse-report",
            "district_brief": "POST /ai/district-brief",
            "list_centers": "GET /centers/",
            "get_center": "GET /centers/{center_id}",
            "submit_report": "POST /centers/report",
            "update_center": "PUT /centers/{center_id}",
        },
    }


@app.get("/health", tags=["Root"])
def health_check():
    return {"status": "ok", "project": "Swasthya Setu"}