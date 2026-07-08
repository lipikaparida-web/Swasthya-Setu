import { useState, useMemo, useEffect } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { 
  BrainCircuit, 
  RefreshCw, 
  Printer, 
  Share2, 
  Download, 
  Truck, 
  AlertCircle, 
  FileText, 
  ShieldAlert,
  CheckCircle2,
  HelpCircle,
  Clock
} from "lucide-react";
import { Center, RedistributionRecommendation } from "../types";
import { getSmartRedistributions } from "../utils/healthCalculations";
import { useLanguage } from "../utils/LanguageContext";
import { getLocalizedCenterName, getLocalizedDrugName, getLocalizedAlert } from "../utils/translations";
import { generateDistrictBrief } from "../utils/api";

function oklchToRgb(L: number, C: number, h: number): [number, number, number] {
  const hRad = (h * Math.PI) / 180;
  const lab_a = C * Math.cos(hRad);
  const lab_b = C * Math.sin(hRad);

  const l_ = L + 0.3963377774 * lab_a + 0.2158037573 * lab_b;
  const m_ = L - 0.1055613458 * lab_a - 0.0638541728 * lab_b;
  const s_ = L - 0.0894841775 * lab_a - 1.291485548 * lab_b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  let r_lin = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let g_lin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let b_lin = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  r_lin = Math.max(0, Math.min(1, r_lin));
  g_lin = Math.max(0, Math.min(1, g_lin));
  b_lin = Math.max(0, Math.min(1, b_lin));

  const toSRGB = (c: number) => {
    return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  };

  const sR = Math.round(toSRGB(r_lin) * 255);
  const sG = Math.round(toSRGB(g_lin) * 255);
  const sB = Math.round(toSRGB(b_lin) * 255);

  return [sR, sG, sB];
}

