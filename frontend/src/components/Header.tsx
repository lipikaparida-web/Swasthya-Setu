import { useState, useRef, useEffect } from "react";
import { Bell, User, LogOut, MapPin, Activity, ShieldAlert, Menu, Languages, X, Building2, Mail, ShieldCheck } from "lucide-react";
import { Center } from "../types";
import { useLanguage } from "../utils/LanguageContext";

interface HeaderProps {
  centers: Center[];
  onNavigateToCenter: (id: string) => void;
  onToggleSidebar?: () => void;
  currentUser?: {
    name: string;
    email: string;
    state: string;
    district: string;
  } | null;
  onLogout?: () => void;
}

export default function Header({ centers, onNavigateToCenter, onToggleSidebar, currentUser, onLogout }: HeaderProps) {
  const { language, setLanguage, t, supportedLanguages } = useLanguage();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Extract initials for the avatar
  const getUserInitials = (name: string) => {
    if (!name) return "AD";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Filter alerts (CRITICAL & WARNING)
  const alertCenters = centers.filter(
    (c) => c.status === "CRITICAL" || c.status === "WARNING"
  );
  
  const criticalCount = centers.filter((c) => c.status === "CRITICAL").length;

  // Format today's date
  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="relative w-full bg-white text-slate-800 border-b border-slate-200 shadow-sm z-50">
      {/* Tricolor India strip at the very top (Saffron, White, Green) */}
      <div className="w-full h-[3px] flex">
        <div className="flex-1 h-full bg-[#f97316]"></div>
        <div className="flex-1 h-full bg-white"></div>
        <div className="flex-1 h-full bg-[#16a34a]"></div>
      </div>

      <div className="mx-auto px-4 lg:px-6 h-16 flex items-center justify-between">
        {/* Left: Swasthya Setu Logo & Title */}
        <div className="flex items-center space-x-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          )}
          <div className="w-10 h-10 bg-[#1e3a5f] rounded flex items-center justify-center shadow-sm">
            <Activity className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-display font-bold text-lg lg:text-xl text-[#1e3a5f] tracking-tight leading-tight">{t("appName")}</span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-semibold">DHCC v1.4</span>
            </div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{t("ministry")}</p>
          </div>
        </div>

        {/* Center: District & Date Context */}
        <div className="hidden md:flex flex-col items-end text-right border-r border-slate-200 pr-6">
          <p className="text-sm font-semibold text-slate-800">
            {currentUser ? `${currentUser.district} District, ${currentUser.state}` : t("districtName")}
          </p>
          <p className="text-[11px] text-slate-500">{formattedDate}</p>
        </div>

        {/* Right: Notifications & Admin Profile */}
        <div className="flex items-center space-x-3 md:space-x-4">
          {/* Language Selector */}
          <div className="flex items-center space-x-1 border-r border-slate-200 pr-3 mr-1">
            <Languages className="w-4 h-4 text-[#1e3a5f] mr-1 hidden sm:block" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-[11px] font-bold py-1 px-1.5 rounded-lg cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
              title="Select Language"
            >
              {supportedLanguages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
          {/* Notification Bell with Badge */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-full hover:bg-slate-100 transition duration-150 focus:outline-none text-slate-400 hover:text-slate-600"
              title="Alert Notifications"
              id="notification-bell-btn"
            >
              <Bell className="w-5.5 h-5.5" />
              {criticalCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full border border-white">
                  {criticalCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2.5 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 text-slate-800 py-2 z-50 animate-fade-in divide-y divide-slate-100 max-h-[420px] overflow-y-auto custom-scrollbar">
                <div className="px-4 py-2.5 flex items-center justify-between bg-slate-50">
                  <h5 className="font-display font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <ShieldAlert className="w-4.5 h-4.5 text-red-500" />
                    {t("alertsTitle")}
                  </h5>
                  <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                    {alertCenters.length} Alerts
                  </span>
                </div>

                <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto">
                  {alertCenters.length === 0 ? (
                    <div className="px-4 py-6 text-center text-slate-500 text-xs">
                      <p>✅ {t("noAlerts")}</p>
                      <p className="text-[10px] text-slate-400 mt-1">No outstanding stock or attendance alerts.</p>
                    </div>
                  ) : (
                    alertCenters.map((center) => (
                      <button
                        key={center.id}
                        onClick={() => {
                          onNavigateToCenter(center.id);
                          setShowNotifications(false);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 transition duration-150 flex items-start space-x-2.5"
                      >
                        <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                          center.status === "CRITICAL" ? "bg-red-600 animate-ping" : "bg-amber-500"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xs text-slate-900 truncate">{center.name}</p>
                          <p className="text-[11px] text-slate-600 mt-0.5 font-medium leading-relaxed">
                            {center.alertMessage}
                          </p>
                          <span className="text-[9px] text-slate-400 mt-1 block">
                            {center.last_report_time}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <div className="p-2 text-center bg-slate-50">
                  <span className="text-[10px] text-slate-500 font-medium">
                    National Health Mission (NHM) Integration
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Admin User Profile */}
          <button 
            onClick={() => setShowProfileModal(true)}
            className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 p-1 pr-3 rounded-full border border-slate-200 cursor-pointer transition duration-150 focus:outline-none"
            title="View Account Details"
            id="header-user-profile-btn"
          >
            <div className="w-8 h-8 rounded-full bg-[#f97316] text-white flex items-center justify-center font-bold text-xs">
              {currentUser ? getUserInitials(currentUser.name) : "RP"}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[11px] font-bold leading-none text-slate-800">
                {currentUser ? currentUser.name : "Dr. Ramesh Patra"}
              </span>
              <span className="text-[9px] text-slate-500 uppercase font-semibold">{t("roleAdmin")}</span>
            </div>
          </button>

          {/* Functional Logout Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition duration-150 cursor-pointer flex items-center justify-center"
              title="Log Out Session"
              id="header-logout-btn"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          )}
        </div>
      </div>

      {/* Interactive Account Details Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fade-in relative">
            {/* Tricolor decorative top line */}
            <div className="w-full h-1.5 flex">
              <div className="flex-1 h-full bg-[#f97316]"></div>
              <div className="flex-1 h-full bg-slate-200"></div>
              <div className="flex-1 h-full bg-[#16a34a]"></div>
            </div>

            {/* Header */}
            <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-base font-display font-bold text-[#1e3a5f]">
                    Verified Officer Account
                  </h3>
                  <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Government of India Portal</p>
                </div>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition"
                id="close-profile-modal-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-slate-700">
              {/* Profile Card Intro Banner */}
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-orange-500 to-orange-400 text-white flex items-center justify-center font-display font-bold text-lg shadow-md">
                  {currentUser ? getUserInitials(currentUser.name) : "RP"}
                </div>
                <div>
                  <h4 className="font-display font-bold text-slate-900 text-sm leading-tight">
                    {currentUser ? currentUser.name : "Dr. Ramesh Patra"}
                  </h4>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-0.5">
                    District Administrator (NHM-DAC)
                  </p>
                  <span className="inline-flex items-center gap-1 mt-1 text-[9px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-100">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    Active Session Verified
                  </span>
                </div>
              </div>

              {/* Information Rows */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between text-xs py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    Official Email
                  </span>
                  <span className="text-slate-800 font-bold font-mono">
                    {currentUser ? currentUser.email : "admin@swasthyasetu.gov.in"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    Jurisdiction State
                  </span>
                  <span className="text-slate-800 font-bold">
                    {currentUser ? currentUser.state : "Odisha"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    Assigned District
                  </span>
                  <span className="text-slate-800 font-bold">
                    {currentUser ? currentUser.district : "Khordha"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Security Level
                  </span>
                  <span className="text-orange-600 font-bold tracking-wide uppercase font-display text-[10px] bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                    Tier-1 Administrator
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs py-2">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-slate-400" />
                    Session ID
                  </span>
                  <span className="text-slate-500 font-mono text-[10px]">
                    SS-GOI-2026-X839
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-3">
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-display font-bold text-xs rounded-xl transition duration-150 cursor-pointer text-center"
                >
                  Close Panel
                </button>
                {onLogout && (
                  <button
                    onClick={() => {
                      setShowProfileModal(false);
                      onLogout();
                    }}
                    className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-display font-bold text-xs rounded-xl transition duration-150 cursor-pointer flex items-center justify-center gap-1.5 animate-pulse"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
