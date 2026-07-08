export interface StockItem {
  name: string;
  quantity: number;
  daily_consumption: number;
  days_remaining: number;
}

export interface Center {
  id: string;
  name: string;
  hindiName: string;
  lat: number;
  lng: number;
  type: "PHC" | "CHC";
  status: "CRITICAL" | "WARNING" | "GOOD";
  beds_total: number;
  beds_occupied: number;
  doctor_present: boolean;
  doctor_name?: string;
  doctor_absent_days: number;
  today_patient_count: number;
  last_report_time: string;
  last_report_days_ago: number;
  stock: Record<string, StockItem>;
  monthly_footfall: number[]; // 12 numbers for Jan-Dec
  last_7_days_footfall: { day: string; count: number }[];
  alertMessage?: string;
}

export interface RedistributionRecommendation {
  id: string;
  fromCenter: string;
  item: string;
  qtyToTransfer: number;
  toCenter: string;
  distance: number; // in km
  priority: "HIGH" | "MEDIUM" | "LOW";
  source_name?: string;
  target_name?: string;
  distance_km?: number;
  recommended_quantity?: number;
  source_surplus?: number;
  target_runway_days?: number;
}

export interface DailyReportSubmission {
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
