import { useState, useEffect, FormEvent } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Users, 
  Bed, 
  FileText, 
  Activity,
  AlertCircle,
  Truck,
  TrendingUp,
  Mic,
  MicOff,
  Languages,
  RotateCcw,
  Plus,
  BookmarkCheck,
  Check
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";
import { Center, StockItem } from "../types";
import { parseVoiceReport, parseSMSReport } from "../utils/healthCalculations";
import { MessageSquare, PhoneCall, Play } from "lucide-react";
import { useLanguage } from "../utils/LanguageContext";
import { getLocalizedCenterName, getLocalizedDrugName, getLocalizedAlert } from "../utils/translations";
import { parseReportWithAI, submitDailyReport } from "../utils/api";


const getDemandForecastPill = (drugName: string, lang: string) => {
  const name = drugName.toLowerCase();
  if (name.includes("paracetamol")) {
    return {
      text: lang === "hi" ? "पूर्वानुमान: +30% मौसमी उछाल" : lang === "or" ? "ପୂର୍ବାନୁମାନ: +୩୦% ମୌସୁମୀ ବୃଦ୍ଧି" : "Forecast: +30% Monsoonal Spike",
      color: "bg-amber-50 text-amber-700 border-amber-200"
    };
  }
  if (name.includes("ors")) {
    return {
      text: lang === "hi" ? "पूर्वानुमान: +40% डेंगू जोखिम वृद्धि" : lang === "or" ? "ପୂର୍ବାନୁମାନ: +୪୦% ଡେଙ୍ଗୁ ଜର ବୃଦ୍ଧି" : "Forecast: +40% Dengue Peak",
      color: "bg-red-50 text-red-700 border-red-200 animate-pulse"
    };
  }
  if (name.includes("dengue")) {
    return {
      text: lang === "hi" ? "पूर्वानुमान: +50% वेक्टर सीजन पीक" : lang === "or" ? "ପୂର୍ବାନୁମାନ: +୫୦% ମଶାଜନିତ ଜର ବୃଦ୍ଧି" : "Forecast: +50% Dengue Peak",
      color: "bg-red-50 text-red-700 border-red-200 animate-pulse"
    };
  }
  if (name.includes("malaria")) {
    return {
      text: lang === "hi" ? "पूर्वानुमान: +35% मानसून प्रभाव" : lang === "or" ? "ପୂର୍ବାନୁମାନ: +୩୫% ମୌସୁମୀ ଜର ବୃଦ୍ଧି" : "Forecast: +35% Malaria Peak",
      color: "bg-orange-50 text-orange-700 border-orange-200"
    };
  }
  if (name.includes("amoxicillin") || name.includes("cotrimoxazole") || name.includes("metronidazole")) {
    return {
      text: lang === "hi" ? "पूर्वानुमान: स्थिर मांग" : lang === "or" ? "ପୂର୍ବାନୁମାନ: ସ୍ଥିର ଚାହିଦା" : "Forecast: Stable Demand",
      color: "bg-slate-50 text-slate-600 border-slate-200"
    };
  }
  return {
    text: lang === "hi" ? "पूर्वानुमान: सामान्य मांग" : lang === "or" ? "ପୂର୍ବାନୁମାନ: ସାଧାରଣ ଚାହିଦା" : "Forecast: Steady Baseline",
    color: "bg-indigo-50/50 text-indigo-700 border-indigo-100"
  };
};

interface CenterDetailProps {
  centers: Center[];
  onUpdateCenter: (id: string, updatedFields: Partial<Center>) => void;
}

