import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Building2, 
  Activity, 
  Bed, 
  Users, 
  ChevronRight, 
  ArrowRight,
  Search,
  SlidersHorizontal,
  FileCheck,
  Flame,
  AlertTriangle,
  UserCheck2,
  UserX2
} from "lucide-react";
import { Center } from "../types";
import DistrictMap from "../components/DistrictMap";
import { calculateDistrictHealthScore, getSmartRedistributions } from "../utils/healthCalculations";
import { Sparkles, ArrowLeftRight, Clock, ShieldCheck } from "lucide-react";
import { useLanguage } from "../utils/LanguageContext";
import { getLocalizedCenterName, getLocalizedDrugName, getLocalizedAlert } from "../utils/translations";

interface DashboardProps {
  centers: Center[];
  currentUser?: {
    name: string;
    email: string;
    state: string;
    district: string;
  } | null;
}

export default function Dashboard({ centers, currentUser }: DashboardProps) {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);

  const handleGenerateBrief = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsGeneratingBrief(true);
    setTimeout(() => {
      navigate("/district-brief");
    }, 2000);
  };
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "PHC" | "CHC">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "CRITICAL" | "WARNING" | "GOOD">("ALL");
  const [sortField, setSortField] = useState<"status" | "name" | "beds" | "patients">("status");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Top Statistics calculations
  const totalCenters = centers.length;
  const phcCount = centers.filter((c) => c.type === "PHC").length;
  const chcCount = centers.filter((c) => c.type === "CHC").length;

  // Live District Score and Smart Logistics calculations
  const districtHealth = useMemo(() => calculateDistrictHealthScore(centers), [centers]);
  const smartRedistributions = useMemo(() => getSmartRedistributions(centers), [centers]);
  const validRedistributions = useMemo(() => {
    return smartRedistributions.filter(rec => 
      rec.target_runway_days !== undefined && 
      !isNaN(rec.target_runway_days) &&
      rec.source_surplus !== undefined &&
      !isNaN(rec.source_surplus) &&
      rec.recommended_quantity !== undefined &&
      !isNaN(rec.recommended_quantity) &&
      rec.distance_km !== undefined &&
      !isNaN(rec.distance_km)
    );
  }, [smartRedistributions]);

  // Unified telemetry alerts list
  const dynamicAlerts = useMemo(() => {
    const list: Array<{
      id: string;
      centerId: string;
      name: string;
      status: "CRITICAL" | "WARNING";
      type: string;
      message: string;
      time: string;
      category: "SILENT" | "STOCK_OUT" | "FACILITY";
    }> = [];

    // 1. Regular active alerts from status !== "GOOD"
    centers.forEach((c) => {
      if (c.status === "CRITICAL" && c.alertMessage) {
        list.push({
          id: `facility-crit-${c.id}`,
          centerId: c.id,
          name: c.name,
          status: "CRITICAL",
          type: c.type,
          message: c.alertMessage,
          time: c.last_report_time,
          category: "FACILITY",
        });
      } else if (c.status === "WARNING" && c.alertMessage) {
        list.push({
          id: `facility-warn-${c.id}`,
          centerId: c.id,
          name: c.name,
          status: "WARNING",
          type: c.type,
          message: c.alertMessage,
          time: c.last_report_time,
          category: "FACILITY",
        });
      }
    });

    // 2. Silent Center Anomalies (Missing reports)
    centers.forEach((c) => {
      if (c.last_report_days_ago >= 3) {
        list.push({
          id: `silent-esc-${c.id}`,
          centerId: c.id,
          name: c.name,
          status: "CRITICAL",
          type: c.type,
          message: `ESCALATED SILENT: No telemetry received from this center for ${c.last_report_days_ago} days. Local medical team alerted.`,
          time: `${c.last_report_days_ago} days ago`,
          category: "SILENT",
        });
      } else if (c.last_report_days_ago >= 1) {
        list.push({
          id: `silent-warn-${c.id}`,
          centerId: c.id,
          name: c.name,
          status: "WARNING",
          type: c.type,
          message: `SILENT FACILITY: 24h+ reporting compliance gap detected. No report received today.`,
          time: "24h overdue",
          category: "SILENT",
        });
      }
    });

    // 3. Predictive Stock Out Alerts
    centers.forEach((c) => {
      Object.keys(c.stock).forEach((key) => {
        const item = c.stock[key];
        if (item.days_remaining < 3 && item.quantity > 0) {
          list.push({
            id: `stock-crit-${c.id}-${key}`,
            centerId: c.id,
            name: c.name,
            status: "CRITICAL",
            type: c.type,
            message: `CRITICAL RUNWAY: ${key} stock depleted down to ${item.quantity} units (Runway: <3 days). Emergency transfer required.`,
            time: "Logistics Predictor",
            category: "STOCK_OUT",
          });
        } else if (item.days_remaining < 5 && item.quantity > 0) {
          list.push({
            id: `stock-warn-${c.id}-${key}`,
            centerId: c.id,
            name: c.name,
            status: "WARNING",
            type: c.type,
            message: `PREDICTIVE ALERT: ${key} runway is down to ${Math.round(item.days_remaining)} days (${item.quantity} units remaining).`,
            time: "Logistics Predictor",
            category: "STOCK_OUT",
          });
        }
      });
    });

    return list;
  }, [centers]);

  const dynamicCriticalCount = useMemo(() => {
    return dynamicAlerts.filter((a) => a.status === "CRITICAL").length;
  }, [dynamicAlerts]);

  // Reporting today: last_report_days_ago === 0
  const reportingToday = centers.filter((c) => c.last_report_days_ago === 0).length;
  const missingReportCount = totalCenters - reportingToday;

  const criticalCount = centers.filter((c) => c.status === "CRITICAL").length;


  // Bed Occupancy
  const totalBeds = centers.reduce((sum, c) => sum + c.beds_total, 0);
  const occupiedBeds = centers.reduce((sum, c) => sum + c.beds_occupied, 0);
  const bedOccupancyPercentage = Math.round((occupiedBeds / totalBeds) * 100);

  // Gather active alerts sorted by severity (CRITICAL, then WARNING)
  const activeAlerts = useMemo(() => {
    return centers
      .filter((c) => c.status !== "GOOD" && c.alertMessage)
      .map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        message: c.alertMessage,
        time: c.last_report_time,
        type: c.type
      }))
      .sort((a, b) => {
        if (a.status === "CRITICAL" && b.status === "WARNING") return -1;
        if (a.status === "WARNING" && b.status === "CRITICAL") return 1;
        return 0;
      });
  }, [centers]);

  // Handle Centers sorting & filtering
  const filteredAndSortedCenters = useMemo(() => {
    return centers
      .filter((center) => {
        const matchesSearch = center.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              center.hindiName.includes(searchTerm);
        const matchesType = typeFilter === "ALL" ? true : center.type === typeFilter;
        const matchesStatus = statusFilter === "ALL" ? true : center.status === statusFilter;
        return matchesSearch && matchesType && matchesStatus;
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        // Specific custom sort logic
        if (sortField === "status") {
          const statusOrder = { CRITICAL: 3, WARNING: 2, GOOD: 1 };
          valA = statusOrder[a.status];
          valB = statusOrder[b.status];
        } else if (sortField === "beds") {
          valA = a.beds_occupied / a.beds_total;
          valB = b.beds_occupied / b.beds_total;
        } else if (sortField === "patients") {
          valA = a.today_patient_count;
          valB = b.today_patient_count;
        }

        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
  }, [centers, searchTerm, typeFilter, statusFilter, sortField, sortAsc]);

  const handleRowClick = (id: string) => {
    navigate(`/center/${id}`);
  };

  const toggleSort = (field: "status" | "name" | "beds" | "patients") => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* India Tricolor Header Accent Info */}
      <div className="bg-white border-b border-slate-200 p-4 -mt-6 -mx-4 lg:-mx-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-display font-bold text-slate-800">
            {currentUser ? `${currentUser.district} District Command` : t("navOverview")} <span className="text-xs font-normal text-slate-500 font-sans">| District Overview</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {currentUser 
              ? `Authorized access for ${currentUser.name} • Active command hub of ${currentUser.district} District, ${currentUser.state}`
              : "Real-time supervision of medical facilities, drug logistics, and clinical attendance"
            }
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={handleGenerateBrief}
            disabled={isGeneratingBrief}
            className="px-4 py-2 bg-[#f97316] hover:bg-orange-600 disabled:opacity-80 text-white font-display text-xs font-bold rounded-lg shadow-sm hover:shadow-md transition duration-150 flex items-center space-x-1.5 cursor-pointer min-w-[145px] justify-center"
          >
            {isGeneratingBrief ? (
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <Flame className="w-4 h-4 text-white" />
            )}
            <span>{isGeneratingBrief ? "Generating..." : "Generate AI Brief"}</span>
          </button>
          <Link
            to="/analytics"
            className="px-4 py-2 bg-[#1e3a5f] hover:bg-[#152943] text-white font-display text-xs font-bold rounded-lg shadow-sm hover:shadow-md transition duration-150 cursor-pointer"
          >
            Analytics View
          </Link>
        </div>
      </div>

      {/* DISTRICT HEALTH SCORE KPI GAUGE & COMPLIANCE SUMMARY */}
      <div className="bg-[#1e3a5f] text-white rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          
          {/* Column 1: Big circular style gauge score */}
          <div className="flex items-center space-x-5 lg:border-r lg:border-white/10 pr-6">
            <div className="relative flex items-center justify-center w-24 h-24 rounded-full border-4 border-white/10 bg-slate-900/40 flex-shrink-0">
              <span className="text-3xl font-display font-extrabold text-[#f97316]">
                {districtHealth.score}
              </span>
              <span className="absolute -bottom-2 text-[9px] bg-green-600 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider whitespace-nowrap">
                {t("kpiIndex")}
              </span>
            </div>
            <div>
              <h3 className="font-display font-bold text-base">{t("healthScoreTitle")}</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {t("healthScoreDesc")}
              </p>
              <div className="text-[10px] text-green-400 mt-2 flex items-center font-bold">
                <ShieldCheck className="w-4 h-4 mr-1 text-green-400" />
                <span>{t("standardsCompliant")}</span>
              </div>
            </div>
          </div>

          {/* Column 2: Specific Metric Components */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:col-span-2">
            <div className="bg-white/5 border border-white/5 p-3 rounded-xl">
              <div className="flex justify-between items-center text-slate-300 text-[11px] font-bold">
                <span>{t("reportingCompliance")}</span>
                <span className="text-[#f97316] font-mono">{districtHealth.reportingRate}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1 mt-2">
                <div className="bg-green-500 h-1 rounded-full" style={{ width: `${districtHealth.reportingRate}%` }} />
              </div>
            </div>

            <div className="bg-white/5 border border-white/5 p-3 rounded-xl">
              <div className="flex justify-between items-center text-slate-300 text-[11px] font-bold">
                <span>{t("stockRunwayHealth")}</span>
                <span className="text-[#f97316] font-mono">{districtHealth.stockHealth}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1 mt-2">
                <div className="bg-[#f97316] h-1 rounded-full" style={{ width: `${districtHealth.stockHealth}%` }} />
              </div>
            </div>

            <div className="bg-white/5 border border-white/5 p-3 rounded-xl">
              <div className="flex justify-between items-center text-slate-300 text-[11px] font-bold">
                <span>{t("moAttendance")}</span>
                <span className="text-[#f97316] font-mono">{districtHealth.doctorAttendance}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1 mt-2">
                <div className="bg-sky-400 h-1 rounded-full" style={{ width: `${districtHealth.doctorAttendance}%` }} />
              </div>
            </div>

            <div className="bg-white/5 border border-white/5 p-3 rounded-xl">
              <div className="flex justify-between items-center text-slate-300 text-[11px] font-bold">
                <span>{t("bedOccupancyLevel")}</span>
                <span className="text-[#f97316] font-mono">{districtHealth.bedAvailability}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1 mt-2">
                <div className="bg-yellow-500 h-1 rounded-full" style={{ width: `${districtHealth.bedAvailability}%` }} />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* TOP STATS ROW (4 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Centers */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-[#1e3a5f]/10 text-[#1e3a5f] rounded-lg flex-shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t("totalCenters")}</p>
            <h3 className="text-2xl font-display font-bold text-slate-800 mt-1">12</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">{phcCount} PHCs • {chcCount} CHCs</p>
          </div>
        </div>

        {/* Card 2: Reporting Today */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-green-100 text-green-700 rounded-lg flex-shrink-0">
            <FileCheck className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t("reportingToday")}</p>
            <h3 className="text-2xl font-display font-bold text-slate-800 mt-1">
              {reportingToday}<span className="text-sm font-sans text-slate-500">/{totalCenters}</span>
            </h3>
            {missingReportCount > 0 ? (
              <span className="text-[10px] font-bold text-red-600 block mt-0.5 animate-pulse">
                ⚠ {missingReportCount} missing
              </span>
            ) : (
              <span className="text-[10px] text-green-600 font-semibold block mt-0.5">
                100% compliant
              </span>
            )}
          </div>
        </div>

        {/* Card 3: Critical Alerts */}
        <div className={`p-4 rounded-xl border shadow-xs flex items-center space-x-4 transition-colors duration-200 flex-shrink-0 ${
          dynamicCriticalCount > 0 ? "bg-red-50/90 border-red-200" : "bg-white border-slate-200"
        }`}>
          <div className={`p-3 rounded-lg ${
            dynamicCriticalCount > 0 ? "bg-red-600 text-white animate-pulse" : "bg-slate-100 text-slate-500"
          }`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-red-700 uppercase tracking-wider">{t("criticalAlerts")}</p>
            <h3 className="text-2xl font-display font-bold text-red-800 mt-1">
              {dynamicCriticalCount}
            </h3>
            <p className="text-[10px] text-red-600/80 font-medium mt-0.5">Supply/silent/MO absent</p>
          </div>
        </div>

        {/* Card 4: Bed Occupancy */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-orange-100 text-[#f97316] rounded-lg flex-shrink-0">
            <Bed className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t("bedsOccupied")}</p>
            <h3 className="text-2xl font-display font-bold text-slate-800 mt-1">{bedOccupancyPercentage}%</h3>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
              <div 
                className="bg-[#f97316] h-1.5 rounded-full" 
                style={{ width: `${bedOccupancyPercentage}%` }}
              />
            </div>
            <p className="text-[9px] text-slate-500 mt-1 font-mono">{occupiedBeds}/{totalBeds} Active Beds</p>
          </div>
        </div>
      </div>

      {/* ALERT BANNER */}
      {dynamicCriticalCount > 0 && (
        <div className="bg-red-600 text-white rounded-xl px-4 py-3.5 shadow-md flex items-center justify-between animate-pulse">
          <div className="flex items-center space-x-3 min-w-0">
            <AlertTriangle className="w-5.5 h-5.5 flex-shrink-0 text-white" />
            <div>
              <p className="font-display font-bold text-sm">⚠️ {dynamicCriticalCount} {t("activeTelemetryGaps")}</p>
              <p className="text-xs text-red-100 mt-0.5 hidden sm:block">{t("supplyShortfalls")}</p>
            </div>
          </div>
          <button 
            onClick={() => {
              const element = document.getElementById("alerts-feed-card");
              if (element) element.scrollIntoView({ behavior: "smooth" });
            }}
            className="px-3 py-1.5 bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-bold font-display rounded-lg transition duration-150 flex-shrink-0 cursor-pointer"
          >
            {t("viewAlertFeed")}
          </button>
        </div>
      )}

      {/* MAIN CONTENT (2 column layout: Map 60% & Alert Feed 40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* Left Column (60%): Map */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-slate-800 text-base flex items-center space-x-1.5">
              <span>District Geospatial Dashboard</span>
              <span className="text-xs font-normal text-slate-500 font-sans">| भू-स्थानिक मानचित्र</span>
            </h3>
            <span className="text-xs font-medium text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200">
              Active Map Layers: OpenStreetMap
            </span>
          </div>
          <div className="bg-white p-1 rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-[450px] lg:h-[500px]">
            <DistrictMap centers={centers} />
          </div>
        </div>

        {/* Right Column (40%): Alert Feed */}
        <div id="alerts-feed-card" className="lg:col-span-4 flex flex-col">
          <div className="mb-3">
            <h3 className="font-display font-bold text-slate-800 text-base">
              Real-time Alert Feed <span className="text-xs font-normal text-slate-500 font-sans">| लाइव अलर्ट फ़ीड</span>
            </h3>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col flex-1 max-h-[500px] overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Telemetry Alerts & Gaps</span>
              <span className="text-[10px] font-bold bg-[#1e3a5f] text-white px-2 py-0.5 rounded-full">
                {dynamicAlerts.length} issues detected
              </span>
            </div>

            <div className="p-4 overflow-y-auto flex-1 custom-scrollbar space-y-3">
              {dynamicAlerts.length === 0 ? (
                <div className="text-center py-16 text-slate-500 space-y-2">
                  <span className="text-3xl">🎉</span>
                  <p className="font-bold text-sm text-green-600">{t("noAlerts")}</p>
                  <p className="text-xs text-slate-400 font-sans">No telemetry anomalies or imminent stock-outs detected.</p>
                </div>
              ) : (
                dynamicAlerts.map((alert) => (
                  <div 
                    key={alert.id}
                    className={`p-3 rounded-xl border flex items-start space-x-3 transition hover:shadow-xs cursor-pointer ${
                      alert.status === "CRITICAL" 
                        ? "bg-red-50/80 border-red-200 hover:bg-red-50" 
                        : "bg-amber-50/80 border-amber-200 hover:bg-amber-50"
                    }`}
                    onClick={() => navigate(`/center/${alert.centerId}`)}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full flex-shrink-0 mt-1 border border-white ${
                      alert.status === "CRITICAL" ? "bg-red-600 animate-pulse" : "bg-amber-500"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-slate-900 truncate">{getLocalizedCenterName(alert.name, language)}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[8px] font-mono font-bold uppercase ${
                          alert.category === "SILENT" ? "bg-purple-100 text-purple-800" :
                          alert.category === "STOCK_OUT" ? "bg-orange-100 text-orange-800" :
                          "bg-blue-100 text-blue-800"
                        }`}>
                          {alert.category}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-700 mt-1 leading-relaxed">
                        {getLocalizedAlert(alert.message, language)}
                      </p>
                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-200/50">
                        <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{alert.time}</span>
                        </span>
                        <span className="text-[10px] text-[#1e3a5f] font-semibold hover:underline flex items-center space-x-0.5">
                          <span>{t("inspect")}</span>
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3.5 bg-slate-50 border-t border-slate-100 text-center">
              <button 
                onClick={handleGenerateBrief}
                disabled={isGeneratingBrief}
                className="text-xs text-[#1e3a5f] hover:text-[#f97316] disabled:opacity-60 font-bold font-display inline-flex items-center space-x-1 cursor-pointer"
              >
                {isGeneratingBrief ? (
                  <svg className="animate-spin h-3 w-3 text-[#1e3a5f] mr-1" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : null}
                <span>{isGeneratingBrief ? "Generating Plan..." : "Generate Smart Intervention Plan"}</span>
                {!isGeneratingBrief && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SMART LOGISTICS & STOCK-OUT REDISTRIBUTION HUB */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-slate-100">
          <div>
            <h3 className="font-display font-bold text-slate-900 text-sm flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#f97316] animate-pulse" />
              <span>{t("smartLogisticsTitle")}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">{t("smartLogisticsSub")}</p>
          </div>
          <button 
            onClick={handleGenerateBrief}
            disabled={isGeneratingBrief}
            className="px-3.5 py-1.5 bg-[#1e3a5f]/10 hover:bg-[#1e3a5f]/20 disabled:opacity-60 text-[#1e3a5f] font-display text-xs font-bold rounded-lg transition duration-150 flex items-center space-x-1 cursor-pointer"
          >
            {isGeneratingBrief ? (
              <svg className="animate-spin h-3.5 w-3.5 text-[#1e3a5f]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : null}
            <span>{isGeneratingBrief ? "Preparing Plan..." : t("interactiveLogisticsPlan")}</span>
            {!isGeneratingBrief && <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </div>

        {validRedistributions.length === 0 ? (
          <div className="text-center py-6 bg-slate-50 rounded-xl text-slate-500">
            <p className="text-xs font-bold text-green-600">✓ {t("allFacilitiesWellStocked")}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{t("noCriticalDrugDeficiencies")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {validRedistributions.slice(0, 3).map((rec, index) => (
              <div key={index} className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 bg-orange-100 text-[#f97316] font-mono text-[9px] font-bold rounded-md uppercase">
                    {t("action")} {getLocalizedDrugName(rec.item, language)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {rec.distance_km} km away
                  </span>
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] text-slate-500">
                    {t("from")}: <span className="font-bold text-slate-800">{getLocalizedCenterName(rec.source_name, language)}</span> (Surplus: {rec.source_surplus} units)
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {t("to")}: <span className="font-bold text-slate-800">{getLocalizedCenterName(rec.target_name, language)}</span> (Runway: <span className="text-red-600 font-bold">{Math.round(rec.target_runway_days || 0)} days</span>)
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1e3a5f]">
                    {t("transferQty")}: {rec.recommended_quantity}
                  </span>
                  <Link 
                    to="/district-brief"
                    className="text-[10px] text-[#f97316] hover:underline font-bold flex items-center"
                  >
                    <span>{t("executePlan")}</span>
                    <ChevronRight className="w-3 h-3 ml-0.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FILTER & DATA TABLE (ALL CENTERS) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Table Controls */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/30 flex flex-wrap gap-4 items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-slate-800 text-base">{t("facilityMonitoringDirectory")}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{t("facilitySub")}</p>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            {/* Search Bar */}
            <div className="relative w-52">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input 
                type="text" 
                placeholder={t("searchPlaceholder")} 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
              />
            </div>

            {/* Type Selector */}
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button 
                onClick={() => setTypeFilter("ALL")}
                className={`px-2 py-1 text-[10px] font-bold rounded-md ${typeFilter === "ALL" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
              >
                {t("all")}
              </button>
              <button 
                onClick={() => setTypeFilter("PHC")}
                className={`px-2 py-1 text-[10px] font-bold rounded-md ${typeFilter === "PHC" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
              >
                PHC
              </button>
              <button 
                onClick={() => setTypeFilter("CHC")}
                className={`px-2 py-1 text-[10px] font-bold rounded-md ${typeFilter === "CHC" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
              >
                CHC
              </button>
            </div>

            {/* Status Filter */}
            <select 
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">{t("allStatus")}</option>
              <option value="CRITICAL">🔴 {t("statusCritical")}</option>
              <option value="WARNING">🟡 {t("statusWarning")}</option>
              <option value="GOOD">🟢 {t("statusGood")}</option>
            </select>
          </div>
        </div>

        {/* Directory Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold tracking-wider uppercase">
                <th className="py-3 px-4 font-display">
                  <button onClick={() => toggleSort("name")} className="flex items-center space-x-1 hover:text-slate-800 cursor-pointer">
                    <span>{language === "en" ? "Center Name" : t("appName")}</span>
                    {sortField === "name" && (sortAsc ? " ▴" : " ▾")}
                  </button>
                </th>
                <th className="py-3 px-4 font-display">{t("type")}</th>
                <th className="py-3 px-4 font-display">
                  <button onClick={() => toggleSort("status")} className="flex items-center space-x-1 hover:text-slate-800 cursor-pointer">
                    <span>{t("status")}</span>
                    {sortField === "status" && (sortAsc ? " ▴" : " ▾")}
                  </button>
                </th>
                <th className="py-3 px-4 font-display">{t("medicalOfficer")}</th>
                <th className="py-3 px-4 font-display">
                  <button onClick={() => toggleSort("beds")} className="flex items-center space-x-1 hover:text-slate-800 cursor-pointer">
                    <span>{t("bedsOccupancy")}</span>
                    {sortField === "beds" && (sortAsc ? " ▴" : " ▾")}
                  </button>
                </th>
                <th className="py-3 px-4 font-display">
                  <button onClick={() => toggleSort("patients")} className="flex items-center space-x-1 hover:text-slate-800 cursor-pointer">
                    <span>{t("todayPatients")}</span>
                    {sortField === "patients" && (sortAsc ? " ▴" : " ▾")}
                  </button>
                </th>
                <th className="py-3 px-4 font-display">{t("activeActionAlert")}</th>
                <th className="py-3 px-4 font-display">{t("lastSync")}</th>
                <th className="py-3 px-4 font-display">{t("action")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredAndSortedCenters.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-500">
                    No medical centers matching filters were found.
                  </td>
                </tr>
              ) : (
                filteredAndSortedCenters.map((center) => {
                  const bedPercent = Math.round((center.beds_occupied / center.beds_total) * 100);
                  const isCritical = center.status === "CRITICAL";

                  return (
                    <tr 
                      key={center.id}
                      onClick={() => handleRowClick(center.id)}
                      className={`hover:bg-slate-50/80 transition duration-150 cursor-pointer ${
                        isCritical ? "border-l-4 border-l-red-600 bg-red-50/10" : "border-l-4 border-l-transparent"
                      }`}
                    >
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div>
                          <p>{getLocalizedCenterName(center.name, language)}</p>
                          <p className="text-[10px] text-slate-400 font-normal mt-0.5">{center.hindiName}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold ${
                          center.type === "CHC" ? "bg-slate-100 text-slate-800" : "bg-[#1e3a5f]/10 text-[#1e3a5f]"
                        }`}>
                          {center.type}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold gap-1 ${
                          center.status === "CRITICAL" 
                            ? "bg-red-100 text-red-800 animate-pulse" 
                            : center.status === "WARNING"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-green-100 text-green-800"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            center.status === "CRITICAL" ? "bg-red-600 animate-ping" : center.status === "WARNING" ? "bg-amber-500" : "bg-green-500"
                          }`} />
                          {center.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {center.doctor_present ? (
                          <div className="flex items-center text-green-600 font-medium">
                            <UserCheck2 className="w-4 h-4 mr-1 flex-shrink-0" />
                            <span className="truncate max-w-[130px]">{center.doctor_name || t("moPresent")}</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-red-600 font-medium">
                            <UserX2 className="w-4 h-4 mr-1 flex-shrink-0" />
                            <span>{t("moAbsent")} ({center.doctor_absent_days}d)</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="w-24">
                          <div className="flex items-center justify-between text-[10px] mb-1 font-mono">
                            <span className="font-bold">{center.beds_occupied}/{center.beds_total}</span>
                            <span>{bedPercent}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1">
                            <div 
                              className={`h-1 rounded-full ${
                                bedPercent >= 90 ? "bg-red-600" : bedPercent >= 75 ? "bg-amber-500" : "bg-green-500"
                              }`}
                              style={{ width: `${bedPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        {center.today_patient_count}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[11px] font-medium ${isCritical ? "text-red-600 font-semibold" : center.status === "WARNING" ? "text-amber-700" : "text-slate-400"}`}>
                          {center.alertMessage ? `⚠️ ${getLocalizedAlert(center.alertMessage, language)}` : getLocalizedAlert("Normal Operations", language)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[10px] font-mono">
                        {center.last_report_time}
                      </td>
                      <td className="py-3 px-4">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/center/${center.id}`);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-[#1e3a5f] hover:text-white rounded text-[10px] font-bold text-slate-700 transition duration-150 cursor-pointer"
                        >
                          {t("inspect")}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
