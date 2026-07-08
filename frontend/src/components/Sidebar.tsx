import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  BrainCircuit, 
  BarChart3, 
  TableProperties, 
  Settings, 
  X, 
  Menu,
  Building2,
  FileSpreadsheet,
  LogOut
} from "lucide-react";
import { useLanguage } from "../utils/LanguageContext";
import { TranslationSet } from "../utils/translations";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onLogout?: () => void;
}

export default function Sidebar({ isOpen, onToggle, onLogout }: SidebarProps) {
  const { t, language } = useLanguage();

  const navItems = [
    {
      to: "/",
      labelKey: "navOverview" as keyof TranslationSet,
      english: "District Overview",
      icon: LayoutDashboard
    },
    {
      to: "/district-brief",
      labelKey: "navAiBrief" as keyof TranslationSet,
      english: "AI District Brief",
      icon: BrainCircuit
    },
    {
      to: "/analytics",
      labelKey: "navAnalytics" as keyof TranslationSet,
      english: "Reports & Analytics",
      icon: BarChart3
    },
    {
      to: "/centers",
      labelKey: "navAllCenters" as keyof TranslationSet,
      english: "All Centers",
      icon: TableProperties
    },
    {
      to: "/settings",
      labelKey: "navSettings" as keyof TranslationSet,
      english: "DHCC Settings",
      icon: Settings
    }
  ];

  return (
    <>
      {/* Mobile Sidebar Toggle Button */}
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-4 z-40 md:hidden p-3 rounded-full bg-[#1e3a5f] text-white shadow-xl hover:bg-slate-800 transition duration-150 border border-white/20 flex items-center justify-center"
        aria-label="Toggle Navigation Menu"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          onClick={onToggle}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-30 md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 w-64 bg-[#1e3a5f] text-slate-300 z-30 transition-all duration-200 ease-in-out md:translate-x-0 flex flex-col justify-between ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Navigation Section */}
        <div className="flex-1 py-6 flex flex-col">
          {/* Sidebar Header for Mobile only */}
          <div className="px-5 mb-6 flex items-center justify-between md:hidden text-white border-b border-[#23456e] pb-3">
            <span className="font-display font-bold">Command Navigation</span>
            <button onClick={onToggle} className="p-1 rounded-md text-slate-300 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-4 mb-4">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3">
              Navigation
            </p>
          </div>

          <nav className="space-y-1 px-2">
            {navItems.map((item) => {
              const IconComp = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => {
                    // Close sidebar on mobile after clicking
                    if (window.innerWidth < 768) {
                      onToggle();
                    }
                  }}
                  className={({ isActive }) => `
                    flex flex-col px-4 py-2.5 rounded transition duration-150 group border-l-4
                    ${isActive 
                      ? "border-l-[#f97316] bg-[#172d49] text-white font-bold animate-pulse-subtle" 
                      : "border-l-transparent text-slate-300 hover:bg-[#172d49] hover:text-white"
                    }
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <IconComp className="w-5 h-5 transition duration-150 group-hover:scale-105" />
                    <span className="font-display text-sm tracking-tight">{t(item.labelKey)}</span>
                  </div>
                  {language !== "en" && (
                    <span className="text-[10px] pl-8 text-slate-400 font-normal">
                      {item.english}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Functional Sidebar Logout Option */}
          {onLogout && (
            <div className="px-4 mt-6">
              <button
                onClick={onLogout}
                className="w-full flex items-center space-x-3 px-4 py-2.5 rounded text-red-200 hover:text-white hover:bg-red-500/25 border-l-4 border-l-transparent hover:border-l-red-500 transition duration-150 group cursor-pointer"
                id="sidebar-logout-btn"
              >
                <LogOut className="w-5 h-5 text-red-300 group-hover:scale-105 transition duration-150" />
                <span className="font-display text-sm tracking-tight font-medium">Log Out Session</span>
              </button>
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-6 text-[10px] text-slate-500 border-t border-[#23456e]">
          <p className="mb-1 text-slate-400 font-semibold">Swasthya Setu • GoI Initiative</p>
          <p className="text-slate-500">Powered by Sarvam AI</p>
        </div>
      </aside>
    </>
  );
}