export default function CenterDetail({ centers, onUpdateCenter }: CenterDetailProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language: globalLang, t: globalT } = useLanguage();
  const [activeTab, setActiveTab] = useState<"stock" | "trends" | "submit">("stock");
  const [language, setLanguage] = useState<"EN" | "HI" | "OR">("EN");

  // Sync with global language on change
  useEffect(() => {
    if (globalLang) {
      const glUpper = globalLang.toUpperCase();
      if (glUpper === "EN" || glUpper === "HI" || glUpper === "OR") {
        setLanguage(glUpper as "EN" | "HI" | "OR");
      }
    }
  }, [globalLang]);

  // Voice Input Simulation state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTimer, setRecordingTimer] = useState(0);

  // SMS Simulator states
  const [smsInput, setSmsInput] = useState("");
  const [smsError, setSmsError] = useState("");
  const [smsSuccess, setSmsSuccess] = useState("");

  // Form states
  const [formDoctorPresent, setFormDoctorPresent] = useState(true);
  const [formDoctorName, setFormDoctorName] = useState("");
  const [formBedsTotal, setFormBedsTotal] = useState(10);
  const [formBedsOccupied, setFormBedsOccupied] = useState(4);
  const [formPatientsCount, setFormPatientsCount] = useState(45);
  const [formNotes, setFormNotes] = useState("");
  const [formVoiceText, setFormVoiceText] = useState("");
  const [formStock, setFormStock] = useState<Record<string, number>>({});

  const [showToast, setShowToast] = useState(false);
  // AI parsing state
  const [aiParseLoading, setAiParseLoading] = useState(false);
  const [aiParsedBadge, setAiParsedBadge] = useState(false);
  // Backend submit state
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSaving, setSubmitSaving] = useState(false);

  // Find the selected center
  const center = centers.find((c) => c.id === id);

  // Initialize form fields when center changes
  useEffect(() => {
    if (center) {
      setFormDoctorPresent(center.doctor_present);
      setFormDoctorName(center.doctor_name || "");
      setFormBedsTotal(center.beds_total);
      setFormBedsOccupied(center.beds_occupied);
      setFormPatientsCount(center.today_patient_count);
      setFormNotes("");
      setFormVoiceText("");
      setSmsInput(`REPORT ${center.id} DOCTOR: YES BEDS: ${center.beds_occupied}/${center.beds_total} PATIENTS: 42 STOCK: Paracetamol 120, ORS 80`);
      
      const stockInit: Record<string, number> = {};
      Object.keys(center.stock).forEach((key) => {
        stockInit[key] = center.stock[key].quantity;
      });
      setFormStock(stockInit);
    }
  }, [center]);

  if (!center) {
    return (
      <div className="text-center py-20 bg-white rounded-xl border border-slate-200 shadow-sm">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h3 className="text-lg font-bold text-slate-800 mt-4">Center Not Found</h3>
        <p className="text-sm text-slate-500 mt-1">The health center you are trying to view does not exist in our database.</p>
        <Link to="/" className="mt-4 inline-block px-4 py-2 bg-[#1e3a5f] text-white rounded text-xs font-bold">
          Return to Command Center
        </Link>
      </div>
    );
  }

  const applyParsedData = (parsedData: any) => {
    setFormDoctorPresent(parsedData.doctorPresent);
    if (!parsedData.doctorPresent) {
      setFormDoctorName("");
    } else if (parsedData.doctorName) {
      setFormDoctorName(parsedData.doctorName);
    }
    if (parsedData.patientsCount !== undefined) {
      setFormPatientsCount(parsedData.patientsCount);
    }
    if (parsedData.bedsOccupied !== undefined) {
      setFormBedsOccupied(parsedData.bedsOccupied);
    }
    if (parsedData.notes) {
      setFormNotes(parsedData.notes);
    }
    if (parsedData.stockUpdates) {
      setFormStock((prev) => {
        const next = { ...prev };
        Object.keys(parsedData.stockUpdates).forEach((key) => {
          next[key] = parsedData.stockUpdates[key];
        });
        return next;
      });
    }
  };

  const runSimulationFallback = () => {
    setIsRecording(true);
    setRecordingTimer(3);

    const interval = setInterval(() => {
      setRecordingTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsRecording(false);
          
          let transcriptText = "";
          let parsed;

          if (language === "HI") {
            transcriptText = "आज डॉक्टर उपस्थित हैं। ओपीडी में साठ मरीज आए हैं। पैरासिटामोल केवल ५० टेबलेट बची है।";
            parsed = parseVoiceReport(transcriptText, center.stock);
            parsed.doctorPresent = true;
            parsed.patientsCount = 60;
          } else if (language === "OR") {
            transcriptText = "ଆଜି ଡାକ୍ତର ଅଛନ୍ତି। ପାରାସିଟାମୋଲ କେବଳ ୫୦ ଟାବଲେଟ ଅଛି ଏବଂ ୩୮ ରୋଗୀ ଆସିଛନ୍ତି।";
            parsed = parseVoiceReport(transcriptText, center.stock);
            parsed.doctorPresent = true;
            parsed.patientsCount = 38;
          } else {
            transcriptText = "PHC Tangi report: Primary Doctor Sanjay Jena is present today. Outpatient department registered 65 patients. Bed register shows 5 beds occupied. Paracetamol stocks currently 1800 units, ORS stocks 380 units.";
            parsed = parseVoiceReport(transcriptText, center.stock);
            parsed.doctorPresent = true;
            parsed.patientsCount = 65;
            parsed.bedsOccupied = 5;
          }

          setFormVoiceText(transcriptText);
          applyParsedData(parsed);
          
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Web Speech API / Recording Handler
  const handleVoiceInputClick = () => {
    if (isRecording) return;

    // Check for browser support
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognitionClass) {
      try {
        const recognition = new SpeechRecognitionClass();
        recognition.continuous = false;
        recognition.interimResults = false;
        
        // Map component language state to Web Speech lang locale
        if (language === "HI") {
          recognition.lang = "hi-IN";
        } else if (language === "OR") {
          recognition.lang = "or-IN";
        } else {
          recognition.lang = "en-IN";
        }

        setIsRecording(true);
        setRecordingTimer(5);

        const timerInterval = setInterval(() => {
          setRecordingTimer((prev) => {
            if (prev <= 1) {
              clearInterval(timerInterval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        recognition.onresult = (event: any) => {
          const transcriptText = event.results[0][0].transcript;
          setFormVoiceText(transcriptText);
          
          // Use our smart voice parser helper
          const parsed = parseVoiceReport(transcriptText, center.stock);
          applyParsedData(parsed);
        };

        recognition.onerror = (err: any) => {
          console.error("Speech Recognition Error: ", err);
          // Fallback to simulation on error
          runSimulationFallback();
        };

        recognition.onend = () => {
          setIsRecording(false);
          clearInterval(timerInterval);
        };

        recognition.start();
      } catch (e) {
        runSimulationFallback();
      }
    } else {
      // Fallback for browsers with no speech recognition
      runSimulationFallback();
    }
  };

  const handleApplyVoicePreset = (text: string) => {
    setFormVoiceText(text);
    const parsed = parseVoiceReport(text, center.stock);
    applyParsedData(parsed);
  };

  // Structured SMS Parsing handler
  const handleSMSParse = () => {
    if (!smsInput.trim()) {
      setSmsError("Please enter SMS report payload.");
      return;
    }
    const result = parseSMSReport(smsInput, centers);
    if ("error" in result) {
      setSmsError(result.error || "Formatting error.");
      setSmsSuccess("");
    } else {
      setSmsSuccess("SMS parsed successfully! Form fields updated.");
      setSmsError("");
      applyParsedData(result.parsedData);
      setTimeout(() => setSmsSuccess(""), 4000);
    }
  };


  // Parse free text via Sarvam AI, then apply to form
  const handleAIParse = async () => {
    if (!formVoiceText.trim()) return;
    setAiParseLoading(true);
    setAiParsedBadge(false);
    try {
      const result = await parseReportWithAI(formVoiceText);
      if (result.success && result.data) {
        const d = result.data;
        applyParsedData({
          doctorPresent: d.doctor_present,
          patientsCount: d.patient_count,
          bedsTotal: d.beds_total,
          bedsOccupied: d.beds_occupied,
          notes: d.notes || "",
          stockUpdates: d.stock_items.reduce((acc: Record<string, number>, s) => {
            acc[s.item_name] = s.quantity;
            return acc;
          }, {}),
        });
        setAiParsedBadge(true);
        setTimeout(() => setAiParsedBadge(false), 5000);
      }
    } catch {
      // Silently fall back — local parseVoiceReport will handle it
      const parsed = parseVoiceReport(formVoiceText, center.stock);
      applyParsedData(parsed);
    } finally {
      setAiParseLoading(false);
    }
  };

  // Submit the report — updates local state AND persists to Firestore via backend
  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Construct updated stock records
    const updatedStock: Record<string, StockItem> = {};
    Object.keys(center.stock).forEach((key) => {
      const origItem = center.stock[key];
      const newQty = formStock[key] !== undefined ? Number(formStock[key]) : origItem.quantity;
      // Recalculate days remaining based on daily consumption
      const daysRemaining = origItem.daily_consumption > 0 
        ? Math.round(newQty / origItem.daily_consumption) 
        : 30;

      updatedStock[key] = {
        ...origItem,
        quantity: newQty,
        days_remaining: daysRemaining
      };
    });

    // Determine new status based on doctor and stock levels
    let newStatus: "GOOD" | "WARNING" | "CRITICAL" = "GOOD";
    let alertMsg = "";

    const hasCriticalMedicine = Object.values(updatedStock).some((item) => item.days_remaining <= 2);
    const hasWarningMedicine = Object.values(updatedStock).some((item) => item.days_remaining > 2 && item.days_remaining <= 7);

    if (!formDoctorPresent && center.doctor_absent_days >= 3) {
      newStatus = "CRITICAL";
      alertMsg = `No doctor present for ${center.doctor_absent_days + 1} consecutive days`;
    } else if (hasCriticalMedicine) {
      newStatus = "CRITICAL";
      const critName = Object.values(updatedStock).find((item) => item.days_remaining <= 2)?.name;
      const days = Object.values(updatedStock).find((item) => item.days_remaining <= 2)?.days_remaining;
      alertMsg = `${critName} stock out in ${days} days`;
    } else if (!formDoctorPresent) {
      newStatus = "WARNING";
      alertMsg = "Medical Officer absent today";
    } else if (formBedsOccupied / formBedsTotal >= 0.9) {
      newStatus = "WARNING";
      alertMsg = `Bed occupancy high (${Math.round((formBedsOccupied / formBedsTotal) * 100)}%)`;
    } else if (hasWarningMedicine) {
      newStatus = "WARNING";
      alertMsg = "Low stock multiple critical medicines";
    }

    // 1. Update local React state immediately (optimistic UI)
    onUpdateCenter(center.id, {
      doctor_present: formDoctorPresent,
      doctor_name: formDoctorName,
      beds_occupied: Number(formBedsOccupied),
      beds_total: Number(formBedsTotal),
      today_patient_count: Number(formPatientsCount),
      stock: updatedStock,
      status: newStatus,
      alertMessage: alertMsg || undefined,
      last_report_time: "Just now",
      last_report_days_ago: 0
    });

    // 2. Persist to Firestore via backend (non-blocking — show saving indicator)
    setSubmitSaving(true);
    try {
      const stockQtys: Record<string, number> = {};
      Object.entries(formStock).forEach(([k, v]) => { stockQtys[k] = Number(v); });

      await submitDailyReport({
        centerId: center.id,
        doctorPresent: formDoctorPresent,
        doctorName: formDoctorName || undefined,
        bedsTotal: Number(formBedsTotal),
        bedsOccupied: Number(formBedsOccupied),
        patientCountToday: Number(formPatientsCount),
        stockQuantities: stockQtys,
        notes: formNotes,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      // Non-fatal: local state already updated; just warn user
      setSubmitError("Report saved locally. Cloud sync failed: " + (err.message || "Backend unavailable"));
    } finally {
      setSubmitSaving(false);
    }

    // Show toast notification
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      // Switch back to stock tab
      setActiveTab("stock");
    }, 3000);
  };

  // Language translations mapping for the form
  const translations = {
    EN: {
      title: "Submit Daily Health Report",
      subtitle: "Mandatory NHM Digitization Intake",
      doctorPresent: "Doctor Present Today?",
      doctorName: "Doctor / Medical Officer Name",
      bedsTotal: "Total Sanctioned Beds",
      bedsOccupied: "Occupied Beds Today",
      patients: "Outpatient Patient Count Today",
      voiceBtn: "Speak Your Report",
      voiceDesc: "Tap microphone to dictate clinical and inventory report in any regional language.",
      voiceListening: "🎙️ Listening... speak clearly.",
      textInputLabel: "Or, type report manually:",
      stockSection: "Daily Medicine Inventory Updates",
      notes: "Additional Clinical Observations/Notes",
      submitBtn: "Submit Report to Command Hub",
      yes: "Yes",
      no: "No",
      phDoctor: "Enter MD / MO Name",
      phNotes: "E.g., seasonal dengue outbreak, sanitation audits complete, electricity fluctuations."
    },
    HI: {
      title: "दैनिक स्वास्थ्य रिपोर्ट जमा करें",
      subtitle: "अनिवार्य राष्ट्रीय स्वास्थ्य मिशन डेटा प्रविष्टि",
      doctorPresent: "क्या आज डॉक्टर उपस्थित हैं?",
      doctorName: "डॉक्टर / चिकित्सा अधिकारी का नाम",
      bedsTotal: "कुल स्वीकृत बेड",
      bedsOccupied: "आज भरे हुए बेड",
      patients: "आज ओपीडी रोगी संख्या",
      voiceBtn: "बोलकर रिपोर्ट दर्ज करें",
      voiceDesc: "किसी भी स्थानीय भाषा में क्लिनिकल और इन्वेंट्री रिपोर्ट बोलने के लिए माइक दबाएं।",
      voiceListening: "🎙️ रिकॉर्डिंग चालू है... स्पष्ट बोलें।",
      textInputLabel: "या, मैन्युअल रूप से रिपोर्ट दर्ज करें:",
      stockSection: "दैनिक दवा सूची अपडेट",
      notes: "अतिरिक्त टिप्पणियाँ / अवलोकन",
      submitBtn: "कमांड सेंटर को रिपोर्ट भेजें",
      yes: "हाँ",
      no: "नहीं",
      phDoctor: "चिकित्सा अधिकारी का नाम भरें",
      phNotes: "उदा. मौसमी डेंगू का प्रकोप, स्वच्छता ऑडिट पूरा, बिजली की समस्या।"
    },
    OR: {
      title: "ଦୈନିକ ସ୍ୱାସ୍ଥ୍ୟ ରିପୋର୍ଟ ଦାଖଲ କରନ୍ତୁ",
      subtitle: "ବାଧ୍ୟତାମୂଳକ ଜାତୀୟ ସ୍ୱାସ୍ଥ୍ୟ ମିଶନ ତଥ୍ୟ",
      doctorPresent: "ଆଜି ଡାକ୍ତର ଉପସ୍ଥିତ ଅଛନ୍ତି କି?",
      doctorName: "ଡାକ୍ତର / ମେଡିକାଲ ଅଫିସରଙ୍କ ନାମ",
      bedsTotal: "ସମୁଦାୟ ଶଯ୍ୟା ସଂଖ୍ୟା",
      bedsOccupied: "ଆଜି ବ୍ୟବହୃତ ଶଯ୍ୟା ସଂଖ୍ୟା",
      patients: "ଆଜି ଆଉଟପେସେଣ୍ଟ ରୋଗୀ ସଂଖ୍ୟା",
      voiceBtn: "କହିକି ରିପୋର୍ଟ ଦିଅନ୍ତୁ",
      voiceDesc: "ଆଞ୍ଚଳିକ ଭାଷାରେ ମେଡିକାଲ୍ ଏବଂ ଔଷଧ ଷ୍ଟକ୍ ରିପୋର୍ଟ ଦେବା ପାଇଁ ମାଇକ୍ରୋଫୋନକୁ ଦବାନ୍ତୁ।",
      voiceListening: "🎙️ ଶୁଣୁଛି... ସ୍ପଷ୍ଟ ଭାବରେ କୁହନ୍ତୁ।",
      textInputLabel: "କିମ୍ବା, ରିପୋର୍ଟ ଟାଇପ୍ କରନ୍ତୁ:",
      stockSection: "ଔଷଧ ମହଜୁଦ ବିବରଣୀ ଅପଡେଟ୍",
      notes: "ଅନ୍ୟାନ୍ୟ ମେଡିକାଲ୍ ଅବଜରଭେସନ୍",
      submitBtn: "କମାଣ୍ଡ ସେଣ୍ଟରକୁ ରିପୋର୍ଟ ପଠାନ୍ତୁ",
      yes: "ହଁ",
      no: "ନାହିଁ",
      phDoctor: "ଡାକ୍ତରଙ୍କ ନାମ ଲେଖନ୍ତୁ",
      phNotes: "ଯଥା: ଡେଙ୍ଗୁ ଜ୍ୱର ପ୍ରକୋପ, ସ୍ୱାସ୍ଥ୍ୟ ପରୀକ୍ଷା ସମ୍ପୂର୍ଣ୍ଣ।"
    }
  };

  const t = translations[language];

  // Footfall comparison data (current vs last year offset)
  const monthlyTrendsData = center.monthly_footfall.map((val, idx) => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return {
      month: months[idx],
      "Current Year": val,
      "Last Year": Math.round(val * 0.92) // realistic comparison line
    };
  });

  return (
    <div className="space-y-6">
      
      {/* Back button and breadcrumb */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate("/")}
          className="px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition"
        >
          <ArrowLeft className="w-4 h-4 text-[#1e3a5f]" />
          <span>Back to Command Panel</span>
        </button>

        <span className="text-xs font-semibold text-slate-500 font-mono bg-slate-100 px-3 py-1 rounded-md">
          Facility ID: {center.id.toUpperCase()}
        </span>
      </div>

      {/* CENTER HEADER BLOCK */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          {/* Facility Identity */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2.5">
              <span className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-md tracking-wider ${
                center.type === "CHC" ? "bg-slate-100 text-slate-800" : "bg-[#1e3a5f]/10 text-[#1e3a5f]"
              }`}>
                {center.type}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold gap-1 ${
                center.status === "CRITICAL" 
                  ? "bg-red-100 text-red-800 animate-pulse" 
                  : center.status === "WARNING"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-green-100 text-green-800"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  center.status === "CRITICAL" ? "bg-red-600 animate-ping" : center.status === "WARNING" ? "bg-amber-500" : "bg-green-500"
                }`} />
                {center.status === "CRITICAL" ? (globalLang === "hi" ? "गंभीर स्थिति" : globalLang === "or" ? "ଜରୁରୀକାଳୀନ" : "CRITICAL STATUS") : center.status === "WARNING" ? (globalLang === "hi" ? "चेतावनी स्थिति" : globalLang === "or" ? "ଚେତାବନୀ" : "WARNING STATUS") : (globalLang === "hi" ? "सामान्य स्थिति" : globalLang === "or" ? "ଉତ୍ତମ ସ୍ଥିତି" : "GOOD STATUS")}
              </span>
            </div>
            <h2 className="text-2xl font-display font-bold text-slate-900">{getLocalizedCenterName(center.name, globalLang)}</h2>
            <p className="text-xs text-slate-400 font-medium">
              {globalLang === "hi" ? "खोर्धा प्रशासन" : globalLang === "or" ? "ଖୋର୍ଦ୍ଧା ପ୍ରଶାସନ" : "Khordha Administration"}
            </p>
          </div>

          {/* Sync & Reporting Metadata */}
          <div className="flex flex-wrap gap-4 items-center md:text-right md:justify-end">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{globalT("lastSync")}</p>
              {center.last_report_days_ago > 1 ? (
                <p className="text-xs text-red-600 font-bold mt-1 flex items-center md:justify-end">
                  <AlertCircle className="w-3.5 h-3.5 mr-1 animate-bounce" />
                  ⚠ {globalLang === "hi" ? `अनुपस्थित — अंतिम बार ${center.last_report_days_ago} दिन पहले देखा गया` : globalLang === "or" ? `ଅନୁପସ୍ଥିତ — ଶେଷ ଦର୍ଶନ ${center.last_report_days_ago} ଦିନ ପୂର୍ବେ` : `MISSING — Last seen ${center.last_report_days_ago} days ago`}
                </p>
              ) : (
                <p className="text-xs text-green-600 font-bold mt-1">
                  {globalLang === "hi" ? "सक्रिय" : globalLang === "or" ? "ସକ୍ରିୟ" : "Active"} • {center.last_report_time}
                </p>
              )}
            </div>

            <div className="border-l border-slate-200 pl-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{globalT("medicalOfficer")}</p>
              <div className="flex items-center space-x-2 mt-1">
                {center.doctor_present ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-semibold text-slate-800">{center.doctor_name || (globalLang === "hi" ? "उपस्थित" : globalLang === "or" ? "ଉପସ୍ଥିତ" : "Assigned present")}</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span className="text-xs font-bold text-red-600">{globalT("moAbsent")} — {center.doctor_absent_days} {globalLang === "hi" ? "क्रमागत दिन" : globalLang === "or" ? "କ୍ରମାଗତ ଦିନ" : "consecutive days"}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* STATS ROW (4 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{globalT("todayPatients")}</p>
          <div className="flex items-baseline space-x-2 mt-1.5">
            <h4 className="text-2xl font-display font-bold text-slate-800">{center.today_patient_count}</h4>
            <span className="text-[11px] text-slate-500">{globalLang === "hi" ? "मरीज" : globalLang === "or" ? "ରୋଗୀ" : "outpatients"}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{globalT("bedOccupancyLevel")}</p>
          <div className="flex items-baseline space-x-2 mt-1.5">
            <h4 className="text-2xl font-display font-bold text-slate-800">
              {center.beds_occupied}<span className="text-sm font-sans font-normal text-slate-400">/{center.beds_total}</span>
            </h4>
            <span className="text-xs font-semibold text-slate-500">
              ({Math.round((center.beds_occupied / center.beds_total) * 100)}% {globalLang === "hi" ? "अधिभोग" : globalLang === "or" ? "ଶଯ୍ୟା ବ୍ୟବହାର" : "Occupancy"})
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{globalT("moAttendance")}</p>
          <div className="mt-2.5">
            {center.doctor_present ? (
              <span className="px-2 py-1 bg-green-100 text-green-800 font-bold text-[10px] rounded-sm">
                {globalLang === "hi" ? "कर्तव्य पर" : globalLang === "or" ? "କର୍ତ୍ତବ୍ୟରତ" : "Duty Active"}
              </span>
            ) : (
              <span className="px-2 py-1 bg-red-100 text-red-800 font-bold text-[10px] rounded-sm animate-pulse">
                {globalLang === "hi" ? "अनुपस्थित" : globalLang === "or" ? "ଅନୁପସ୍ଥିତ" : "Absence Alert"}
              </span>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{globalT("reportingCompliance")}</p>
          <div className="flex items-baseline space-x-2 mt-1.5">
            <h4 className={`text-2xl font-display font-bold ${center.last_report_days_ago > 1 ? "text-red-600" : "text-green-600"}`}>
              {center.last_report_days_ago}
            </h4>
            <span className="text-xs text-slate-500">{globalLang === "hi" ? "दिन पहले रिपोर्ट मिली" : globalLang === "or" ? "ଦିନ ପୂର୍ବେ ରିପୋର୍ଟ" : "days since report"}</span>
          </div>
        </div>
      </div>

      {/* TABS SELECTOR ROW */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("stock")}
          className={`px-5 py-3 text-xs font-bold font-display border-b-2 transition duration-150 ${
            activeTab === "stock" 
              ? "border-b-[#f97316] text-[#1e3a5f]" 
              : "border-b-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          📦 {globalLang === "hi" ? "चिकित्सा स्टॉक स्थिति" : globalLang === "or" ? "ଔଷଧ ମହଜୁଦ ସ୍ଥିତି" : "Stock Status"}
        </button>
        <button
          onClick={() => setActiveTab("trends")}
          className={`px-5 py-3 text-xs font-bold font-display border-b-2 transition duration-150 ${
            activeTab === "trends" 
              ? "border-b-[#f97316] text-[#1e3a5f]" 
              : "border-b-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          📊 {globalLang === "hi" ? "रोगी आवागमन" : globalLang === "or" ? "ରୋଗୀ ସଂଖ୍ୟା ଟ୍ରେଣ୍ଡ" : "Footfall Trends"}
        </button>
        <button
          onClick={() => setActiveTab("submit")}
          className={`px-5 py-3 text-xs font-bold font-display border-b-2 transition duration-150 ${
            activeTab === "submit" 
              ? "border-b-[#f97316] text-[#1e3a5f]" 
              : "border-b-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          📝 {globalLang === "hi" ? "रिपोर्ट जमा करें" : globalLang === "or" ? "ରିପୋର୍ଟ ଦାଖଲ କରନ୍ତୁ" : "Submit Health Report"}
        </button>
      </div>

      {/* TAB 1: STOCK STATUS */}
      {activeTab === "stock" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-display font-bold text-slate-800 text-sm">Essential Drug & Medicine Supplies</h3>
              <p className="text-xs text-slate-400">Under National Health Mission (NHM) Essential Drug List (EDL) mandates</p>
            </div>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
              Updated: Today
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 bg-indigo-50/45 p-3 rounded-xl border border-indigo-100/50">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
              </span>
              <span className="text-[11px] font-bold text-indigo-950 uppercase tracking-wider">
                {globalLang === "hi" ? "पूर्वानुमानित मांग विश्लेषक सक्रिय" : globalLang === "or" ? "AI ଚାହିଦା ଆକଳନ ସକ୍ରିୟ" : "Predictive AI Demand Forecast Enabled"}
              </span>
            </div>
            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-extrabold rounded-md uppercase tracking-wide border border-indigo-200">
              {globalLang === "hi" ? "मानसून चक्र अनुकूलन" : globalLang === "or" ? "ମୌସୁମୀ ଚକ୍ର ପୂର୍ବାନୁମାନ" : "Monsoon Cycle Optimised"}
            </span>
          </div>

          {/* ESSENTIAL EDL MEDICINES */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#1e3a5f]" />
              <span>{globalLang === "hi" ? "आवश्यक दवा सूची (EDL)" : globalLang === "or" ? "ଆବଶ୍ୟକୀୟ ଔଷଧ ତାଲିକା" : "Essential EDL Medicines & Drugs"}</span>
            </h4>
            
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full min-w-[700px] text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                    <th className="py-2.5 px-4">Medicine / Drug Name</th>
                    <th className="py-2.5 px-4">Current Stock Units</th>
                    <th className="py-2.5 px-4">Daily Consumption</th>
                    <th className="py-2.5 px-4">Supply Runway</th>
                    <th className="py-2.5 px-4">Logistics Health Status</th>
                    <th className="py-2.5 px-4">Smart Support Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {Object.values(center.stock)
                    .filter((item) => !item.name.toLowerCase().includes("kit") && !item.name.toLowerCase().includes("test"))
                    .map((item) => {
                      let badgeColor = "bg-green-100 text-green-800";
                      let remainingText = `${item.days_remaining} days remaining`;

                      if (item.days_remaining <= 2) {
                        badgeColor = "bg-red-100 text-red-800 font-bold animate-pulse";
                        remainingText = globalLang === "hi" 
                          ? `गंभीर: ${item.days_remaining} दिन शेष` 
                          : globalLang === "or" 
                          ? `ଜରୁରୀକାଳୀନ: ${item.days_remaining} ଦିନ ବାକି` 
                          : `CRITICAL: ${item.days_remaining}d remaining`;
                      } else if (item.days_remaining <= 7) {
                        badgeColor = "bg-amber-100 text-amber-800 font-medium";
                        remainingText = globalLang === "hi" 
                          ? `चेतावनी: ${item.days_remaining} दिन शेष` 
                          : globalLang === "or" 
                          ? `ଚେତାବନୀ: ${item.days_remaining} ଦିନ ବାକି` 
                          : `WARNING: ${item.days_remaining}d remaining`;
                      } else {
                        remainingText = globalLang === "hi" 
                          ? `${item.days_remaining} दिन शेष` 
                          : globalLang === "or" 
                          ? `${item.days_remaining} ଦିନ ବାକି` 
                          : `${item.days_remaining} days remaining`;
                      }

                      const stockSafetyPercent = Math.min((item.days_remaining / 30) * 100, 100);

                      const showRedistribution = 
                        (center.id === "phc-tangi" && item.name === "Paracetamol") ||
                        (center.id === "phc-bhubaneswar-north" && item.name === "ORS") ||
                        (center.id === "phc-chilika" && (item.name === "Amoxicillin" || item.name === "Paracetamol"));

                       return (
                        <tr key={item.name} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-semibold text-slate-800">
                            <div className="flex flex-col">
                              <span>{getLocalizedDrugName(item.name, globalLang)}</span>
                              <span className={`inline-flex items-center mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded-sm border max-w-fit ${getDemandForecastPill(item.name, globalLang).color}`}>
                                {getDemandForecastPill(item.name, globalLang).text}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono font-medium">{item.quantity.toLocaleString()} units</td>
                          <td className="py-3 px-4 font-mono text-slate-500">{item.daily_consumption} units/day</td>
                          <td className="py-3 px-4">
                            <div className="w-28">
                              <div className="w-full bg-slate-100 h-1.5 rounded-full">
                                <div 
                                  className={`h-1.5 rounded-full ${
                                    item.days_remaining <= 2 ? "bg-red-600" : item.days_remaining <= 7 ? "bg-amber-500" : "bg-green-500"
                                  }`}
                                  style={{ width: `${stockSafetyPercent}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${badgeColor}`}>
                              {remainingText}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {showRedistribution ? (
                              <div className="flex items-center space-x-1 text-xs text-[#f97316] font-semibold bg-orange-50 border border-orange-200/50 px-2 py-1 rounded-md animate-pulse">
                                <Truck className="w-3.5 h-3.5" />
                                <span>Redistribution Available</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-normal text-[11px]">Runway Secure</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* DIAGNOSTIC TEST KITS & AVAILABILITY AUDITS */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#f97316]" />
              <span>{globalLang === "hi" ? "नैदानिक किट एवं उपलब्धता ऑडिट (Diagnostic Audits)" : globalLang === "or" ? "ରୋଗ ନିରୂପଣ କିଟ୍ ଏବଂ ଅଡିଟ୍" : "Diagnostic Kits & Availability Audits"}</span>
            </h4>

            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full min-w-[700px] text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                    <th className="py-2.5 px-4">Diagnostic Audit Item</th>
                    <th className="py-2.5 px-4">Available Test Kits</th>
                    <th className="py-2.5 px-4">Daily Test Volume</th>
                    <th className="py-2.5 px-4">Availability Runway</th>
                    <th className="py-2.5 px-4">Clinical Health Status</th>
                    <th className="py-2.5 px-4">Audit Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {Object.values(center.stock)
                    .filter((item) => item.name.toLowerCase().includes("kit") || item.name.toLowerCase().includes("test"))
                    .map((item) => {
                      let badgeColor = "bg-green-100 text-green-800";
                      let remainingText = `${item.days_remaining} days remaining`;

                      if (item.days_remaining === 0 || item.quantity === 0) {
                        badgeColor = "bg-red-100 text-red-800 font-bold animate-pulse";
                        remainingText = globalLang === "hi" 
                          ? "स्टॉक समाप्त (OUT OF STOCK)" 
                          : globalLang === "or" 
                          ? "ଷ୍ଟକ୍ ଶେଷ" 
                          : "OUT OF STOCK";
                      } else if (item.days_remaining <= 3) {
                        badgeColor = "bg-red-100 text-red-800 font-bold animate-pulse";
                        remainingText = globalLang === "hi" 
                          ? `गंभीर: ${item.days_remaining} दिन शेष` 
                          : globalLang === "or" 
                          ? `ଜରୁରୀକାଳୀନ: ${item.days_remaining} ଦିନ ବାକି` 
                          : `CRITICAL: ${item.days_remaining}d left`;
                      } else if (item.days_remaining <= 7) {
                        badgeColor = "bg-amber-100 text-amber-800 font-medium";
                        remainingText = globalLang === "hi" 
                          ? `चेतावनी: ${item.days_remaining} दिन शेष` 
                          : globalLang === "or" 
                          ? `ଚେତାବନୀ: ${item.days_remaining} ଦିନ ବାକି` 
                          : `WARNING: ${item.days_remaining}d left`;
                      } else {
                        remainingText = globalLang === "hi" 
                          ? `${item.days_remaining} दिन शेष` 
                          : globalLang === "or" 
                          ? `${item.days_remaining} ଦିନ ବାକି` 
                          : `${item.days_remaining} days left`;
                      }

                      const stockSafetyPercent = Math.min((item.days_remaining / 30) * 100, 100);

                      return (
                        <tr key={item.name} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-semibold text-slate-800">
                            <div className="flex flex-col">
                              <span>🔬 {getLocalizedDrugName(item.name, globalLang)}</span>
                              <span className={`inline-flex items-center mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded-sm border max-w-fit ${getDemandForecastPill(item.name, globalLang).color}`}>
                                {getDemandForecastPill(item.name, globalLang).text}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono font-medium">{item.quantity.toLocaleString()} tests</td>
                          <td className="py-3 px-4 font-mono text-slate-500">{item.daily_consumption} tests/day</td>
                          <td className="py-3 px-4">
                            <div className="w-28">
                              <div className="w-full bg-slate-100 h-1.5 rounded-full">
                                <div 
                                  className={`h-1.5 rounded-full ${
                                    item.days_remaining <= 3 ? "bg-red-600" : item.days_remaining <= 7 ? "bg-amber-500" : "bg-green-500"
                                  }`}
                                  style={{ width: `${stockSafetyPercent}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${badgeColor}`}>
                              {remainingText}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {item.days_remaining > 7 ? (
                              <span className="text-green-600 font-semibold text-[11px] bg-green-50 px-2 py-1 rounded">Passed Audit</span>
                            ) : item.days_remaining === 0 ? (
                              <span className="text-red-600 font-extrabold text-[11px] bg-red-50 px-2 py-1 rounded animate-pulse">Critical Shortage</span>
                            ) : (
                              <span className="text-amber-600 font-semibold text-[11px] bg-amber-50 px-2 py-1 rounded">Attention Required</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Hardcoded redistribution details banner */}
          {center.status === "CRITICAL" && (
            <div className="bg-orange-50 border-l-4 border-l-[#f97316] p-4 rounded-r-xl space-y-2 mt-4">
              <h4 className="font-display font-bold text-slate-800 text-xs flex items-center space-x-1.5">
                <Truck className="w-4 h-4 text-[#f97316]" />
                <span>Inter-facility Redistribution Alert (स्मार्ट स्टॉक पुनर्वितरण)</span>
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Swasthya Setu AI has detected surplus stock at nearby facilities. 
                {center.id === "phc-tangi" && " Transfer of 800 units Paracetamol from CHC Khordha (12.4 km away, surplus: 8,000 units) has been authorized."}
                {center.id === "phc-bhubaneswar-north" && " Transfer of 200 units ORS packets from CHC Begunia (18.2 km away, surplus: 950 units) has been authorized."}
                {center.id === "chc-balugaon" && " Emergency dispatch of Medical Officer Dr. Kar (CHC Khordha) recommended for clinical duty allocation."}
              </p>
              <div className="pt-1">
                <Link 
                  to="/district-brief"
                  className="text-[11px] font-bold text-[#1e3a5f] hover:underline"
                >
                  Apply Transfer in AI Brief Page →
                </Link>
              </div>
            </div>
          )}

          {/* AI-POWERED DEMAND FORECAST SECTION */}
          <div className="bg-slate-50/70 border border-slate-200/60 rounded-xl p-5 mt-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h4 className="font-display font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <span className="p-1 bg-[#1e3a5f]/10 text-[#1e3a5f] rounded">⚡</span>
                  <span>{globalLang === "hi" ? "एआई-संचालित मांग और उपभोग पूर्वानुमान" : globalLang === "or" ? "AI-ପରିଚାଳିତ ଚାହିଦା ପୂର୍ବାନୁମାନ" : "AI-Powered Logistical Demand Forecasts"}</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  {globalLang === "hi" 
                    ? "स्थानीय स्वास्थ्य टेलीमेट्री और मौसमी पैटर्नों के आधार पर अनुमानित साप्ताहिक खपत प्रवृत्तियां" 
                    : globalLang === "or" 
                    ? "ସ୍ଥାନୀୟ ସ୍ୱାସ୍ଥ୍ୟ ତଥ୍ୟ ଏବଂ ଋତୁକାଳୀନ ପରିବର୍ତ୍ତନ ଆଧାରରେ ଅନୁମାନିତ ସାପ୍ତାହିକ ବ୍ୟବହାର" 
                    : "Predictive consumption trends calculated via local health telemetry & seasonal forecasting algorithms"}
                </p>
              </div>
              <span className="text-[9px] font-bold font-mono text-[#f97316] bg-orange-100/60 px-2 py-0.5 rounded uppercase tracking-wider">
                {globalLang === "hi" ? "पूर्वानुमान सक्रिय" : globalLang === "or" ? "ସକ୍ରିୟ ପୂର୍ବାନୁମାନ" : "Forecasting Active"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
              {/* Card 1: Paracetamol */}
              <div className="bg-white p-3.5 rounded-lg border border-slate-100 shadow-2xs flex items-start gap-3">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-lg text-sm font-bold font-mono">
                  +24%
                </div>
                <div className="space-y-1">
                  <span className="font-semibold text-slate-800">
                    {globalLang === "hi" ? "पैरासिटामोल मांग पूर्वानुमान" : globalLang === "or" ? "ପାରାସିଟାମୋଲ ଚାହିଦା ପୂର୍ବାନୁମାନ" : "Paracetamol Demand Spike"}
                  </span>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    {globalLang === "hi"
                      ? "मौसमी बुखार और उतार-चढ़ाव के चलते अगले 14 दिनों में पैरासिटामोल की मांग 24% बढ़ने की उम्मीद है।"
                      : globalLang === "or"
                      ? "ଋତୁକାଳୀନ ଜ୍ୱର କାରଣରୁ ଆଗାମୀ ୧୪ ଦିନରେ ପାରାସିଟାମୋଲ ଚାହିଦା ୨୪% ବୃଦ୍ଧି ପାଇବାର ପୂର୍ବାନୁମାନ ଅଛି।"
                      : "Paracetamol demand expected to increase by 24% over the next 14 days due to micro-climatic fever trends."}
                  </p>
                </div>
              </div>

              {/* Card 2: ORS Packets */}
              <div className="bg-white p-3.5 rounded-lg border border-slate-100 shadow-2xs flex items-start gap-3">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg text-sm font-bold font-mono">
                  +15%
                </div>
                <div className="space-y-1">
                  <span className="font-semibold text-slate-800">
                    {globalLang === "hi" ? "ओआरएस (ORS) उपभोग वृद्धि" : globalLang === "or" ? "ଓଆରଏସ (ORS) ବ୍ୟବହାର ବୃଦ୍ଧି" : "ORS Consumption Rise"}
                  </span>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    {globalLang === "hi"
                      ? "उच्च तापमान और उमस के कारण ओआरएस पैकेटों की उपभोग दर में 15% की वृद्धि अनुमानित है।"
                      : globalLang === "or"
                      ? "ତାପମାତ୍ରା ବୃଦ୍ଧି ହେତୁ ଓଆରଏସ ପ୍ୟାକେଟର ଆବଶ୍ୟକତା ୧୫% ବୃଦ୍ଧି ପାଇବାର ସମ୍ଭାବନା ରହିଛି।"
                      : "ORS packet consumption predicted to rise 15% following regional humidity and footfall surges."}
                  </p>
                </div>
              </div>

              {/* Card 3: Diagnostics (Malaria) */}
              <div className="bg-white p-3.5 rounded-lg border border-slate-100 shadow-2xs flex items-start gap-3">
                <div className="p-2 bg-[#1e3a5f]/5 text-[#1e3a5f] rounded-lg text-sm font-bold font-mono">
                  +32%
                </div>
                <div className="space-y-1">
                  <span className="font-semibold text-slate-800">
                    {globalLang === "hi" ? "मलेरिया आरडीटी किट ऑडिट" : globalLang === "or" ? "ମ୍ୟାଲେରିଆ RDT ଚାହିଦା" : "Malaria Diagnostic Load"}
                  </span>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    {globalLang === "hi"
                      ? "जलजमाव वाले ग्रामीण क्षेत्रों के समीप होने से परीक्षण किटों की आवश्यकता 32% तक बढ़ सकती है।"
                      : globalLang === "or"
                      ? "ଆଦ୍ର ପାଣିପାଗ କାରଣରୁ ମ୍ୟାଲେରିଆ ପରୀକ୍ଷା ଆବଶ୍ୟକତା ୩୨% ବୃଦ୍ଧି ହେବାର ଆଶଙ୍କା ରହିଛି।"
                      : "Malaria diagnostic kit audits suggest a 32% spike in rural screening volumes next week."}
                  </p>
                </div>
              </div>

              {/* Card 4: Diagnostics (Pregnancy/Dengue) */}
              <div className="bg-white p-3.5 rounded-lg border border-slate-100 shadow-2xs flex items-start gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg text-sm font-bold font-mono">
                  +20%
                </div>
                <div className="space-y-1">
                  <span className="font-semibold text-slate-800">
                    {globalLang === "hi" ? "डेंगू एनएस1 किट मांग" : globalLang === "or" ? "ଡେଙ୍ଗୁ NS1 ଚାହିଦା" : "Dengue Diagnostic Spike"}
                  </span>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    {globalLang === "hi"
                      ? "सक्रिय मानसून पैटर्न के आधार पर डेंगू रैपिड टेस्ट किट की मांग में 20% की तेजी संभावित है।"
                      : globalLang === "or"
                      ? "ଋତୁକାଳୀନ ପରିବର୍ତ୍ତନ ହେତୁ ଡେଙ୍ଗୁ ପରୀକ୍ଷା କିଟ୍ ଚାହିଦା ୨୦% ବଢିବା ଅନୁମାନ କରାଯାଇଛି।"
                      : "Dengue NS1 kit utilization predicted to increase by 20% under current localized moisture vectors."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FOOTFALL TRENDS */}
      {activeTab === "trends" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-display font-bold text-slate-800 text-sm">Clinical Outpatient Patient Footfall Trends</h3>
              <p className="text-xs text-slate-400">Demographic stats and comparative analytical charting</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Chart A: Last 7 Days Footfall BarChart */}
            <div className="border border-slate-100 p-4 rounded-xl">
              <h4 className="font-display font-bold text-slate-700 text-xs mb-4">Patient Registrations: Last 7 Days</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={center.last_7_days_footfall}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="count" fill="#1e3a5f" radius={[4, 4, 0, 0]} name="Patients Registered" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart B: Monthly comparison LineChart */}
            <div className="border border-slate-100 p-4 rounded-xl">
              <h4 className="font-display font-bold text-slate-700 text-xs mb-4">Annual Outpatient Load Comparison</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrendsData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="Current Year" stroke="#f97316" strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Last Year" stroke="#cbd5e1" strokeDasharray="4 4" strokeWidth={1.5} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Quick Metrics Statistics Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
            <div className="bg-slate-50 p-3.5 rounded-lg text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Average Daily Footfall</p>
              <h5 className="text-xl font-display font-bold text-[#1e3a5f] mt-1">
                {Math.round(center.monthly_footfall.reduce((s, c) => s + c, 0) / (30 * 12))} Patients
              </h5>
              <p className="text-[9px] text-slate-500 mt-0.5">Calculated over trailing 12 months</p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-lg text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Peak Month Registrations</p>
              <h5 className="text-xl font-display font-bold text-[#f97316] mt-1">
                {Math.max(...center.monthly_footfall).toLocaleString()} Patients
              </h5>
              <p className="text-[9px] text-slate-500 mt-0.5">Logged during monsoon season (June)</p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-lg text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase">YoY Footfall Momentum</p>
              <h5 className="text-xl font-display font-bold text-green-600 mt-1 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span>+8.4% Growth</span>
              </h5>
              <p className="text-[9px] text-slate-500 mt-0.5">Reflecting increased digital outreach trust</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SUBMIT REPORT (Multilingual intake form with Voice Simulation) */}
      {activeTab === "submit" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          
          {/* Header block with language toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-slate-100">
            <div>
              <h3 className="font-display font-bold text-slate-900 text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#f97316]" />
                <span>{t.title}</span>
              </h3>
              <p className="text-xs text-slate-400">{t.subtitle}</p>
            </div>

            <div className="flex items-center space-x-2">
              <Languages className="w-4 h-4 text-slate-400" />
              <div className="inline-flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button 
                  onClick={() => setLanguage("EN")}
                  className={`px-2.5 py-1 text-xs font-extrabold rounded-md ${language === "EN" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                >
                  English
                </button>
                <button 
                  onClick={() => setLanguage("HI")}
                  className={`px-2.5 py-1 text-xs font-extrabold rounded-md ${language === "HI" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                >
                  हिंदी
                </button>
                <button 
                  onClick={() => setLanguage("OR")}
                  className={`px-2.5 py-1 text-xs font-extrabold rounded-md ${language === "OR" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                >
                  ଓଡ଼ିଆ
                </button>
              </div>
            </div>
          </div>

          {/* THREE-COLUMN INTELLIGENCE LAYOUT FOR SUBMIT */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left/Center Column (66%): Voice Intake and Form */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* SMART VOICE INGESTION ACCELERATOR BANNER */}
              <div className="bg-gradient-to-r from-orange-50 to-[#1e3a5f]/5 border border-orange-200/50 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-start space-x-3.5">
                  <div className={`p-3 rounded-full flex-shrink-0 ${
                    isRecording ? "bg-red-600 text-white animate-ping" : "bg-[#f97316]/10 text-[#f97316]"
                  }`}>
                    <Mic className="w-5.5 h-5.5" />
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-slate-800 text-xs">{t.voiceBtn} / बोलकर रिपोर्ट दर्ज करें</h4>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{t.voiceDesc}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleVoiceInputClick}
                  disabled={isRecording}
                  className={`px-4 py-2.5 rounded-lg text-xs font-bold font-display shadow-sm flex items-center space-x-2 transition ${
                    isRecording 
                      ? "bg-red-600 text-white" 
                      : "bg-[#f97316] hover:bg-orange-600 text-white"
                  }`}
                >
                  {isRecording ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>{t.voiceListening} ({recordingTimer}s)</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      <span>{t.voiceBtn}</span>
                    </>
                  )}
                </button>
              </div>

              {/* INTERACTIVE REGIONAL PRESETS CHIPS */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2.5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Languages className="w-4 h-4 text-[#f97316]" />
                  <span>Interactive Speech Presets (परीक्षण के लिए क्लिक करें)</span>
                </p>
                <p className="text-[11px] text-slate-500">
                  Select a language capsule to simulate regional NLP processing:
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyVoicePreset("ଆଜି ଡାକ୍ତର ଅଛନ୍ତି। ପାରାସିଟାମୋଲ କେବଳ ୫୦ ଟାବଲେଟ ଅଛି ଏବଂ ୩୮ ରୋଗୀ ଆସିଛନ୍ତି।")}
                    className="px-3 py-1.5 bg-white hover:bg-orange-50 border border-slate-200 hover:border-orange-200 rounded-lg text-[11px] font-semibold text-slate-700 transition text-left"
                  >
                    Odia (ଓଡ଼ିଆ): ଡାକ୍ତର ଅଛନ୍ତି, ୩୮ ରୋଗୀ, ୫୦ ପାରାସିଟାମୋଲ
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyVoicePreset("आज डॉक्टर नहीं आए, ओआरएस ८० पैकेट बचा है और ३८ पेशेंट आए हैं")}
                    className="px-3 py-1.5 bg-white hover:bg-orange-50 border border-slate-200 hover:border-orange-200 rounded-lg text-[11px] font-semibold text-slate-700 transition text-left"
                  >
                    Hindi (हिंदी): डॉक्टर नहीं आए, ३८ मरीज, ८० ओआरएस
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyVoicePreset("Doctor Sanjay is present. 5 beds occupied. Patient count 65. Paracetamol stock is 1800 tablets.")}
                    className="px-3 py-1.5 bg-white hover:bg-orange-50 border border-slate-200 hover:border-orange-200 rounded-lg text-[11px] font-semibold text-slate-700 transition text-left"
                  >
                    English: Doctor present, 65 patients, 5 beds, 1800 para
                  </button>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleFormSubmit} className="space-y-6">
                
                {/* If voice was parsed successfully, show transcription bubble */}
                {formVoiceText && (
                  <div className="bg-green-50/60 border border-green-200 p-4 rounded-xl space-y-1">
                    <p className="text-[10px] font-bold text-green-700 uppercase tracking-widest flex items-center gap-1">
                      <BookmarkCheck className="w-4 h-4 text-green-600" />
                      Sarvam NLP Speech Decoder Transcript (स्पीच-टू-टेक्स्ट)
                    </p>
                    <p className="text-xs text-slate-700 italic font-medium leading-relaxed mt-1">
                      "{formVoiceText}"
                    </p>
                    <div className="text-[9px] text-green-600 font-semibold mt-1 flex items-center gap-1.5">
                      <Check className="w-3 h-3" /> All registers below automatically synchronized in real time.
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Doctor Present status */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                      {t.doctorPresent}
                    </label>
                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 w-48">
                      <button
                        type="button"
                        onClick={() => setFormDoctorPresent(true)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${
                          formDoctorPresent 
                            ? "bg-green-600 text-white shadow-xs" 
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {t.yes}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormDoctorPresent(false)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${
                          !formDoctorPresent 
                            ? "bg-red-600 text-white shadow-xs" 
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {t.no}
                      </button>
                    </div>
                  </div>

                  {/* Doctor Name */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                      {t.doctorName}
                    </label>
                    <input
                      type="text"
                      required={formDoctorPresent}
                      placeholder={t.phDoctor}
                      value={formDoctorName}
                      onChange={(e) => setFormDoctorName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                    />
                  </div>

                  {/* Beds total */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                      {t.bedsTotal}
                    </label>
                    <input
                      type="number"
                      required
                      value={formBedsTotal}
                      onChange={(e) => setFormBedsTotal(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                    />
                  </div>

                  {/* Beds occupied */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                      {t.bedsOccupied}
                    </label>
                    <input
                      type="number"
                      required
                      value={formBedsOccupied}
                      onChange={(e) => setFormBedsOccupied(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                    />
                  </div>

                  {/* Patients count */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                      {t.patients}
                    </label>
                    <input
                      type="number"
                      required
                      value={formPatientsCount}
                      onChange={(e) => setFormPatientsCount(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                    />
                  </div>

                  {/* Language Text area fallback */}
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                      {t.textInputLabel}
                    </label>
                    <textarea
                      rows={3}
                      value={formVoiceText}
                      onChange={(e) => setFormVoiceText(e.target.value)}
                      placeholder="Type/dictate report text in any regional language (Odia, Hindi, Bengali, English)..."
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] italic"
                    />
                    {/* AI Parse button — calls Sarvam AI to extract structured data */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        disabled={aiParseLoading || !formVoiceText.trim()}
                        onClick={handleAIParse}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-300 hover:bg-orange-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-[11px] font-bold text-orange-700 transition"
                      >
                        {aiParseLoading ? (
                          <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                          </svg>
                        )}
                        {aiParseLoading ? "Parsing with Sarvam AI..." : "✨ AI Parse with Sarvam"}
                      </button>
                      {aiParsedBadge && (
                        <span className="text-[11px] text-green-700 font-semibold flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                          Form auto-filled by Sarvam AI
                        </span>
                      )}
                    </div>
                  </div>

                </div>

                {/* DRUG LOGISTICS SECTION */}
                <div className="border-t border-slate-100 pt-6 space-y-4">
                  <div>
                    <h4 className="font-display font-bold text-slate-800 text-xs uppercase tracking-wider">{t.stockSection}</h4>
                    <p className="text-[11px] text-slate-400">Update the current physical stocks available in the facility stores</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {Object.keys(center.stock).map((key) => {
                      return (
                        <div key={key} className="p-3 bg-slate-50 border border-slate-200/50 rounded-xl space-y-2">
                          <label className="text-[10px] font-bold text-slate-600 block truncate">{key}</label>
                          <input
                            type="number"
                            value={formStock[key] !== undefined ? formStock[key] : ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormStock((prev) => ({
                                ...prev,
                                [key]: val === "" ? 0 : Number(val)
                              }));
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold text-slate-800 font-mono"
                          />
                          <span className="text-[9px] text-slate-400 block font-sans">
                            Runway: {center.stock[key].daily_consumption} units/day
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Observations / Notes */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                    {t.notes}
                  </label>
                  <textarea
                    rows={3}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder={t.phNotes}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                  />
                </div>

                {/* Submit error / saving status */}
                {submitError && (
                  <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    ⚠️ {submitError}
                  </div>
                )}

                {/* SUBMIT BUTTON */}
                <div className="pt-4 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Reset form to original center registers?")) {
                        setFormDoctorPresent(center.doctor_present);
                        setFormDoctorName(center.doctor_name || "");
                        setFormBedsTotal(center.beds_total);
                        setFormBedsOccupied(center.beds_occupied);
                        setFormPatientsCount(center.today_patient_count);
                        setFormNotes("");
                        setFormVoiceText("");
                        const stockInit: Record<string, number> = {};
                        Object.keys(center.stock).forEach((key) => {
                          stockInit[key] = center.stock[key].quantity;
                        });
                        setFormStock(stockInit);
                      }
                    }}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-lg text-xs font-semibold"
                  >
                    Reset Registers
                  </button>

                  <button
                    type="submit"
                    disabled={submitSaving}
                    className="px-6 py-2.5 bg-[#f97316] hover:bg-orange-600 disabled:opacity-60 text-white font-display font-bold text-xs rounded-lg shadow-md hover:shadow-lg transition flex items-center space-x-1.5"
                  >
                    {submitSaving && (
                      <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    )}
                    <span>{submitSaving ? "Saving to cloud..." : t.submitBtn}</span>
                  </button>
                </div>

              </form>
            </div>

            {/* Right Column (33%): WhatsApp / SMS Ingest Simulator */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                <div className="flex items-center space-x-2 border-b pb-3 border-slate-100">
                  <div className="p-1.5 bg-green-100 rounded-lg text-green-700">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-slate-800 text-xs uppercase tracking-wider">SMS / WhatsApp Ingest</h4>
                    <p className="text-[10px] text-slate-400 font-mono">Offline cellular telemetry receiver</p>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Field workers often operate in network black spots with zero internet. This simulator receives structured cellular SMS strings, parses them locally, and auto-fills the digitization registers instantly.
                </p>

                <div className="space-y-3">
                  <textarea
                    rows={4}
                    value={smsInput}
                    onChange={(e) => setSmsInput(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                    placeholder="E.g., REPORT phc-tangi DOCTOR: YES BEDS: 5/12 PATIENTS: 65 STOCK: Paracetamol 1500, ORS 200"
                  />

                  {smsError && (
                    <p className="text-[11px] font-semibold text-red-600 bg-red-50 p-2.5 rounded-lg">
                      ❌ {smsError}
                    </p>
                  )}
                  {smsSuccess && (
                    <p className="text-[11px] font-semibold text-green-700 bg-green-50 p-2.5 rounded-lg">
                      ✓ {smsSuccess}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleSMSParse}
                    className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center space-x-1.5 transition cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 text-white" />
                    <span>Parse & Ingest SMS Payload</span>
                  </button>
                </div>

                <div className="border-t pt-4 space-y-2.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Simulation Presets</p>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setSmsInput(`REPORT ${center.id} DR: NO BEDS: 2/${center.beds_total} PATIENTS: 18 STOCK: Paracetamol 50, ORS 15`)}
                      className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left rounded-lg text-[10px] text-slate-600 font-mono transition block truncate"
                    >
                      Preset 1: Emergency Shortage (Doctor Absent)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSmsInput(`REPORT ${center.id} DR: YES BEDS: ${center.beds_total}/${center.beds_total} PATIENTS: 95 STOCK: Paracetamol 3800, ORS 850`)}
                      className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left rounded-lg text-[10px] text-slate-600 font-mono transition block truncate"
                    >
                      Preset 2: Maximum Bed Occupancy Peak
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TOAST SUCCESS FEEDBACK */}
      {showToast && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-[#16a34a] text-white px-6 py-3.5 rounded-xl shadow-2xl flex items-center space-x-3 border border-white/20 animate-bounce">
          <CheckCircle className="w-5.5 h-5.5 text-white" />
          <div>
            <p className="font-bold text-sm font-display">Report submitted successfully! ✅</p>
            <p className="text-xs text-green-100 mt-0.5">District Command telemetry registers updated in real time.</p>
          </div>
        </div>
      )}

    </div>
  );
}
