import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Building2, 
  MapPin, 
  Phone, 
  Activity, 
  Bed, 
  ChevronRight, 
  Search,
  CheckCircle,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  SlidersHorizontal
} from "lucide-react";
import { Center } from "../types";
import { useLanguage } from "../utils/LanguageContext";
import { getLocalizedCenterName, getLocalizedAlert } from "../utils/translations";

interface CentersListProps {
  centers: Center[];
}

export default function CentersList({ centers }: CentersListProps) {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "PHC" | "CHC">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "CRITICAL" | "WARNING" | "GOOD">("ALL");

  const filteredCenters = useMemo(() => {
    return centers.filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || 
                            c.hindiName.includes(search);
      const matchesType = typeFilter === "ALL" ? true : c.type === typeFilter;
      const matchesStatus = statusFilter === "ALL" ? true : c.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [centers, search, typeFilter, statusFilter]);

  return (
    <div className="space-y-6">
      
      {/* Title Header */}
      <div className="bg-white border-b border-slate-200 p-4 -mt-6 -mx-4 lg:-mx-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-display font-bold text-slate-800 flex items-center space-x-2">
            <Building2 className="w-5.5 h-5.5 text-[#1e3a5f]" />
            <span>Facility Registry Database <span className="text-xs font-normal text-slate-500 font-sans">| सभी स्वास्थ्य केंद्र</span></span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">Directory of all Primary & Community Health Centers in Khordha District</p>
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-4 items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input 
            type="text" 
            placeholder="Search facility name, location, or Hindi name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
          />
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5">
            <span className="text-xs text-slate-500">Filter Type:</span>
            <div className="flex bg-slate-100 p-1 rounded-md border border-slate-200">
              <button 
                onClick={() => setTypeFilter("ALL")}
                className={`px-2 py-0.5 text-[10px] font-bold rounded ${typeFilter === "ALL" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500"}`}
              >
                All
              </button>
              <button 
                onClick={() => setTypeFilter("PHC")}
                className={`px-2 py-0.5 text-[10px] font-bold rounded ${typeFilter === "PHC" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500"}`}
              >
                PHC
              </button>
              <button 
                onClick={() => setTypeFilter("CHC")}
                className={`px-2 py-0.5 text-[10px] font-bold rounded ${typeFilter === "CHC" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500"}`}
              >
                CHC
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-xs text-slate-500">Status:</span>
            <select 
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-700"
            >
              <option value="ALL">All States</option>
              <option value="CRITICAL">🔴 Critical Alerts</option>
              <option value="WARNING">🟡 Warnings</option>
              <option value="GOOD">🟢 Good Standing</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid Directory list */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredCenters.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-white rounded-xl border border-slate-200 text-slate-500">
            No medical centers found matching selected filters.
          </div>
        ) : (
          filteredCenters.map((center) => {
            const isCritical = center.status === "CRITICAL";
            const isWarning = center.status === "WARNING";
            const bedPercent = Math.round((center.beds_occupied / center.beds_total) * 100);

            return (
              <div 
                key={center.id}
                onClick={() => navigate(`/center/${center.id}`)}
                className={`bg-white rounded-2xl border transition duration-150 cursor-pointer hover:shadow-md flex flex-col justify-between overflow-hidden relative ${
                  isCritical 
                    ? "border-red-200 hover:border-red-300" 
                    : isWarning 
                    ? "border-amber-200 hover:border-amber-300" 
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {/* Visual Status Indicator strip */}
                <div className={`h-1.5 w-full ${
                  isCritical ? "bg-red-600" : isWarning ? "bg-amber-500" : "bg-green-500"
                }`} />

                <div className="p-5 flex-1 space-y-4">
                  {/* Card Title & Type */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-display font-bold text-slate-800 text-sm">{getLocalizedCenterName(center.name, language)}</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">{center.hindiName}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      center.type === "CHC" ? "bg-slate-100 text-slate-800" : "bg-[#1e3a5f]/10 text-[#1e3a5f]"
                    }`}>
                      {center.type}
                    </span>
                  </div>

                  {/* Geolocation Coordinate and status badge */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center">
                      <MapPin className="w-3.5 h-3.5 mr-1 text-[#f97316]" />
                      Lat: {center.lat}, Lng: {center.lng}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      isCritical 
                        ? "bg-red-100 text-red-800" 
                        : isWarning 
                        ? "bg-amber-100 text-amber-800" 
                        : "bg-green-100 text-green-800"
                    }`}>
                      {center.status}
                    </span>
                  </div>

                  {/* Gauges section */}
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs text-slate-600">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">{t("bedsOccupancy")}</span>
                      <span className="font-bold text-slate-700 mt-1 block">{center.beds_occupied}/{center.beds_total} {t("bedsOccupied")}</span>
                      <div className="w-full bg-slate-200 h-1 rounded-full mt-1.5">
                        <div 
                          className={`h-1 rounded-full ${isCritical ? "bg-red-600" : "bg-green-600"}`}
                          style={{ width: `${bedPercent}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">{t("medicalOfficer")}</span>
                      <span className={`font-bold mt-1 block truncate ${center.doctor_present ? "text-green-600" : "text-red-500"}`}>
                        {center.doctor_present ? `✅ ${t("moPresent")}` : `❌ ${t("moAbsent")}`}
                      </span>
                      <p className="text-[9px] text-slate-400 mt-1 truncate">
                        {center.doctor_name || "Unassigned"}
                      </p>
                    </div>
                  </div>

                  {/* Active Shortage Banner */}
                  {center.alertMessage && (
                    <div className={`p-2 rounded text-[10px] font-semibold leading-relaxed flex items-start gap-1.5 ${
                      isCritical ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                    }`}>
                      <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                      <span>{getLocalizedAlert(center.alertMessage, language)}</span>
                    </div>
                  )}
                </div>

                {/* Footer link button */}
                <div className="bg-slate-50 border-t border-slate-100 p-3 text-center">
                  <span className="text-xs text-[#1e3a5f] hover:text-[#f97316] font-bold font-display inline-flex items-center space-x-0.5">
                    <span>Manage Facility Systems</span>
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
