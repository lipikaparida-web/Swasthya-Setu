import { useState, useEffect } from "react";
import { HashRouter, Routes, Route, useNavigate } from "react-router-dom";
import { Center } from "./types";
import { initialCenters } from "./mockData";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import { LanguageProvider } from "./utils/LanguageContext";
import { fetchCenters } from "./utils/api";

// Pages
import Dashboard from "./pages/Dashboard";
import CenterDetail from "./pages/CenterDetail";
import AiBrief from "./pages/AiBrief";
import Analytics from "./pages/Analytics";
import CentersList from "./pages/CentersList";
import SettingsPage from "./pages/Settings";
import Landing from "./pages/Landing";

function AppContent() {
  const navigate = useNavigate();
  const [centers, setCenters] = useState<Center[]>(initialCenters);
  const [centersLoading, setCentersLoading] = useState(false);

  // Load live Firestore centers on mount; fall back to mockData if backend is down
  useEffect(() => {
    setCentersLoading(true);
    fetchCenters()
      .then((res) => {
        if (res.success && Array.isArray(res.centers) && res.centers.length > 0) {
          // Merge Firestore data with mockData structure (mockData has richer UI fields)
          // Firestore fields override matching mock fields; new centers are appended
          const merged = initialCenters.map((mock) => {
            const live = (res.centers as Center[]).find((c) => c.id === mock.id);
            return live ? { ...mock, ...live } : mock;
          });
          setCenters(merged);
        }
        // If backend returns empty, keep mockData as-is
      })
      .catch(() => {
        // Backend unavailable — silently continue with mockData
        console.info("[Swasthya Setu] Backend offline — using local mock data.");
      })
      .finally(() => setCentersLoading(false));
  }, []);
  void centersLoading; // Used for future loading indicator
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    name: string;
    email: string;
    state: string;
    district: string;
  } | null>(() => {
    const saved = localStorage.getItem("swasthya_setu_user");
    return saved ? JSON.parse(saved) : null;
  });

  // Unified State Modifier callback for interactive updates
  const handleUpdateCenter = (id: string, updatedFields: Partial<Center>) => {
    setCenters((prevCenters) =>
      prevCenters.map((center) =>
        center.id === id ? { ...center, ...updatedFields } : center
      )
    );
  };

  const handleNavigateToCenter = (id: string) => {
    navigate(`/center/${id}`);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleLoginSuccess = (user: {
    name: string;
    email: string;
    state: string;
    district: string;
  }) => {
    localStorage.setItem("swasthya_setu_user", JSON.stringify(user));
    setCurrentUser(user);
    navigate("/");
  };

  const handleLogout = () => {
    localStorage.removeItem("swasthya_setu_user");
    setCurrentUser(null);
    navigate("/");
  };

  // Guard Clause for Non-Authenticated Landing Screen
  if (!currentUser) {
    return <Landing onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f1f5f9] text-slate-800 font-sans">
      
      {/* Universal Top Header */}
      <Header 
        centers={centers} 
        onNavigateToCenter={handleNavigateToCenter} 
        onToggleSidebar={toggleSidebar}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Core Layout: Sidebar + Route Viewport */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Navigation Sidebar */}
        <Sidebar 
          isOpen={sidebarOpen} 
          onToggle={toggleSidebar} 
          onLogout={handleLogout}
        />

        {/* Dynamic Route Content Area */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto custom-scrollbar relative">
          
          <Routes>
            <Route 
              path="/" 
              element={<Dashboard centers={centers} currentUser={currentUser} />} 
            />
            <Route 
              path="/center/:id" 
              element={
                <CenterDetail 
                  centers={centers} 
                  onUpdateCenter={handleUpdateCenter} 
                />
              } 
            />
            <Route 
              path="/district-brief" 
              element={
                <AiBrief 
                  centers={centers} 
                  onUpdateCenter={handleUpdateCenter} 
                />
              } 
            />
            <Route 
              path="/analytics" 
              element={<Analytics centers={centers} />} 
            />
            <Route 
              path="/centers" 
              element={<CentersList centers={centers} />} 
            />
            <Route 
              path="/settings" 
              element={<SettingsPage currentUser={currentUser} />} 
            />
          </Routes>

          {/* Footer branding */}
          <footer className="no-print mt-12 pt-6 border-t border-slate-200/80 text-center text-[10px] text-slate-400 font-medium space-y-1">
            <p>Swasthya Setu • Government of India Initiative • National Health Mission (NHM) Integration</p>
            <p>Powered by Sarvam AI & Firebase • Command Node: {currentUser.district} District, {currentUser.state} Hub • Built for Hackathon Demo</p>
          </footer>
        </main>

      </div>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </LanguageProvider>
  );
}
