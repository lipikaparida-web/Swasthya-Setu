<div align="center">

<img width="80" src="https://img.icons8.com/color/96/heart-with-pulse.png" alt="Swasthya Setu Logo"/>

# Swasthya Setu — स्वास्थ्य सेतु

### AI-Driven District Health Command Center

**See risks earlier. Move resources smarter. Intervene where it matters most.**

[![Frontend](https://img.shields.io/badge/Frontend-Live%20on%20Netlify-00C7B7?style=for-the-badge&logo=netlify)](https://swasthya-setu-alchemystic.netlify.app)
[![Backend](https://img.shields.io/badge/Backend-Live%20on%20Render-46E3B7?style=for-the-badge&logo=render)](https://swasthya-setu-6a6c.onrender.com)
[![API Docs](https://img.shields.io/badge/API-Documentation-1e3a5f?style=for-the-badge&logo=fastapi)](https://swasthya-setu-6a6c.onrender.com/docs)
[![Track](https://img.shields.io/badge/Hackathon-Track%203%20Smart%20Health-f97316?style=for-the-badge)](https://swasthya-setu-alchemystic.netlify.app)

**Built for the Government of India Innovation Challenge — Track 3: Smart Health**
AI-Driven Health Centre & Supply Chain Management

</div>

---

## The Problem

Primary Health Centres (PHCs) and Community Health Centres (CHCs) across Indian districts face recurring, preventable operational failures:

- Medicine stock-outs discovered only after patients arrive
- Diagnostic test shortages with no early warning
- Unmanaged patient surges overwhelming facilities
- Bed unavailability unknown until crisis point
- Unpredictable doctor attendance with no systemic tracking
- Delayed or missing facility reports cutting off administrative visibility
- Resources sitting idle in one centre while another faces shortage

These challenges are tracked through fragmented, delayed, manual systems. The result is not just operational inefficiency — it is preventable harm to patients who depend on these facilities.

**The core problem is not the absence of data. It is the absence of timely, actionable intelligence.**

---

## Our Solution

Swasthya Setu creates a unified intelligence loop connecting ground-level health centre operations to district-level decision-making:

```
Health Centre Data
       │
       ▼
Real-Time Monitoring
       │
       ▼
Risk Detection & Early Warnings
       │
       ▼
AI Demand Intelligence
       │
       ▼
Smart Resource Redistribution
       │
       ▼
District Administrator Action
```

The platform enables district administrators to monitor all PHCs and CHCs from one command centre, detect impending shortages before they become crises, identify under-resourced facilities, and act on AI-generated recommendations rather than fragmented reports.

---

## Key Features

### District Command Centre
A unified operational dashboard providing real-time visibility into:
- **District Health Score** — a single weighted KPI synthesising reporting compliance, stock health, doctor attendance, and bed occupancy
- Facility-level status across all 12 PHCs and CHCs
- Critical intervention count with specific alert context
- Real-time alert feed sorted by severity

### Geographic Facility Monitoring
Interactive district map (Leaflet.js + OpenStreetMap — no billing required) displaying all facilities with colour-coded health indicators. Red pulsing markers for critical facilities, amber for warnings, green for normal. Clickable popups with facility summary and direct navigation.

### Early Stock-Out Warnings
The platform continuously analyses current stock quantity, daily consumption rate, and estimated days of supply remaining. Facilities approaching critical levels (under 3 days) are automatically flagged in red. Warnings trigger at 7 days. District administrators see which medicine, which centre, and exactly how many days remain before stock-out.

### Smart Resource Redistribution
Beyond identifying shortages, Swasthya Setu identifies solutions. When one facility faces a stock-out risk, the system identifies nearby facilities with safe surplus inventory and recommends targeted transfers — specifying donor facility, medicine, transfer quantity, recipient facility, road distance, and priority level — while preserving the donor facility's own safety stock.

### Diagnostic Test Availability Audits
Tracks essential diagnostic resources including Malaria RDT kits, Dengue NS1 kits, Pregnancy test kits, Blood glucose strips, Haemoglobin tests, and Urine test strips — a category most health management systems overlook entirely.

### Demand Intelligence
Historical operational data enables identification of rising medicine consumption trends, patient surges, increasing bed pressure, and emerging diagnostic demand — moving administrators from reactive monitoring toward predictive decision-making.

### Doctor Attendance Monitoring
Compares scheduled and present medical officers per facility. Persistent absence patterns (beyond configurable day thresholds) trigger automatic critical alerts and appear in the AI District Brief as intervention priorities.

### Reporting Compliance Tracking
Facilities with delayed or missing daily reports are automatically identified in the HMIS Telemetry Delinquency Ledger. Administrators can dispatch SMS reminders directly from the dashboard. The absence of a report is itself treated as an operational signal.

### AI District Brief
Complex district-level operational data is synthesised into a formal administrative memorandum — structured as an official Government of India brief — covering critical risks, priority facilities, resource shortages, recommended interventions, and smart redistribution directives. Powered by Sarvam AI for native Indian language support.

### Multilingual & Inclusive Design
Platform interface supports English, Hindi, and Odia with a language toggle accessible from the main header. Labels display in regional languages alongside English. The report submission interface is designed for low-literacy health workers with voice input support.

---

## Technology Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 19 + TypeScript | UI framework and type safety |
| Vite | Build tooling and dev server |
| Tailwind CSS v4 | Utility-first styling |
| Leaflet.js + OpenStreetMap | District facility mapping (billing-free) |
| Recharts | Analytics charts and data visualisation |
| Lucide React | Icon library |
| React Router v7 | Client-side routing |

### Backend
| Technology | Purpose |
|---|---|
| Python + FastAPI | REST API framework |
| Uvicorn | ASGI server |
| Sarvam AI (sarvam-30b) | Multilingual AI parsing and district brief generation |
| Firebase Admin SDK | Server-side Firestore access |
| python-dotenv | Environment variable management |

### Database & Infrastructure
| Technology | Purpose |
|---|---|
| Firebase Firestore | Real-time NoSQL database |
| Firebase Authentication | District administrator login |
| Firebase Hosting | Frontend hosting option |

### Deployment
| Platform | Service |
|---|---|
| Netlify | React frontend |
| Render | FastAPI backend |

---

## Project Structure

```
Swasthya-Setu/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── DistrictMap.tsx
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── CenterDetail.tsx
│   │   │   ├── AiBrief.tsx
│   │   │   ├── Analytics.tsx
│   │   │   ├── CentersList.tsx
│   │   │   └── Settings.tsx
│   │   ├── utils/
│   │   │   ├── api.ts
│   │   │   ├── LanguageContext.tsx
│   │   │   └── translations.ts
│   │   ├── mockData.ts
│   │   ├── types.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   │
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── .env.example
│
├── backend/
│   ├── main.py
│   ├── services/
│   │   ├── firestore_client.py
│   │   └── ai_parser.py
│   ├── models/
│   ├── data/
│   │   └── generate_synthetic.py
│   ├── requirements.txt
│   └── .env.example
│
└── README.md
```

---

## Run Locally

### Prerequisites
- Node.js 18+
- Python 3.10+
- A Firebase project (free Spark plan)
- A Sarvam AI API key (free tier)

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd Swasthya-Setu
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
```

Create `backend/.env`:
```env
GOOGLE_APPLICATION_CREDENTIALS=firebase-key.json
SARVAM_API_KEY=your_sarvam_api_key_here
```

Add your Firebase service account key as `backend/firebase-key.json` (download from Firebase Console → Project Settings → Service Accounts).

Start the backend:
```bash
uvicorn main:app --reload
```

Backend runs at `http://127.0.0.1:8000`
API documentation at `http://127.0.0.1:8000/docs`

### 3. Frontend Setup

Create `frontend/.env`:
```env
VITE_API_URL=http://127.0.0.1:8000
```

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`

**Demo credentials (prototype):**
```
Email:    admin@swasthyasetu.gov.in
Password: admin123
```

---

## Environment & Security

Never commit these files to version control — both are already in `.gitignore`:

```
.env
firebase-key.json
```

Firebase credentials and API keys should be configured as environment variables on your deployment platform (Netlify environment variables for frontend, Render environment variables for backend).

---

## Deployment Architecture

```
User Browser
     │
     ▼
Netlify CDN
React + TypeScript Frontend
(Static build, global edge)
     │
     ▼ REST API calls
Render
FastAPI + Uvicorn
Python Backend
     │
     ├── Sarvam AI API
     │   (Multilingual parsing + AI brief generation)
     │
     └── Firebase Firestore
         (Real-time operational data)
```

---

## Synthetic District Dataset

The prototype is validated using a structured synthetic dataset simulating realistic district-level health operations for Khordha District, Odisha.

| Dataset Component | Scale |
|---|---:|
| PHCs and CHCs | 12 |
| Historical Simulation Period | 90 days |
| Daily Operational Reports | 1,080 |
| Essential Medicines Tracked | 9 |
| Diagnostic Tests Tracked | 6 |

The dataset intentionally includes interconnected operational scenarios — medicine stock-out risk paired with a nearby surplus donor, diagnostic shortage, patient surge, high bed occupancy, persistent doctor absence, and repeated missing reports — to demonstrate how monitoring, early warnings, analytics, and redistribution recommendations work together as a system.

> All prototype data is synthetic and created solely for demonstration. It does not represent real patient records, real facility data, or official government health information.

---

## Potential Impact

Deployed at district scale, Swasthya Setu can help health administrators:

- Detect medicine and diagnostic shortages before patients are turned away
- Reduce avoidable stock-outs through proactive redistribution
- Improve utilisation of existing district resources without additional procurement
- Identify overloaded facilities and redirect patients earlier
- Strengthen reporting accountability through automated compliance tracking
- Support faster, evidence-based administrative interventions

The platform architecture is designed to scale from:

```
Facility → District → State → National
```

---

## Future Scope

- Advanced time-series demand forecasting with seasonal pattern detection
- Voice-based multilingual reporting via browser and SMS (IVR)
- WhatsApp Business API integration for field worker reporting
- Route-aware medical supply redistribution with logistics optimisation
- Offline-first reporting for low-connectivity and remote areas
- Role-based authentication with full audit trail logging
- Integration-ready connectors for existing public health information systems (HMIS, e-Aushadhi, NHM)
- State-level command dashboards with district comparative analytics

---

## Disclaimer

Swasthya Setu is a prototype developed for an innovation challenge. It is not an official platform of the Government of India, Ministry of Health and Family Welfare, National Health Mission, or Government of Odisha.

All names, scenarios, health centre data, and operational records used in the prototype are synthetic and demonstrative unless explicitly stated otherwise.

---

## Team

**Team Alchemystic**

Built with the vision of transforming fragmented health-centre data into timely, actionable public-health intelligence — so the right resources reach the right facilities before the next patient arrives.

---

<div align="center">

**Swasthya Setu • Government of India Innovation Challenge**
Track 3: Smart Health — AI-Driven Health Centre & Supply Chain Management
Powered by Sarvam AI & Firebase • Khordha District, Odisha

</div>
