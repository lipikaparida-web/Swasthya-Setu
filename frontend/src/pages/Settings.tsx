import { useState, FormEvent } from "react";
import { 
  Settings, 
  User, 
  Bell, 
  ShieldCheck, 
  Database, 
  Activity,
  CheckCircle,
  Save,
  SlidersHorizontal,
  Volume2
} from "lucide-react";
import { useLanguage } from "../utils/LanguageContext";

interface SettingsProps {
  currentUser?: {
    name: string;
    email: string;
    state: string;
    district: string;
  } | null;
}

export default function SettingsPage({ currentUser }: SettingsProps) {
  const { t, language } = useLanguage();
  const [showToast, setShowToast] = useState(false);
  const [stockLimit, setStockLimit] = useState(7);
  const [absenceLimit, setAbsenceLimit] = useState(3);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [autoRedistribute, setAutoRedistribute] = useState(true);

  const getUserInitials = (name: string) => {
    if (!name) return "AD";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className="space-y-6">
      
      {/* Title Header */}
      <div className="bg-white border-b border-slate-200 p-4 -mt-6 -mx-4 lg:-mx-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-display font-bold text-slate-800 flex items-center space-x-2">
            <Settings className="w-5.5 h-5.5 text-[#1e3a5f]" />
            <span>{t("navSettings")} <span className="text-xs font-normal text-slate-500 font-sans">| Command Center Configurator</span></span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">Configure automated logistical thresholds, emergency dispatch parameters, and credentials</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2/3): Core Settings Forms */}
        <form onSubmit={handleSave} className="lg:col-span-2 space-y-6">
          
          {/* Card 1: Logistical Threshold Control */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="font-display font-bold text-slate-800 text-sm flex items-center gap-2 border-b pb-3">
              <SlidersHorizontal className="w-4.5 h-4.5 text-[#f97316]" />
              Automated Alert Trigger Thresholds
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-2">
                <label className="font-bold text-slate-700 block">LOW STOCK WARNING RUNWAY</label>
                <input 
                  type="number" 
                  value={stockLimit}
                  onChange={(e) => setStockLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold font-mono text-slate-800"
                />
                <span className="text-[10px] text-slate-400 block leading-relaxed">
                  Triggers yellow warning badge when any medicine falls below this many days of stock.
                </span>
              </div>

              <div className="space-y-2">
                <label className="font-bold text-slate-700 block">DOCTOR ABSENCE ALERT CUTOFF</label>
                <input 
                  type="number" 
                  value={absenceLimit}
                  onChange={(e) => setAbsenceLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold font-mono text-slate-800"
                />
                <span className="text-[10px] text-slate-400 block leading-relaxed">
                  Triggers red critical alert when duty roster absences exceed this many consecutive days.
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Emergency SMS Dispatch & AI Parameters */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="font-display font-bold text-slate-800 text-sm flex items-center gap-2 border-b pb-3">
              <Bell className="w-4.5 h-4.5 text-[#1e3a5f]" />
              Smart Ingestion & Dispatcher Options
            </h3>

            <div className="space-y-4 text-xs">
              <div className="flex items-start justify-between p-3 bg-slate-50 rounded-xl">
                <div className="max-w-md">
                  <span className="font-bold text-slate-800 block">Emergency SMS Dispatcher</span>
                  <span className="text-[11px] text-slate-400 mt-1 block leading-relaxed">
                    Automatically dispatch warning SMS notifications to District Medical Officers and Facility Managers when stock runs under 48 hours.
                  </span>
                </div>
                <input 
                  type="checkbox" 
                  checked={smsAlerts}
                  onChange={(e) => setSmsAlerts(e.target.checked)}
                  className="w-4 h-4 text-[#f97316] rounded border-slate-300 mt-1"
                />
              </div>

              <div className="flex items-start justify-between p-3 bg-slate-50 rounded-xl">
                <div className="max-w-md">
                  <span className="font-bold text-slate-800 block">Interactive AI Logistical Redistribution</span>
                  <span className="text-[11px] text-slate-400 mt-1 block leading-relaxed">
                    Identify medical supply surplus centers automatically and suggest inter-facility transfer paths inside the AI Memo.
                  </span>
                </div>
                <input 
                  type="checkbox" 
                  checked={autoRedistribute}
                  onChange={(e) => setAutoRedistribute(e.target.checked)}
                  className="w-4 h-4 text-[#f97316] rounded border-slate-300 mt-1"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#f97316] hover:bg-orange-600 text-white font-display font-bold text-xs rounded-lg shadow-md hover:shadow-lg transition flex items-center space-x-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{t("saveSystemParameters")}</span>
            </button>
          </div>

        </form>

        {/* Right Column (1/3): Profile Info */}
        <div className="space-y-6">
          {/* Card 3: In-Charge Profile Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 border-2 border-[#f97316] mx-auto flex items-center justify-center text-slate-800 font-bold font-display text-lg">
              {currentUser ? getUserInitials(currentUser.name) : "RP"}
            </div>
            <div>
              <h4 className="font-display font-bold text-slate-900 text-base">
                {currentUser ? currentUser.name : "Dr. Ramesh Patra"}
              </h4>
              <p className="text-xs text-slate-400 font-medium">District Medical Officer (DMO)</p>
              <span className="text-[10px] bg-[#1e3a5f]/10 text-[#1e3a5f] px-2 py-0.5 rounded font-bold uppercase mt-1 inline-block">
                {currentUser ? `${currentUser.district} Administrative Hub` : "Khordha Administrative Hub"}
              </span>
            </div>

            <div className="border-t border-slate-100 pt-4 text-left text-xs space-y-2 text-slate-600">
              <p>📍 <span className="font-bold text-slate-800">Office:</span> CMOH Complex, {currentUser ? currentUser.district : "Khordha"}</p>
              <p>📧 <span className="font-bold text-slate-800">Email:</span> {currentUser ? currentUser.email : "ramesh.patra@odisha.gov.in"}</p>
              <p>📞 <span className="font-bold text-slate-800">Phone:</span> +91 94370 12345</p>
            </div>
          </div>

          {/* Card 4: National Integration Credentials */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h4 className="font-display font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4.5 h-4.5 text-green-600" />
              HMIS System Credentials
            </h4>

            <div className="text-[11px] text-slate-500 leading-relaxed space-y-2">
              <p>This command terminal is securely linked with: </p>
              <ul className="list-disc pl-4 space-y-1 font-semibold text-slate-700">
                <li>Sarvam Language API Gateway</li>
                <li>National Health Authority (NHA) Sandbox</li>
                <li>Odisha Drug Management System (OSMCL)</li>
              </ul>
              <p className="text-[10px] text-slate-400 font-mono pt-1">Session Token: SHA-256 Validated</p>
            </div>
          </div>
        </div>

      </div>

      {/* TOAST PANEL */}
      {showToast && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-[#16a34a] text-white px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-2 border border-white/20">
          <CheckCircle className="w-5 h-5 text-white" />
          <span className="text-xs font-bold font-display">{t("parametersSaved")}</span>
        </div>
      )}

    </div>
  );
}