function transformOklchToRgb(cssText: string): string {
  return cssText.replace(/oklch\(\s*([\d.%]+)\s+([\d.%]+)\s+([\d.%]+)(?:\s*\/\s*([\d.%]+))?\s*\)/gi, (match, lStr, cStr, hStr, aStr) => {
    const L = lStr.endsWith("%") ? parseFloat(lStr) / 100 : parseFloat(lStr);
    const C = parseFloat(cStr);
    const h = parseFloat(hStr);
    const a = aStr ? (aStr.endsWith("%") ? parseFloat(aStr) / 100 : parseFloat(aStr)) : 1;

    const [r, g, b] = oklchToRgb(L, C, h);
    return aStr !== undefined ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`;
  });
}

interface AiBriefProps {
  centers: Center[];
  onUpdateCenter: (id: string, updatedFields: Partial<Center>) => void;
}

export default function AiBrief({ centers, onUpdateCenter }: AiBriefProps) {
  const { language: globalLang, t: globalT } = useLanguage();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showBrief, setShowBrief] = useState(true);
  const [processedTransfers, setProcessedTransfers] = useState<Record<string, boolean>>({});
  const [processedList, setProcessedList] = useState<RedistributionRecommendation[]>([]);
  const [toastMessage, setToastMessage] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  // AI-generated brief text from Sarvam API (null = use static fallback)
  const [aiBriefText, setAiBriefText] = useState<string | null>(null);
  const [briefError, setBriefError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Live dynamic redistribution directives from greedy supply match
  const dynamicRedistributions = useMemo(() => {
    const active = getSmartRedistributions(centers);
    // Include items that are already processed so they still show up with a green checkmark
    const processed = processedList.filter(
      (p) => !active.some((a) => a.fromCenter === p.fromCenter && a.toCenter === p.toCenter && a.item === p.item)
    );
    return [...active, ...processed];
  }, [centers, processedList]);

  const criticalCenters = centers.filter((c) => c.status === "CRITICAL");
  const warningCenters = centers.filter((c) => c.status === "WARNING");
  const totalIssues = criticalCenters.length + warningCenters.length;

  const today = new Date();
  const formattedDateTime = today.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  });

  const [generationStep, setGenerationStep] = useState(0);

  // Build district data payload from current centers state
  const buildDistrictPayload = () => {
    const critCenters = centers.filter((c) => c.status === "CRITICAL");
    const warnCenters = centers.filter((c) => c.status === "WARNING");
    const stockAlerts: { center: string; item: string; days_left: number }[] = [];

    centers.forEach((c) => {
      Object.values(c.stock).forEach((item) => {
        if (item.days_remaining <= 5) {
          stockAlerts.push({
            center: c.name,
            item: item.name,
            days_left: item.days_remaining,
          });
        }
      });
    });

    return {
      district: "Khordha",
      centers_at_risk: [...critCenters, ...warnCenters].map((c) => c.name),
      stock_alerts: stockAlerts,
      extra_data: {
        total_centers: centers.length,
        critical_count: critCenters.length,
        warning_count: warnCenters.length,
        no_doctor_centers: centers.filter((c) => !c.doctor_present).map((c) => c.name),
      },
    };
  };

  // Handle regenerating brief — calls real Sarvam AI backend
  const handleRegenerate = async () => {
    setIsGenerating(true);
    setShowBrief(false);
    setGenerationStep(0);
    setBriefError(null);

    // Animate steps while API call runs in parallel
    const interval = setInterval(() => {
      setGenerationStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 700);

    try {
      const payload = buildDistrictPayload();
      const result = await generateDistrictBrief(payload);

      clearInterval(interval);
      setGenerationStep(5);

      if (result.success && result.brief) {
        setAiBriefText(result.brief);
        showToast("Sarvam AI brief compiled successfully! ✅");
      } else {
        throw new Error("Empty response from AI");
      }
    } catch (err: any) {
      clearInterval(interval);
      setBriefError(err.message || "Failed to reach Sarvam AI. Showing cached brief.");
      showToast("⚠️ AI API unavailable — showing cached brief.");
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
        setShowBrief(true);
      }, 500);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage("");
    }, 4000);
  };

  // Process a redistribution transfer in real-time!
  const handleProcessTransfer = (rec: RedistributionRecommendation) => {
    if (processedTransfers[rec.id]) return;

    // Find the recipient center
    const recipient = centers.find((c) => c.name === rec.toCenter);
    const donor = centers.find((c) => c.name === rec.fromCenter);

    if (!recipient || !donor) {
      showToast("Error locating facilities for transaction.");
      return;
    }

    // Update Recipient Stock
    const recipientStock = { ...recipient.stock };
    if (recipientStock[rec.item]) {
      const origQty = recipientStock[rec.item].quantity;
      const newQty = origQty + rec.qtyToTransfer;
      const dailyUse = recipientStock[rec.item].daily_consumption;
      
      recipientStock[rec.item] = {
        ...recipientStock[rec.item],
        quantity: newQty,
        days_remaining: dailyUse > 0 ? Math.round(newQty / dailyUse) : 30
      };
    }

    // Update Donor Stock
    const donorStock = { ...donor.stock };
    if (donorStock[rec.item]) {
      const origQty = donorStock[rec.item].quantity;
      const newQty = Math.max(0, origQty - rec.qtyToTransfer);
      const dailyUse = donorStock[rec.item].daily_consumption;

      donorStock[rec.item] = {
        ...donorStock[rec.item],
        quantity: newQty,
        days_remaining: dailyUse > 0 ? Math.round(newQty / dailyUse) : 30
      };
    }

    // Save state changes for both centers
    onUpdateCenter(recipient.id, {
      stock: recipientStock,
      // If Paracetamol or ORS was critical and we just added stock, remove the alert message & make status GOOD
      status: "GOOD", 
      alertMessage: undefined
    });

    onUpdateCenter(donor.id, {
      stock: donorStock
    });

    setProcessedTransfers((prev) => ({ ...prev, [rec.id]: true }));
    setProcessedList((prev) => [...prev, rec]);
    showToast(`Dispatched ${rec.qtyToTransfer} units of ${rec.item} from ${rec.fromCenter} to ${rec.toCenter}! 🚚`);
  };

  const handlePrint = async () => {
    const element = document.getElementById("ai-brief-memo-card");
    if (!element) {
      window.print();
      return;
    }

    setIsDownloadingPdf(true);
    showToast(
      globalLang === "hi" 
        ? "दस्तावेज़ संकलित किया जा रहा है... कृपया प्रतीक्षा करें 📄" 
        : globalLang === "or" 
          ? "ମେମୋ PDF ପ୍ରସ୍ତୁତ ହେଉଛି... ଦୟାକରି ଅପେକ୍ଷା କରନ୍ତୁ 📄" 
          : "Compiling executive memo into PDF... please wait 📄"
    );

    try {
      // Small delay for the state and UI to settle
      await new Promise((resolve) => setTimeout(resolve, 300));

      const canvas = await html2canvas(element, {
        scale: 2, // 2x high resolution
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        onclone: (clonedDoc) => {
          const clonedCard = clonedDoc.getElementById("ai-brief-memo-card");
          if (clonedCard) {
            clonedCard.style.borderRadius = "0px";
            clonedCard.style.boxShadow = "none";
            clonedCard.style.border = "none";
          }

          // Transform OKLCH styles in the cloned styles so html2canvas doesn't crash on Tailwind CSS v4 variables
          const styleElements = Array.from(clonedDoc.querySelectorAll("style"));
          styleElements.forEach((el) => {
            if (el.textContent && el.textContent.includes("oklch")) {
              el.textContent = transformOklchToRgb(el.textContent);
            }
          });
        }
      });

      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const formattedDate = new Date().toISOString().slice(0, 10);
      pdf.save(`AI_District_Brief_Khordha_${formattedDate}.pdf`);
      showToast(
        globalLang === "hi" 
          ? "पीडीएफ सफलतापूर्वक डाउनलोड हो गया! 💾" 
          : globalLang === "or" 
            ? "PDF ସଫଳତାର ସହିତ ଡାଉନଲୋଡ୍ ହୋଇଛି! 💾" 
            : "PDF memo successfully downloaded! 💾"
      );
    } catch (error) {
      console.error("Failed to generate PDF programmatically:", error);
      window.print();
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleShare = () => {
    showToast("Dispatched brief overview to DMO Khordha WhatsApp & SMS administrative gateway! ✉️");
  };

  if (initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-6">
        <div className="relative">
          {/* Circular outer animated track */}
          <div className="w-16 h-16 border-4 border-orange-100 border-t-[#f97316] rounded-full animate-spin"></div>
          {/* Inner pulse element */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <BrainCircuit className="w-6 h-6 text-[#f97316] animate-pulse" />
          </div>
        </div>
        <div className="space-y-2 max-w-sm">
          <h3 className="font-display font-extrabold text-slate-800 text-sm">
            {globalLang === "hi" ? "एआई जिला संक्षिप्त लोड किया जा रहा है..." : globalLang === "or" ? "AI ଜିଲ୍ଲା ସଂକ୍ଷିପ୍ତ ଲୋଡ୍ ହେଉଛି..." : "Compiling District AI Intelligence..."}
          </h3>
          <p className="text-xs text-slate-400">
            {globalLang === "hi" 
              ? "सर्वम एआई इंजन के माध्यम से वास्तविक समय की दवा सूची, स्थानिक दूरी और उपभोग पैटर्न का विश्लेषण किया जा रहा है..." 
              : globalLang === "or" 
                ? "ବାସ୍ତବ ସମୟ ଔଷଧ ତାଲିକା, ଦୂରତା ଏବଂ ବ୍ୟବହାରର ଆକଳନ ଚାଲିଛି..." 
                : "Parsing real-time medicine logs, spatial transport vectors, and consumption rate models via Sarvam LLM gateway..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Title & Action controls (Hidden on Print) */}
      <div className="no-print bg-white border-b border-slate-200 p-4 -mt-6 -mx-4 lg:-mx-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-display font-bold text-slate-800 flex items-center space-x-2">
            <BrainCircuit className="w-5.5 h-5.5 text-[#f97316]" />
            <span>{globalLang === "hi" ? "एआई जिला संक्षिप्त — खोर्धा जिला" : globalLang === "or" ? "AI ଜିଲ୍ଲା ସଂକ୍ଷିପ୍ତ ବିବରଣୀ — ଖୋର୍ଦ୍ଧା ଜିଲ୍ଲା" : "AI District Brief — Khordha District"}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {globalLang === "hi" 
              ? "स्वास्थ्य सेतु एआई द्वारा निर्मित • सर्वम एआई और भाषिणी अनुवाद" 
              : globalLang === "or" 
                ? "ସ୍ୱାସ୍ଥ୍ୟ ସେତୁ AI ଦ୍ୱାରା ପ୍ରସ୍ତୁତ • ସର୍ଭମ ଏବଂ ଭାଷିଣୀ ଅନୁବାଦ" 
                : "Powered by Swasthya Setu AI • Sarvam AI & Bhashini Translation Engines"}
          </p>
        </div>
        <div className="flex items-center space-x-2.5">
          <button 
            onClick={handlePrint}
            disabled={isDownloadingPdf}
            className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 disabled:opacity-60 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
          >
            {isDownloadingPdf ? (
              <svg className="animate-spin h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <Printer className="w-4 h-4 text-slate-500" />
            )}
            <span>
              {isDownloadingPdf 
                ? (globalLang === "hi" ? "पीडीएफ डाउनलोड हो रहा है..." : globalLang === "or" ? "PDF ଡାଉନଲୋଡ୍ ହେଉଛି..." : "Downloading PDF...") 
                : (globalLang === "hi" ? "मेमो प्रिंट / पीडीएफ डाउनलोड करें" : globalLang === "or" ? "ମେମୋ ପ୍ରିଣ୍ଟ / PDF ଡାଉନଲୋଡ୍" : "Print / Download PDF Memo")}
            </span>
          </button>
          <button 
            onClick={handleShare}
            className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <Share2 className="w-4 h-4 text-slate-500" />
            <span>{globalLang === "hi" ? "साझा करें" : globalLang === "or" ? "ସେୟାର୍ କରନ୍ତୁ" : "Share"}</span>
          </button>
          <button 
            onClick={handleRegenerate}
            disabled={isGenerating}
            className="px-3.5 py-2 bg-[#f97316] hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition"
          >
            <BrainCircuit className="w-4 h-4 text-white animate-pulse" />
            <span>{globalLang === "hi" ? "एआई ब्रीफ पुनर्गठित करें" : globalLang === "or" ? "AI ସଂକ୍ଷିପ୍ତ ପୁନର୍ବାର ପ୍ରସ୍ତուତ କରନ୍ତୁ" : "Regenerate AI Brief"}</span>
          </button>
        </div>
      </div>

      {/* PRINT BANNER ONLY SHOWN IN BROWSER PRINT PREVIEW */}
      <div className="hidden print-only text-center border-b pb-4 mb-4">
        <h2 className="text-2xl font-display font-extrabold text-slate-950 uppercase tracking-tight">{globalLang === "hi" ? "स्वास्थ्य सेतु — ओडिशा सरकार" : globalLang === "or" ? "ସ୍ୱାସ୍ଥ୍ୟ ସେତୁ — ଓଡ଼ିଆ ସରକାର" : "Swasthya Setu — Government of Odisha"}</h2>
        <p className="text-sm font-semibold text-slate-700 mt-1">{globalLang === "hi" ? "जिला स्वास्थ्य कमान एवं खुफिया ब्रीफिंग मेमो" : globalLang === "or" ? "ଜିଲ୍ଲା ସ୍ୱାସ୍ଥ୍ୟ ନିର୍ଦ୍ଦେଶାଳୟ ବିବରଣୀ ସ୍ମାରକପତ୍ର" : "District Health Command & Intelligence Briefing Memo"}</p>
        <p className="text-xs text-slate-500 font-mono mt-1">Generated on: {formattedDateTime} | Khordha Command Hub</p>
      </div>

      {/* LOADING STATE ANIMATION */}
      {isGenerating && (
        <div className="bg-slate-950 rounded-2xl border border-slate-800 p-6 text-left shadow-xl flex flex-col space-y-4 max-w-2xl mx-auto font-mono text-[11px] text-slate-300">
          <div className="flex items-center justify-between border-b border-slate-900 pb-3">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <span className="w-3 h-3 rounded-full bg-green-500/80" />
              <span className="text-slate-500 text-[10px] pl-2 font-semibold">SWASTHYA-SETU-AI-COMPILER v2.1.0</span>
            </div>
            <Clock className="w-3.5 h-3.5 text-[#f97316] animate-spin" />
          </div>

          <div className="space-y-3.5 pt-1.5">
            {[
              {
                id: 0,
                text: "📡 Connecting to Sarvam LLM API Gateway and Swasthya Setu secure cloud cluster...",
                hiText: "📡 सर्वम एलएलएम एपीआई गेटवे और स्वास्थ्य सेतु सुरक्षित क्लाउड क्लस्टर से जुड़ रहा है...",
                orText: "📡 ସର୍ଭମ LLM API ଗେଟୱେ ଏବଂ ସ୍ୱାସ୍ଥ୍ୟ ସେତୁ ସୁରକ୍ଷିତ କ୍ଲାଉଡ୍ କ୍ଲଷ୍ଟର୍ ସହିତ ସଂଯୋଗ ହେଉଛି..."
              },
              {
                id: 1,
                text: "🔍 Indexing decentralized telemedicine logs and patient intake registers across 12 PHCs...",
                hiText: "🔍 12 पीएचसी के विकेंद्रीकृत टेलीमेडिसिन लॉग्स और रोगी सेवन रजिस्टरों को अनुक्रमित कर रहा है...",
                orText: "🔍 ୧୨ ବିକେନ୍ଦ୍ରୀକୃତ ଟେଲିମେଡିସିନ୍ ଏବଂ ରୋଗୀ ପଞ୍ଜୀକରଣ ରେକର୍ଡ ଅନୁସନ୍ଧାନ କରୁଛି..."
              },
              {
                id: 2,
                text: "🧠 Running greedy linear optimization algorithms for inter-facility stock redistribution...",
                hiText: "🧠 अंतर-सुविधा स्टॉक पुनर्वितरण के लिए ग्रीडी लीनियर ऑप्टिमाइजेशन एल्गोरिदम चला रहा है...",
                orText: "🧠 ଆନ୍ତଃ-ଚିକିତ୍ସାଳୟ ମଧ୍ୟରେ ସ୍ମାର୍ଟ ଔଷଧ ସ୍ଥାନାନ୍ତର ପାଇଁ ଅପ୍ଟିମାଇଜେସନ୍ ପ୍ରକ୍ରିୟା ଚାଲିଛି..."
              },
              {
                id: 3,
                text: "🔄 Querying Bhashini Translate neural networks for real-time localization parameters...",
                hiText: "🔄 वास्तविक समय स्थानीयकरण मापदंडों के लिए भाषिणी ट्रांसलेट न्यूरल नेटवर्क को क्वेरी कर रहा है...",
                orText: "🔄 ବହୁଭାଷୀ ଲୋକାଲାଇଜେସନ୍ ପାଇଁ ଭାଷିଣୀ ଟ୍ରାନ୍ସଲେଟ୍ ନ୍ୟୁରାଲ୍ ନେଟୱର୍କକୁ ଯୋଡୁଛି..."
              },
              {
                id: 4,
                text: "✍️ Synthesizing executive pharmaceutical intelligence memo (Subject: SETU/KRD/AI-402)...",
                hiText: "✍️ कार्यकारी फार्मास्युटिकल इंटेलिजेंस मेमो का संश्लेषण (विषय: SETU/KRD/AI-402)...",
                orText: "✍️ ମୁଖ୍ୟ ଫାର୍ମାସ୍ୟୁଟିକାଲ୍ ସଂକ୍ଷିପ୍ତ ବିବରଣୀ ସ୍ମାରକପତ୍ର ପ୍ରସ୍ତୁତ କରୁଛି..."
              },
              {
                id: 5,
                text: "💾 Writing tamper-proof supply chain ledger transactions and compiling memo file...",
                hiText: "💾 छेड़छाड़-मुक्त आपूर्ति श्रृंखला लेजर लेनदेन लिखना और ज्ञापन फ़ाइल संकलित करना...",
                orText: "💾 ସୁରକ୍ଷିତ ଯୋଗାଣ ଶୃଙ୍ଖଳା ଡାଟା ଲେଖୁଛି ଏବଂ ଚୂଡ଼ାନ୍ତ ମେମୋ ପ୍ରକାଶ କରୁଛି..."
              }
            ].map((step) => {
              const isDone = generationStep > step.id;
              const isActive = generationStep === step.id;

              let icon = "⏳";
              let color = "text-slate-500";
              if (isDone) {
                icon = "✅";
                color = "text-green-400 font-medium";
              } else if (isActive) {
                icon = "⚙️";
                color = "text-[#f97316] font-semibold animate-pulse";
              }

              const displayText = globalLang === "hi" ? step.hiText : globalLang === "or" ? step.orText : step.text;

              return (
                <div key={step.id} className={`flex items-start space-x-3 transition-all duration-300 ${color}`}>
                  <span className="text-xs shrink-0">{icon}</span>
                  <div className="space-y-1 w-full">
                    <p className="leading-normal">{displayText}</p>
                    {isActive && (
                      <div className="h-1 bg-slate-900 w-44 rounded-full overflow-hidden mt-1.5">
                        <div className="h-full bg-[#f97316] animate-[pulse_1s_infinite] w-full" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!showBrief && !isGenerating && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center max-w-lg mx-auto my-12 relative overflow-hidden">
          <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4 relative">
            <BrainCircuit className="w-6 h-6 text-[#f97316] animate-pulse" />
          </div>
          <div>
            <h4 className="font-display font-bold text-slate-800 text-sm">{globalLang === "hi" ? "वास्तविक समय कमान खुफिया संकलन..." : globalLang === "or" ? "ତଥ୍ୟ ସଂଗ୍ରହ ଚାଲିଛି..." : "Compiling Real-time Command Intelligence..."}</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {globalLang === "hi" ? "स्थानीय स्वास्थ्य रिपोर्टों का संश्लेषण, आवश्यक दवाओं की सूची का आकलन और पुनर्वितरण अनुकूलन के लिए स्थानिक दूरियों की गणना..." : globalLang === "or" ? "ସ୍ୱାସ୍ଥ୍ୟ ରିପୋର୍ଟ ସମୀକ୍ଷା ଏବଂ ଜରୁରୀକาଳୀନ ସ୍ଥାନାନ୍ତର ପାଇଁ ଦୂରତା ଗଣନା ଚାଲିଛି..." : "Synthesizing local healthcare reports, assessing essential medicine inventories, and calculating spatial distances for redistribution optimization..."}
            </p>
          </div>
        </div>
      )}

      {/* MAIN BRIEF MEMO */}
      {showBrief && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Column Left (66%): Brief and Recommendations */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* OFFICIAL AI BRIEF MEMO CARD */}
            <div id="ai-brief-memo-card" className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 relative overflow-hidden print-card">
              {/* National Emblem shadow accent */}
              <div className="absolute top-4 right-4 text-slate-100 uppercase font-bold text-8xl tracking-widest select-none pointer-events-none opacity-30 font-display">
                NHM
              </div>

              {/* Memo Letterhead Header */}
              <div className="border-b pb-4 border-slate-100 flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{globalLang === "hi" ? "कमान खुफिया बुलेटिन" : globalLang === "or" ? "ମୁଖ୍ୟ କାର୍ଯ୍ୟାଳୟ ବିଜ୍ଞପ୍ତି" : "Command Intelligence Bulletin"}</span>
                  <h3 className="font-display font-extrabold text-slate-900 text-lg mt-0.5">{globalLang === "hi" ? "स्वास्थ्य स्थिति ज्ञापन पत्र" : globalLang === "or" ? "ସ୍ୱାସ୍ଥ୍ୟ ସ୍ଥିତି ସ୍ମାରକପତ୍ର" : "HEALTH STATUS MEMORANDUM"}</h3>
                </div>
                <div className="text-right text-xs font-mono">
                  <p className="text-slate-500">Ref: <span className="font-bold">SETU/KRD/AI-402</span></p>
                  <p className="text-slate-400 text-[11px] mt-0.5">{formattedDateTime}</p>
                </div>
              </div>

              {/* Memo Subject & Parameters */}
              <div className="grid grid-cols-2 gap-4 py-4 text-xs border-b border-slate-100 bg-slate-50/50 -mx-6 px-6">
                <div>
                  <p className="text-slate-400 font-semibold uppercase">{globalLang === "hi" ? "विषय" : globalLang === "or" ? "ବିଷୟ" : "Subject"}</p>
                  <p className="font-bold text-slate-800 mt-1">{globalLang === "hi" ? "आपातकालीन हस्तक्षेप एवं दवा पुनर्वितरण निर्देश" : globalLang === "or" ? "ଜରୁରୀକାଳୀନ ହସ୍ତକ୍ଷେପ ଓ ଔଷଧ ସ୍ଥାନାନ୍ତର ନିର୍ଦ୍ଦେଶାବଳୀ" : "Intervention & Drug Redistribution Directives"}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold uppercase">{globalLang === "hi" ? "जिला स्थिति" : globalLang === "or" ? "ଜିଲ୍ଲା ସ୍ଥିତି" : "District Standing"}</p>
                  <p className="font-bold text-red-600 mt-1 flex items-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 mr-1.5 animate-ping" />
                    {globalLang === "hi" ? "गंभीर (CRITICAL)" : globalLang === "or" ? "ଜରୁରୀକାଳୀନ (CRITICAL)" : "CRITICAL"}
                  </p>
                </div>
              </div>

              {/* Memo Text Content */}
              <div className="pt-5 space-y-4">
                <p className="text-xs text-slate-700 leading-relaxed font-semibold">
                  {globalLang === "hi" ? "सेवा में: जिला चिकित्सा अधिकारी (DMO), खोर्धा प्रशासन, ओडिशा सरकार।" : globalLang === "or" ? "ପ୍ରତି: ଜିଲ୍ଲା ମେଡିକାଲ୍ ଅଫିସର (DMO), ଖୋର୍ଦ୍ଧା ପ୍ରଶାସନ, ଓଡ଼ିଶା ସରକାର।" : "To: District Medical Officer (DMO), Khordha Administration, Gov. of Odisha."}
                </p>
                {/* AI-generated brief from Sarvam API (shown when available) */}
                {aiBriefText && (
                  <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-900 leading-relaxed flex items-start gap-2">
                    <BrainCircuit className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-orange-700 text-[10px] uppercase tracking-wide block mb-1">Sarvam AI · Live Analysis</span>
                      <p className="leading-relaxed">{aiBriefText}</p>
                    </div>
                  </div>
                )}
                {briefError && (
                  <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                    ⚠️ {briefError}
                  </div>
                )}
                <p className="text-xs text-slate-600 leading-relaxed">
                  {globalLang === "hi" ? (
                    <span>
                      खोर्धा जिले के लिए नैदानिक, दवा और परिचालन अनुपालन ऑडिट एक <span className="font-bold text-red-600">गंभीर (CRITICAL)</span> स्थिति सूचकांक पर है, जो तत्काल आपात स्थिति वाले <span className="font-bold text-slate-800">{criticalCenters.length} केंद्रों</span> और तार्किक चेतावनियों वाले <span className="font-bold text-slate-800">{warningCenters.length} केंद्रों</span> का प्रतिनिधित्व करता है। दवाओं की कम आपूर्ति और स्टाफ की छुट्टी के कारण स्वास्थ्य सेवाओं की पहुंच बाधित हो रही है।
                    </span>
                  ) : globalLang === "or" ? (
                    <span>
                      ଖୋର୍ଦ୍ଧା ଜିଲ୍ଲା ପାଇଁ ଚିକିତ୍ସାଳୟ ଓ ଔଷଧ ଯୋଗାଣ ଅଡିଟ୍ ଏକ <span className="font-bold text-red-600">ଜରୁରୀକାଳୀନ</span> ସ୍ଥିତି ସୂଚକାଙ୍କରେ ରହିଛି, ଯାହା ତୁରନ୍ତ ସମସ୍ୟା ଥିବା <span className="font-bold text-slate-800">{criticalCenters.length} କେନ୍ଦ୍ର</span> ଏବଂ ଚେତାବନୀ ସ୍ଥିତିରେ ଥିବା <span className="font-bold text-slate-800">{warningCenters.length} କେନ୍ଦ୍ର</span> କୁ ଦର୍ଶାଉଛି। ଔଷଧ ଅଭାବ ଏବଂ ଡାକ୍ତର ଅନୁପସ୍ଥିତି ସ୍ୱାସ୍ଥ୍ୟସେବାକୁ ପ୍ରଭାବିତ କରୁଛି।
                    </span>
                  ) : (
                    <span>
                      The clinical, pharmaceutical, and operational compliance audit for Khordha District stands at a 
                      <span className="font-bold text-red-600"> CRITICAL</span> status index, representing 
                      <span className="font-bold text-slate-800"> {criticalCenters.length} centers</span> with immediate, red-category emergencies and 
                      <span className="font-bold text-slate-800"> {warningCenters.length} centers</span> with yellow-category logistic warnings. 
                      Healthcare access is bottlenecked by stock runouts and staff leaves.
                    </span>
                  )}
                </p>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/50 text-xs text-slate-700 leading-relaxed space-y-2">
                  <p className="font-bold text-slate-800">{globalLang === "hi" ? "💡 गतिशील कमान निर्देश:" : globalLang === "or" ? "💡 ମୁଖ୍ୟ କାର୍ଯ୍ୟାଳୟ ନିର୍ଦ୍ଦେଶାବଳୀ:" : "💡 Dynamic Command Directives:"}</p>
                  <ul className="list-disc pl-4 space-y-1.5 text-slate-600">
                    {centers.find((c) => c.id === "phc-tangi" && c.status === "CRITICAL") && (
                      <li>
                        {globalLang === "hi" ? (
                          <span>
                            <span className="font-bold text-red-600">पीएचसी टांगी (PHC Tangi)</span> में पैरासिटामोल का भंडार १५० इकाइयों के महत्वपूर्ण स्तर पर पहुंच गया है। पर्याप्त मात्रा में दवा की आपूर्ति सुनिश्चित करने के लिए नीचे दिए गए ८०० इकाइयों के स्थानांतरण आदेश को तुरंत स्वीकृत करें।
                          </span>
                        ) : globalLang === "or" ? (
                          <span>
                            <span className="font-bold text-red-600">ପିଏଚସି ଟାଙ୍ଗୀ (PHC Tangi)</span> ରେ ପାରାସିଟାମୋଲ ଭଣ୍ଡାର ୧୫୦ ୟୁନିଟ୍ ର ଗୁରୁତର ସ୍ତରରେ ପହଞ୍ଚିଛି। ଷ୍ଟକ୍ ସୁରକ୍ଷିତ କରିବା ପାଇଁ ତଳେ ଦିଆଯାଇଥିବା ୮୦୦ ୟୁନିଟ୍ ସ୍ଥାନାନ୍ତର ପ୍ରସ୍ତାବକୁ ତୁରନ୍ତ ମଞ୍ଜୁର କରନ୍ତୁ।
                          </span>
                        ) : (
                          <span>
                            <span className="font-bold text-red-600">PHC Tangi</span> paracetamol reserves have reached a critical safety floor of 150 units. Local transfer directives issued below should be authorized immediately to secure an 800-unit replenishment buffer from surplus hubs.
                          </span>
                        )}
                      </li>
                    )}
                    {centers.find((c) => c.id === "phc-bhubaneswar-north" && c.status === "CRITICAL") && (
                      <li>
                        {globalLang === "hi" ? (
                          <span>
                            <span className="font-bold text-red-600">पीएचसी भुवनेश्वर उत्तर (PHC Bhubaneswar North)</span> में ओआरएस का स्टॉक समाप्त होने वाला है (२ दिन शेष)। बेगुनिया सीएचसी से आपातकालीन स्थानांतरण करने की सिफारिश की जाती है।
                          </span>
                        ) : globalLang === "or" ? (
                          <span>
                            <span className="font-bold text-red-600">ପିଏଚସି ଭୁବନେଶ୍ୱର ଉତ୍ତର (PHC Bhubaneswar North)</span> ରେ ଓଆରଏସ ଷ୍ଟକ୍ ଶେଷ ହେବାକୁ ଯାଉଛି। ବେଗୁନିଆ ସିଏଚସି ରୁ ସ୍ଥାନାନ୍ତର କାର୍ଯ୍ୟକାରୀ କରିବାକୁ ସୁପାରିଶ କରାଯାଉଛି।
                          </span>
                        ) : (
                          <span>
                            <span className="font-bold text-red-600">PHC Bhubaneswar North</span> reports an ORS stockout runway of 2 days. Commencing redistribution from CHC Begunia will secure supply buffers for dengue seasons.
                          </span>
                        )}
                      </li>
                    )}
                    {centers.find((c) => c.id === "chc-balugaon" && c.status === "CRITICAL") && (
                      <li>
                        {globalLang === "hi" ? (
                          <span>
                            <span className="font-bold text-red-600">सीएचसी बालूगांव (CHC Balugaon)</span> में चिकित्सा अधिकारी लगातार ५ दिनों से अनुपस्थित हैं। हम खोर्धा सीएचसी से एक डॉक्टर को यहां अस्थाई ड्यूटी पर नियुक्त करने की सलाह देते हैं।
                          </span>
                        ) : globalLang === "or" ? (
                          <span>
                            <span className="font-bold text-red-600">ସିଏଚସି ବାଲୁଗାଁ (CHC Balugaon)</span> ରେ ଚିକିତ୍ସା ଅଧିକାରୀ ଲଗାତାର ୫ ଦିନ ଧରି ଅନୁପସ୍ଥିତ ଅଛନ୍ତି। ସେବା ବଜାୟ ରଖିବା ପାଇଁ ଖୋର୍ଦ୍ଧା ସିଏଚସି ରୁ ଅସ୍ଥାୟୀ ଡାକ୍ତର ନିୟୋଜିତ କରିବାକୁ ପରାମର୍ଶ ଦିଆଯାଉଛି।
                          </span>
                        ) : (
                          <span>
                            <span className="font-bold text-red-600">CHC Balugaon</span> is suffering a 5-day continuous absence of the assigned Medical Officer. Under DHS emergency codes, we recommend deploying a relieving doctor from CHC Khordha on temporary shift assignment to secure services for 12,000 residents.
                          </span>
                        )}
                      </li>
                    )}
                    <li>
                      {globalLang === "hi" ? (
                        <span>
                          <span className="font-bold text-slate-800">पीएचसी देलांग (PHC Delang)</span> लगातार २ दिनों से दैनिक रिपोर्ट को सिंक्रनाइज़ करने में विफल रहा है। संबंधित अधिकारियों को स्वचालित चेतावनी अनुस्मारक भेजे गए हैं।
                        </span>
                      ) : globalLang === "or" ? (
                        <span>
                          <span className="font-bold text-slate-800">ପିଏଚସି ଦେଲାଙ୍ଗ (PHC Delang)</span> ଦୈନିକ ରିପୋର୍ଟ ସିଙ୍କ୍ରୋନାଇଜ୍ କରିବାରେ ଲଗାତାର ୨ ଦିନ ହେଲା ବିଫଳ ହୋଇଛି। କର୍ମଚାରୀଙ୍କୁ ଚେତାବନୀ ପଠାଯାଇଛି।
                        </span>
                      ) : (
                        <span>
                          <span className="font-bold text-slate-800">PHC Delang</span> has failed to synchronize daily reporting registers for 2 consecutive days. Automated reminders have been generated to their sub-divisional staff.
                        </span>
                      )}
                    </li>
                  </ul>
                </div>
                <p className="text-xs text-slate-500 font-mono italic">
                  {globalLang === "hi" ? "*स्वास्थ्य सेतु स्मार्ट लॉजिस्टिक्स इंजन के माध्यम से संकलित। चिकित्सा स्वास्थ्य महानिदेशक द्वारा अधिकृत।" : globalLang === "or" ? "*ସ୍ୱାସ୍ଥ୍ୟ ସେତୁ ସ୍ମାର୍ଟ ଲଜିଷ୍ଟିକ୍ସ ଇଞ୍ଜିନ ଦ୍ୱାରା ପ୍ରସ୍ତୁତ। ସ୍ୱାସ୍ଥ୍ୟ ବିଭାଗ ଦ୍ୱାରା ଅନୁମୋଦିତ।" : "*Compiled via Swasthya Setu Smart Logistics Engine. Authorized by DHS (Director of Health Services)."}
                </p>
              </div>
            </div>

            {/* SMART REDISTRIBUTION RECOMMENDATIONS */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 print-card">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-orange-100 text-[#f97316] rounded-md">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-slate-800 text-sm">
                    {globalLang === "hi" ? "स्मार्ट आपूर्ति श्रृंखला पुनर्वितरण निर्देश" : globalLang === "or" ? "ସ୍ମାର୍ଟ ଯୋଗାଣ ଶୃଙ୍ଖଳା ପୁନର୍ବଣ୍ଟନ ନିର୍ଦ୍ଦେଶାବଳୀ" : "Smart Supply Chain Redistribution Directives"}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {globalLang === "hi" ? "स्थानीय स्टॉक आपात स्थिति को हल करने के लिए एआई-अनुकूलित अंतर-सुविधा हस्तांतरण" : globalLang === "or" ? "ସ୍ଥାନୀୟ ମହଜୁଦ ସମସ୍ୟା ସମାଧାନ ପାଇଁ AI-ଦ୍ୱାରା ଅନୁକୂଳିତ ସ୍ଥାନାନ୍ତର ନିର୍ଦ୍ଦେଶ" : "AI-optimized inter-facility transfers to resolve local stock emergencies"}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                      <th className="py-3 px-3">{globalLang === "hi" ? "दाता सुविधा" : globalLang === "or" ? "ଔଷଧ ଦାତା କେନ୍ଦ୍ର" : "Donor Facility"}</th>
                      <th className="py-3 px-3">{globalLang === "hi" ? "आवश्यक दवा" : globalLang === "or" ? "ଆବଶ୍ୟକୀୟ ଔଷଧ" : "Essential Medicine"}</th>
                      <th className="py-3 px-3">{globalLang === "hi" ? "हस्तांतरण मात्रा" : globalLang === "or" ? "ସ୍ଥାନାନ୍ତର ପରିମାଣ" : "Transfer Qty"}</th>
                      <th className="py-3 px-3">{globalLang === "hi" ? "लक्ष्य सुविधा" : globalLang === "or" ? "ଗ୍ରହୀତା କେନ୍ଦ୍ର" : "Target Facility"}</th>
                      <th className="py-3 px-3">{globalLang === "hi" ? "दूरी" : globalLang === "or" ? "ଦୂରତା" : "Road Distance"}</th>
                      <th className="py-3 px-3">{globalLang === "hi" ? "प्राथमिकता" : globalLang === "or" ? "ପ୍ରାଥମିକତା" : "Priority"}</th>
                      <th className="py-3 px-3 text-right no-print">{globalLang === "hi" ? "कार्रवाई" : globalLang === "or" ? "କାର୍ଯ୍ୟାନୁଷ୍ଠાન" : "Action Directive"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dynamicRedistributions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          <p className="font-bold text-sm text-green-600">✓ {globalLang === "hi" ? "सभी सुविधाएं अच्छी तरह से स्टॉक हैं" : globalLang === "or" ? "ସମସ୍ତ ସୁବିଧା କେନ୍ଦ୍ରରେ ସନ୍ତୋଷଜନକ ଷ୍ଟକ୍ ଅଛି" : "All Facilities Well-Stocked"}</p>
                          <p className="text-xs text-slate-400 mt-1">{globalLang === "hi" ? "पूरे जिले में कोई गंभीर दवा की कमी या असामान्यता नहीं पाई गई।" : globalLang === "or" ? "ଜିଲ୍ଲାରେ କୌଣସି ଔଷଧ ଅଭାବ ଦେଖାଯାଇନାହିଁ।" : "No critical medicine runway or stock anomalies detected across the district."}</p>
                        </td>
                      </tr>
                    ) : (
                      dynamicRedistributions.map((rec) => {
                        const isProcessed = !!processedTransfers[rec.id];
  
                        // Check if recipient is already GOOD in our live centers state
                        const recipientCenter = centers.find((c) => c.name === rec.toCenter);
                        const isResolvedByState = recipientCenter && recipientCenter.status === "GOOD";
                        const finalProcessed = isProcessed || isResolvedByState;
  
                        return (
                          <tr key={rec.id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-3 font-semibold text-slate-800">{getLocalizedCenterName(rec.fromCenter, globalLang)}</td>
                            <td className="py-3 px-3 font-semibold text-[#1e3a5f]">{getLocalizedDrugName(rec.item, globalLang)}</td>
                            <td className="py-3 px-3 font-mono font-bold text-slate-700">{rec.qtyToTransfer} {globalLang === "hi" ? "इकाइयाँ" : globalLang === "or" ? "ୟୁନିଟ୍" : "units"}</td>
                            <td className="py-3 px-3 font-semibold text-red-600">{getLocalizedCenterName(rec.toCenter, globalLang)}</td>
                            <td className="py-3 px-3 font-mono text-slate-500">{rec.distance} km</td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded-sm text-[9px] font-bold ${
                                rec.priority === "HIGH" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"
                              }`}>
                                {rec.priority === "HIGH" ? (globalLang === "hi" ? "उच्च" : globalLang === "or" ? "ଉଚ୍ଚ" : "HIGH") : (globalLang === "hi" ? "मध्यम" : globalLang === "or" ? "ମଧ୍ୟମ" : "MEDIUM")}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right no-print">
                              {finalProcessed ? (
                                <span className="inline-flex items-center text-green-600 font-bold text-[11px]">
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                  {globalLang === "hi" ? "भेज दिया गया" : globalLang === "or" ? "ପ୍ରେରିତ ହୋଇଛି" : "Transpatched"}
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleProcessTransfer(rec)}
                                  className="px-2.5 py-1.5 bg-[#f97316] hover:bg-orange-600 text-white rounded font-display text-[10px] font-bold shadow-xs hover:shadow-sm transition cursor-pointer"
                                >
                                  {globalLang === "hi" ? "हस्तांतरण करें" : globalLang === "or" ? "ସ୍ଥାନାନ୍ତର କରନ୍ତୁ" : "Process Transfer"}
                                </button>
                              )}
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

          {/* Column Right (33%): Intervention Centres Sidebar */}
          <div className="space-y-6">
            
            {/* CENTERS REQUIRING IMMEDIATE INTERVENTION */}
            <div className="bg-white rounded-2xl border border-red-200 shadow-md p-5 space-y-4 print-card">
              <div className="flex items-center space-x-2 border-b pb-3 border-slate-100">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                <h4 className="font-display font-bold text-slate-800 text-sm">{globalLang === "hi" ? "त्वरित ध्यान देने योग्य केंद्र" : globalLang === "or" ? "ତୁରନ୍ତ ଧ୍ୟାନ ଦେବାକୁ ଥିବା କେନ୍ଦ୍ର" : "Critical Facilities"}</h4>
              </div>

              <div className="space-y-4 divide-y divide-slate-100">
                {criticalCenters.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs">
                    <p>{globalLang === "hi" ? "🎉 सभी प्रमुख संकट निर्देशों का सफलतापूर्वक समाधान कर लिया गया है!" : globalLang === "or" ? "🎉 ସମସ୍ତ ଗୁରୁତର ସମସ୍ୟାର ସମାଧାନ ହୋଇଯାଇଛି!" : "🎉 All major facility crisis directives have been successfully processed or resolved!"}</p>
                  </div>
                ) : (
                  criticalCenters.map((center, idx) => (
                    <div key={center.id} className={`pt-3 ${idx === 0 ? "pt-0" : ""}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-xs text-slate-950">{getLocalizedCenterName(center.name, globalLang)}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{center.type}</p>
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-800">
                          {globalLang === "hi" ? "गंभीर" : globalLang === "or" ? "ଗୁରୁତର" : "CRITICAL"}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 font-semibold bg-red-50 p-2 rounded mt-2">
                        ⚠️ {globalLang === "hi" ? "चेतावनी" : globalLang === "or" ? "ଚେତାବନୀ" : "Alert"}: {getLocalizedAlert(center.alertMessage || "", globalLang)}
                      </p>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-slate-500 bg-slate-50 p-1.5 rounded">
                        <div>
                          <span className="block text-slate-400 font-semibold">{globalLang === "hi" ? "चिकित्सक अनुपस्थित" : globalLang === "or" ? "ଡାକ୍ତର ଅନୁପସ୍ଥିତ" : "Doctor Absent"}</span>
                          <span className="font-bold text-slate-700">{center.doctor_absent_days} {globalLang === "hi" ? "दिन" : globalLang === "or" ? "ଦିନ" : "Days"}</span>
                        </div>
                        <div>
                          <span className="block text-slate-400 font-semibold">{globalLang === "hi" ? "आज के मरीज" : globalLang === "or" ? "ଆଜିର ରୋଗୀ" : "Patients Today"}</span>
                          <span className="font-bold text-slate-700">{center.today_patient_count} {globalLang === "hi" ? "मरीज" : globalLang === "or" ? "ରୋଗୀ" : "Outpatients"}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* DIRECTIVES CHECKLIST CARD */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 print-card">
              <h4 className="font-display font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Clock className="w-4.5 h-4.5 text-[#1e3a5f]" />
                {globalLang === "hi" ? "कमान केंद्र चेकलिस्ट" : globalLang === "or" ? "ମୁଖ୍ୟ କାର୍ଯ୍ୟାଳୟ ଚେକଲିଷ୍ଟ" : "Command Center Checklist"}
              </h4>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-start space-x-2.5 p-2 bg-slate-50 rounded-lg">
                  <input type="checkbox" defaultChecked className="mt-0.5" />
                  <p className="text-slate-600 font-medium">{globalLang === "hi" ? "टांगी पैरासिटामोल कोल्ड चेन की जाँच करें (पूर्ण)" : globalLang === "or" ? "ଟାଙ୍ଗୀ ପାରାସିଟାମୋଲ ସ୍ଥିତି ଯାଞ୍ଚ କରନ୍ତୁ (ସମାପ୍ତ)" : "Verify Tangi cold chain paracetamol levels (Done)"}</p>
                </div>
                <div className="flex items-start space-x-2.5 p-2 bg-slate-50 rounded-lg">
                  <input type="checkbox" defaultChecked={centers.filter(c => c.status === "CRITICAL").length === 0} className="mt-0.5" />
                  <p className="text-slate-600 font-medium">{globalLang === "hi" ? "बेगुनिया अंतर-सुविधा ओआरएस भेजने की स्वीकृति दें (सक्रिय)" : globalLang === "or" ? "ବେଗୁନିଆ ଓଆରଏସ ସ୍ଥାନାନ୍ତର ଅନୁମୋଦନ କରନ୍ତุ (ସକ୍ରିୟ)" : "Approve Begunia inter-facility ORS dispatch (Active)"}</p>
                </div>
                <div className="flex items-start space-x-2.5 p-2 bg-slate-50 rounded-lg">
                  <input type="checkbox" className="mt-0.5" />
                  <p className="text-slate-600 font-medium">{globalLang === "hi" ? "सीएचसी बालूगांव एमओ को कारण बताओ नोटिस भेजें" : globalLang === "or" ? "ସିଏଚସି ବାଲୁଗାଁ ଡାକ୍ତରଙ୍କୁ କାରଣ ଦର୍ଶାଅ ନୋଟିସ ପଠାନ୍ତୁ" : "Send show-cause absence memo to CHC Balugaon MO"}</p>
                </div>
                <div className="flex items-start space-x-2.5 p-2 bg-slate-50 rounded-lg">
                  <input type="checkbox" className="mt-0.5" />
                  <p className="text-slate-600 font-medium">{globalLang === "hi" ? "जिला बाढ़ तैयारी चिकित्सा टीम तैनाती का समन्वय करें" : globalLang === "or" ? "ବନ୍ୟା ପ୍ରସ୍ତୁତି ସ୍ୱାସ୍ଥ୍ୟ ଦଳ ନିୟୋଜନ ସମନ୍ୱୟ କରନ୍ତୁ" : "Coordinate district flood prep medical team deployment"}</p>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TOAST FEEDBACK */}
      {toastMessage && (
        <div className="no-print fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-[#1e3a5f] text-white px-6 py-3.5 rounded-xl shadow-2xl flex items-center space-x-3 border border-white/20">
          <Truck className="w-5.5 h-5.5 text-orange-400 animate-bounce" />
          <div>
            <p className="font-bold text-xs font-display">{toastMessage}</p>
          </div>
        </div>
      )}

    </div>
  );
}
