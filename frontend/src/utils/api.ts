/**
 * api.ts — Centralized API client for Swasthya Setu
 *
 * All requests go through the Vite proxy at /api/* which forwards to
 * the FastAPI backend at http://localhost:8000.
 *
 * In production, set VITE_API_URL in your hosting env and update the
 * proxy target (or point directly to the deployed backend URL).
 */

const API_BASE = import.meta.env.VITE_API_URL || "/api";

// ─── Generic helpers ──────────────────────────────────────────────────────────

async function apiPost<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Health ───────────────────────────────────────────────────────────────────

export async function healthCheck(): Promise<{ status: string }> {
  return apiGet("/health");
}

// ─── AI Endpoints ─────────────────────────────────────────────────────────────

export interface ParsedReport {
  doctor_present: boolean;
  beds_total: number;
  beds_occupied: number;
  patient_count: number;
  stock_items: { item_name: string; quantity: number; unit: string }[];
  notes: string;
}

/**
 * Parse a free-text / voice-transcribed health centre report via Sarvam AI.
 * Returns structured data that can be applied to the form.
 */
export async function parseReportWithAI(
  text: string
): Promise<{ success: boolean; data: ParsedReport }> {
  return apiPost("/ai/parse-report", { text });
}

export interface DistrictBriefRequest {
  district: string;
  centers_at_risk: string[];
  stock_alerts: { center: string; item: string; days_left: number }[];
  extra_data?: Record<string, unknown>;
}

/**
 * Generate a district-level AI brief using Sarvam AI.
 * Returns a 3-5 sentence narrative in English.
 */
export async function generateDistrictBrief(
  data: DistrictBriefRequest
): Promise<{ success: boolean; brief: string }> {
  return apiPost("/ai/district-brief", data);
}

// ─── Centers / Reports ────────────────────────────────────────────────────────

export interface ReportSubmission {
  centerId: string;
  doctorPresent: boolean;
  doctorName?: string;
  bedsTotal: number;
  bedsOccupied: number;
  patientCountToday: number;
  stockQuantities: Record<string, number>;
  notes: string;
  timestamp: string;
}

/**
 * Persist a daily health report for a center to Firestore via the backend.
 */
export async function submitDailyReport(
  data: ReportSubmission
): Promise<{ success: boolean; message: string; reportId: string }> {
  return apiPost("/centers/report", data);
}

/**
 * Fetch all centers from Firestore. Returns empty array if backend is down.
 */
export async function fetchCenters(): Promise<{ success: boolean; centers: unknown[]; count: number }> {
  return apiGet("/centers/");
}
