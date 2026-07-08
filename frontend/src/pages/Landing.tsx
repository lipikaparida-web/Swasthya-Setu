import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Lock, 
  Mail, 
  User, 
  ArrowRight, 
  ShieldCheck, 
  MapPin, 
  Globe, 
  Building2, 
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Activity,
  ArrowLeft,
  Heart,
  ChevronRight
} from "lucide-react";
import { indiaStatesAndDistricts, getDistrictsByState } from "../utils/indiaData";

interface LandingProps {
  onLoginSuccess: (user: {
    name: string;
    email: string;
    state: string;
    district: string;
  }) => void;
}

export default function Landing({ onLoginSuccess }: LandingProps) {
  // activeView can be "landing" | "login" | "register"
  const [activeView, setActiveView] = useState<"landing" | "login" | "register">("landing");
  const [showPassword, setShowPassword] = useState(false);
  
  // Registration States
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regState, setRegState] = useState("");
  const [regDistrict, setRegDistrict] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  
  // Login States
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Feedback States
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Pre-seed default administrator account on load if it doesn't exist
  useEffect(() => {
    const existingUsers = localStorage.getItem("swasthya_setu_users");
    if (!existingUsers) {
      const defaultUsers = [
        {
          name: "Dr. Ramesh Patra",
          email: "admin@swasthyasetu.gov.in",
          password: "admin123",
          state: "Odisha",
          district: "Khordha"
        }
      ];
      localStorage.setItem("swasthya_setu_users", JSON.stringify(defaultUsers));
    }
  }, []);

  // Handle auto-selected districts list based on registered state selection
  const districts = regState ? getDistrictsByState(regState) : [];

  // Reset feedback on view change
  const navigateView = (view: "landing" | "login" | "register") => {
    setActiveView(view);
    setErrorMsg("");
    setSuccessMsg("");
    setShowPassword(false);
  };

  // Registration handler
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!regName.trim() || !regEmail.trim() || !regState || !regDistrict || !regPassword) {
      setErrorMsg("Please fill out all fields.");
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    if (regPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    // Get existing users
    const usersRaw = localStorage.getItem("swasthya_setu_users");
    const users = usersRaw ? JSON.parse(usersRaw) : [];

    // Check if email already registered
    const emailExists = users.some((u: any) => u.email.toLowerCase() === regEmail.toLowerCase());
    if (emailExists) {
      setErrorMsg("This email address is already registered.");
      return;
    }

    // Register new user
    const newUser = {
      name: regName,
      email: regEmail,
      password: regPassword,
      state: regState,
      district: regDistrict
    };

    users.push(newUser);
    localStorage.setItem("swasthya_setu_users", JSON.stringify(users));

    setSuccessMsg("Registration successful! Opening the login page...");
    
    // Auto fill login fields and transition to Login page after a small delay
    setTimeout(() => {
      setLoginEmail(regEmail);
      setLoginPassword(regPassword);
      setActiveView("login");
      setSuccessMsg("Account created successfully. Please login to enter Swasthya Setu.");
    }, 1500);

    // Reset fields
    setRegName("");
    setRegEmail("");
    setRegState("");
    setRegDistrict("");
    setRegPassword("");
    setRegConfirmPassword("");
  };

  // Login handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!loginEmail.trim() || !loginPassword) {
      setErrorMsg("Please fill out both email and password.");
      return;
    }

    // Get stored users
    const usersRaw = localStorage.getItem("swasthya_setu_users");
    const users = usersRaw ? JSON.parse(usersRaw) : [];

    const matchedUser = users.find(
      (u: any) => u.email.toLowerCase() === loginEmail.toLowerCase() && u.password === loginPassword
    );

    if (!matchedUser) {
      setErrorMsg("Invalid credentials. Try: admin@swasthyasetu.gov.in / admin123");
      return;
    }

    setSuccessMsg("Authentication verified. Loading secure dashboard...");
    
    // Save to active session and trigger success callback
    setTimeout(() => {
      onLoginSuccess({
        name: matchedUser.name,
        email: matchedUser.email,
        state: matchedUser.state,
        district: matchedUser.district
      });
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-orange-50/20 to-orange-100/40 text-slate-800 flex flex-col justify-between relative overflow-hidden font-sans select-none selection:bg-[#f97316] selection:text-white">
      
      {/* Grid Pattern overlays */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#f9731604_1px,transparent_1px),linear-gradient(to_bottom,#f9731604_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      
      {/* Giant ambient orange-saffron blur circles in back */}
      <div className="absolute -top-60 -right-60 w-[800px] h-[800px] bg-gradient-to-br from-orange-400/20 to-orange-100/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-60 -left-60 w-[800px] h-[800px] bg-gradient-to-tr from-orange-500/10 to-emerald-400/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header Bar */}
      <header className="w-full px-6 py-4 flex items-center justify-between border-b border-orange-100/60 backdrop-blur-md bg-white/50 z-20">
        <div className="flex items-center gap-3">
          <div className="bg-[#f97316] p-2 rounded-xl shadow-md flex items-center justify-center">
            <Activity className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="font-display font-black tracking-tight text-lg text-[#1e3a5f]">SWASTHYA SETU</div>
            <div className="text-[9px] text-[#f97316] uppercase font-bold tracking-widest leading-none">Government of India</div>
          </div>
        </div>
        
        <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-slate-600 bg-white/80 px-4 py-2 rounded-full border border-orange-100 shadow-xs">
          <Globe className="w-3.5 h-3.5 text-orange-500 animate-spin" style={{ animationDuration: "20s" }} />
          <span>NHM INTEGRATED HEALTH PORTAL</span>
        </div>
      </header>

      {/* Main Dynamic View Stage */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-10 z-10 w-full max-w-5xl mx-auto">
        <AnimatePresence mode="wait">
          
          {activeView === "landing" && (
            /* --- LANDING HERO PAGE VIEW --- */
            <motion.div
              key="landing"
              initial={{ opacity: 0, scale: 0.98, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -15 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center w-full"
            >
              {/* MoHFW Emblem Ribbon Icon */}
              <div className="mb-6 p-3 bg-white border border-orange-200/60 rounded-full shadow-lg flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-orange-500 to-orange-400 text-white flex items-center justify-center shadow-inner">
                  <Heart className="w-8 h-8 fill-white" />
                </div>
              </div>

              {/* WELCOME TO SWASTHYA SETU - CENTERED */}
              <h1 className="text-4xl sm:text-6xl font-display font-black tracking-tight text-[#1e3a5f] leading-tight max-w-3xl">
                Welcome to <span className="text-[#f97316] relative inline-block">Swasthya Setu</span>
              </h1>

              {/* TAGLINE - CENTERED AND VISUALLY GORGEOUS */}
              <p className="text-xl sm:text-2xl font-bold text-[#1e3a5f] mt-4 font-sans tracking-wide max-w-2xl border-t border-orange-100 pt-3">
                Ministry of Health and Family Welfare.
              </p>
              
              <p className="text-xs sm:text-sm text-slate-500 max-w-xl mt-4 leading-relaxed font-sans font-medium">
                Connecting every district's health facilities, medical logs, and essential logistics under a unified, real-time command portal.
              </p>

              {/* VISUAL LAYERS representing healthcare telemetry nodes */}
              <div className="my-8 flex items-center justify-center gap-1.5 bg-white/75 backdrop-blur-sm px-6 py-3 rounded-2xl border border-orange-100/80 shadow-md">
                <div className="flex items-center gap-1.5 text-xs font-bold text-orange-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping" />
                  <span>Odisha Command Active</span>
                </div>
                <span className="text-slate-300 mx-2">|</span>
                <span className="text-xs text-slate-500 font-medium">12 Primary & Community Health Centers Synced</span>
              </div>

              {/* DIRECT ACTION BUTTONS THAT "OPEN" REGISTER OR LOGIN PAGES */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md">
                <button
                  onClick={() => navigateView("login")}
                  className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-orange-500 to-[#f97316] hover:from-orange-600 hover:to-orange-500 text-white font-display font-bold text-sm rounded-xl shadow-lg hover:shadow-orange-500/20 active:scale-98 transition duration-150 flex items-center justify-center gap-2.5 cursor-pointer"
                  id="landing-login-btn"
                >
                  <span>Log In as District Admin</span>
                  <ArrowRight className="w-4.5 h-4.5" />
                </button>

                <button
                  onClick={() => navigateView("register")}
                  className="w-full sm:w-auto px-8 py-4 bg-white border-2 border-orange-200 text-slate-700 hover:text-[#f97316] hover:border-orange-400 font-display font-bold text-sm rounded-xl shadow-md hover:shadow-lg active:scale-98 transition duration-150 flex items-center justify-center gap-2 cursor-pointer"
                  id="landing-register-btn"
                >
                  <span>Register New District Admin</span>
                  <ChevronRight className="w-4.5 h-4.5" />
                </button>
              </div>

            </motion.div>
          )}

          {activeView === "login" && (
            /* --- DEDICATED LOGIN PAGE VIEW --- */
            <motion.div
              key="login"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-md bg-white border border-orange-200/80 rounded-2xl shadow-2xl p-6 sm:p-8 text-left relative"
            >
              {/* Back to main landing arrow */}
              <button
                onClick={() => navigateView("landing")}
                className="absolute -top-12 left-0 sm:left-2 flex items-center gap-1.5 text-xs font-bold text-[#1e3a5f] hover:text-[#f97316] transition bg-white/80 px-3 py-1.5 rounded-full border border-orange-100 shadow-xs"
                id="login-back-btn"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Go Back</span>
              </button>

              <div className="mb-6">
                <span className="text-[9px] bg-orange-100 text-[#f97316] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  GoI Digital Gateway
                </span>
                <h2 className="text-xl sm:text-2xl font-display font-black text-[#1e3a5f] mt-1.5">
                  District Administrator Login
                </h2>
                <p className="text-xs text-slate-400 mt-1">Please enter your official security credentials.</p>
              </div>

              {/* Alerts & Feedbacks */}
              {errorMsg && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs py-3 px-4 rounded-xl flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs py-3 px-4 rounded-xl flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#16a34a]" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Official Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="admin@swasthyasetu.gov.in"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#f97316] focus:bg-white transition shadow-inner"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Secure Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-10 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#f97316] focus:bg-white transition shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Pre-seeded Credentials Helper Box */}
                <div className="bg-orange-50/70 border border-orange-100 p-3 rounded-xl text-[10px] text-slate-600 leading-relaxed font-mono">
                  <span className="text-[#f97316] font-bold block mb-0.5">💡 SECURE DEMO CREDENTIALS</span>
                  Email: <span className="text-slate-800 font-bold">admin@swasthyasetu.gov.in</span><br/>
                  Password: <span className="text-slate-800 font-bold">admin123</span><br/>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 mt-2 bg-gradient-to-r from-orange-500 to-[#f97316] hover:from-orange-600 hover:to-orange-500 text-white font-display font-bold text-xs rounded-xl shadow-lg transition duration-150 flex items-center justify-center gap-2 cursor-pointer"
                  id="login-form-submit-btn"
                >
                  <span>Authorize Entry</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </motion.div>
          )}

          {activeView === "register" && (
            /* --- DEDICATED REGISTRATION PAGE VIEW --- */
            <motion.div
              key="register"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-lg bg-white border border-orange-200/80 rounded-2xl shadow-2xl p-6 sm:p-8 text-left relative"
            >
              {/* Back arrow */}
              <button
                onClick={() => navigateView("landing")}
                className="absolute -top-12 left-0 sm:left-2 flex items-center gap-1.5 text-xs font-bold text-[#1e3a5f] hover:text-[#f97316] transition bg-white/80 px-3 py-1.5 rounded-full border border-orange-100 shadow-xs"
                id="register-back-btn"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Go Back</span>
              </button>

              <div className="mb-5">
                <span className="text-[9px] bg-orange-100 text-[#f97316] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  NHM Officer Enrollment
                </span>
                <h2 className="text-xl sm:text-2xl font-display font-black text-[#1e3a5f] mt-1.5">
                  Officer Registration
                </h2>
                <p className="text-xs text-slate-400 mt-1">Enroll your new administrator profile under Swasthya Setu.</p>
              </div>

              {/* Alerts & Feedbacks */}
              {errorMsg && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs py-3 px-4 rounded-xl flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs py-3 px-4 rounded-xl flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Full Administrator Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Dr. Priyadarshini Rout"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition shadow-inner"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Official Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="administrator@gov.in"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition shadow-inner"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Jurisdiction State</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                      <select
                        required
                        value={regState}
                        onChange={(e) => {
                          setRegState(e.target.value);
                          setRegDistrict(""); // Reset district
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-8 pr-2 text-xs text-slate-800 focus:outline-none focus:border-orange-500 focus:bg-white transition cursor-pointer appearance-none shadow-inner"
                      >
                        <option value="" disabled>Select State</option>
                        {indiaStatesAndDistricts.map((state) => (
                          <option key={state.stateName} value={state.stateName}>
                            {state.stateName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Assigned District</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                      <select
                        required
                        disabled={!regState}
                        value={regDistrict}
                        onChange={(e) => setRegDistrict(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-8 pr-2 text-xs text-slate-800 focus:outline-none focus:border-orange-500 focus:bg-white transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed appearance-none shadow-inner"
                      >
                        <option value="" disabled>Select District</option>
                        {districts.map((dist) => (
                          <option key={dist} value={dist}>
                            {dist}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                      <input
                        type="password"
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-8 text-xs text-slate-800 focus:outline-none focus:border-orange-500 focus:bg-white transition shadow-inner"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Confirm</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                      <input
                        type="password"
                        required
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="Confirm"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-8 text-xs text-slate-800 focus:outline-none focus:border-orange-500 focus:bg-white transition shadow-inner"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-white font-display font-bold text-xs rounded-xl shadow-lg transition duration-150 flex items-center justify-center gap-2 cursor-pointer"
                  id="register-form-submit-btn"
                >
                  <span>Create Official Account</span>
                  <CheckCircle className="w-4 h-4" />
                </button>
              </form>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Footer System Branding Overlay */}
      <footer className="w-full py-5 text-center text-[10px] text-slate-400 border-t border-orange-100 backdrop-blur-md bg-white/30 z-10">
        <p className="font-semibold tracking-wide text-slate-500">
          Swasthya Setu • Government of India Initiative • National Health Mission (NHM) Integration
        </p>
        <p className="text-slate-400 mt-1">
          Authorized official use only. Session telemetry acts are recorded for database audit logs.
        </p>
      </footer>
    </div>
  );
}
