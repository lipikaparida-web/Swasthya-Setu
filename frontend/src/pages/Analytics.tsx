import { useState } from "react";
import { useLanguage } from "../utils/LanguageContext";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";
import { 
  Filter, 
  Calendar, 
  Send, 
  FileSpreadsheet, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle,
  Clock,
  UserCheck
} from "lucide-react";
import { Center } from "../types";
import { mockAnalyticsData } from "../mockData";
import { getLocalizedCenterName, getLocalizedDrugName } from "../utils/translations";

interface AnalyticsProps {
  centers: Center[];
}

export default function Analytics({ centers }: AnalyticsProps) {
  const { language: globalLang, t } = useLanguage();
  const [centerTypeFilter, setCenterTypeFilter] = useState<"ALL" | "PHC" | "CHC">("ALL");
  const [stockStatusFilter, setStockStatusFilter] = useState<"ALL" | "LOW" | "NORMAL">("ALL");
  const [toastMsg, setToastMsg] = useState("");

  // Filter missing reports
  // In our centers list, PHC Delang is warning/critical with missing reports (last_report_days_ago > 1)
  const missingReportCenters = centers.filter((c) => c.last_report_days_ago > 0);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg("");
    }, 3000);
  };

  const handleSendReminder = (centerName: string) => {
    const localizedName = getLocalizedCenterName(centerName, globalLang);
    const text = globalLang === "hi" 
      ? `एसएमएस और एनएचएम एप्लेट के माध्यम से ${localizedName} चिकित्सा प्रभारी को चेतावनी भेजी गई! 📲`
      : globalLang === "or"
      ? `SMS ଏବଂ NHM ଆପ୍ଲେଟ୍ ମାଧ୍ୟମରେ ${localizedName} ଚିକିତ୍ସା ଅଧିକାରୀଙ୍କୁ ଚେତାବନୀ ପଠାଗଲା! 📲`
      : `Alert Dispatch sent to ${centerName} Medical In-Charge via SMS & NHM applet! 📲`;
    showToast(text);
  };

  return (
    <div className="space-y-6">
      
      {/* Analytics Page Title & Action Headers */}
      <div className="bg-white border-b border-slate-200 p-4 -mt-6 -mx-4 lg:-mx-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-display font-bold text-slate-800 flex items-center space-x-2">
            <TrendingUp className="w-5.5 h-5.5 text-[#1e3a5f]" />
            <span>{t("navAnalytics")} <span className="text-xs font-normal text-slate-500 font-sans">{globalLang === "hi" ? "| जिला स्वास्थ्य खुफिया विश्लेषिकी" : globalLang === "or" ? "| ଜିଲ୍ଲା ସ୍ୱାସ୍ଥ୍ୟ ସୂଚନା ବିଶ୍ଳେଷଣ" : "| District Intelligence Analytics"}</span></span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">{globalLang === "hi" ? "समेकट रसद रनवे, रोगी आवागमन समुच्चय और उपस्थिति सूची" : globalLang === "or" ? "ସମନ୍ୱିତ ଲଜିଷ୍ଟିକ୍ସ ରନ୍ୱେ, ରୋଗୀ ସଂଖ୍ୟା ଓ ଡ୍ୟୁଟି ରେକର୍ଡ" : "Consolidated logistics runways, patient registration aggregates, and duty logs"}</p>
        </div>
        <button 
          onClick={() => showToast(globalLang === "hi" ? "एचएमआईएस एक्सेल शीट में समेकित डेटा निर्यात किया जा रहा है... 📊" : globalLang === "or" ? "HMIS ଏକ୍ସେଲକୁ ତଥ୍ୟ ରପ୍ତାନି ଚାଲିଛି... 📊" : "Exporting consolidated dataset to HMIS Excel Sheet... 📊")}
          className="px-4 py-2 bg-[#1e3a5f] hover:bg-[#152943] text-white font-display text-xs font-bold rounded-lg shadow-sm hover:shadow-md transition flex items-center space-x-1.5"
        >
          <FileSpreadsheet className="w-4 h-4 text-white" />
          <span>{globalLang === "hi" ? "HMIS बहीखाता निर्यात करें" : globalLang === "or" ? "HMIS ଖାତା ରପ୍ତାନି କରନ୍ତୁ" : "Export HMIS Ledger"}</span>
        </button>
      </div>

      {/* FILTER CONTROL PANEL */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center space-x-2">
          <Filter className="w-4.5 h-4.5 text-slate-400" />
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{globalLang === "hi" ? "गतिशील विभाजन" : globalLang === "or" ? "ଗତିଶୀଳ ବିଭାଜନ" : "Dynamic Segmentation"}</span>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          {/* Date range picker (mock) */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>{globalLang === "hi" ? "पिछले ३० दिन (०७ जून - ०७ जुलाई २०२६)" : globalLang === "or" ? "ଶେଷ ୩୦ ଦିନ (୦୭ ଜୁନ୍ - ୦୭ ଜୁଲାଇ ୨୦୨୬)" : "Last 30 Days (07 Jun - 07 Jul 2026)"}</span>
          </div>

          {/* Center Type Segment */}
          <select 
            value={centerTypeFilter}
            onChange={(e: any) => setCenterTypeFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="ALL">{globalLang === "hi" ? "सभी सुविधा प्रकार (PHC और CHC)" : globalLang === "or" ? "ସମସ୍ତ ପ୍ରକାର କେନ୍ଦ୍ର (PHC ଓ CHC)" : "All Facility Types (PHC & CHC)"}</option>
            <option value="PHC">{globalLang === "hi" ? "केवल प्राथमिक स्वास्थ्य केंद्र (PHC)" : globalLang === "or" ? "କେବଳ ପ୍ରାଥମିକ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (PHC)" : "Primary Health Centers (PHC) Only"}</option>
            <option value="CHC">{globalLang === "hi" ? "केवल सामुदायिक स्वास्थ्य केंद्र (CHC)" : globalLang === "or" ? "କେବଳ ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC)" : "Community Health Centers (CHC) Only"}</option>
          </select>

          {/* Stock Filter */}
          <select 
            value={stockStatusFilter}
            onChange={(e: any) => setStockStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="ALL">{globalLang === "hi" ? "सभी आपूर्ति रनवे स्वास्थ्य" : globalLang === "or" ? "ସମସ୍ତ ଔଷଧ ମହଜୁଦ ସ୍ଥିତି" : "All Supply Runway Healths"}</option>
            <option value="LOW">{globalLang === "hi" ? "कम स्टॉक (७ दिन से कम)" : globalLang === "or" ? "ଅଳ୍ପ ମହଜୁଦ (୭ ଦିନରୁ କମ୍)" : "Low Stocks Under 7 Days"}</option>
            <option value="NORMAL">{globalLang === "hi" ? "पर्याप्त स्टॉक (७ दिन से अधिक)" : globalLang === "or" ? "ପର୍ଯ୍ୟାପ୍ତ ମହଜୁଦ (୭ ଦିନରୁ ଅଧିକ)" : "Adequate Stocks Above 7 Days"}</option>
          </select>
        </div>
      </div>

      {/* CHARTS PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart 1: Outpatient Patient Registrations over 30 days (Full-width equivalent layout) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm lg:col-span-3 space-y-4">
          <div>
            <h4 className="font-display font-bold text-slate-800 text-sm">
              {globalLang === "hi" ? "जिला स्तर पर रोगी पंजीकरण (ओपीडी पिछले ३० दिन)" : globalLang === "or" ? "ଜିଲ୍ଲା ସ୍ତରରେ ରୋଗୀ ପଞ୍ଜୀକରଣ (OPD ବିଗତ ୩୦ ଦିନ)" : "District-wide Patient Registrations (OPD Trailing 30 Days)"}
            </h4>
            <p className="text-xs text-slate-400">
              {globalLang === "hi" ? "पूरे जिले में दैनिक रूप से दर्ज किए गए कुल बाहरी रोगी" : globalLang === "or" ? "ଜିଲ୍ଲାରେ ଦୈନିକ ପଞ୍ଜୀକୃତ ବାହ୍ୟ ରୋଗୀ ସଂଖ୍ୟା" : "Total outpatient registrations calculated daily across the district grid"}
            </p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockAnalyticsData.footfall30Days}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip />
                <Line type="monotone" dataKey="patients" stroke="#1e3a5f" strokeWidth={3} activeDot={{ r: 6 }} name={globalLang === "hi" ? "कुल पंजीकृत बाहरी रोगी" : globalLang === "or" ? "ମୋଟ ପଞ୍ଜୀକୃତ ବାହ୍ୟ ରୋଗୀ" : "Total Outpatients Registered"} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Supply Runway Remaining Per Center */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 space-y-4">
          <div>
            <h4 className="font-display font-bold text-slate-800 text-sm">
              {globalLang === "hi" ? "दवा आरक्षित रनवे (शेष आपूर्ति के दिन)" : globalLang === "or" ? "ଔଷଧ ମହଜୁଦ ରନ୍ୱେ (ଅବଶିଷ୍ଟ ଦିନ ସଂଖ୍ୟା)" : "Drug Reserve Runway (Days of Supply Remaining)"}
            </h4>
            <p className="text-xs text-slate-400">
              {globalLang === "hi" ? "महत्वपूर्ण पीएचसी और सीएचसी के लिए तुलनात्मक दवा रनवे" : globalLang === "or" ? "ଗୁରୁତର PHC ଓ CHC ଗୁଡ଼ିକର ତୁଳନାତ୍ମକ ଔଷଧ ସ୍ଥିତି" : "Comparative medicine runways for critical PHCs and CHCs"}
            </p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockAnalyticsData.stockHealth} layout="vertical" barSize={10}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis dataKey="center" type="category" tick={{ fontSize: 10, fill: '#64748b' }} width={140} tickFormatter={(val) => getLocalizedCenterName(val, globalLang)} />
                <Tooltip formatter={(value) => [`${value} ${globalLang === "hi" ? "दिन" : globalLang === "or" ? "ଦିନ" : "days"}`]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Paracetamol" fill="#dc2626" radius={[0, 4, 4, 0]} name={globalLang === "hi" ? "पैरासिटामोल रनवे" : globalLang === "or" ? "ପାରାସିଟାମୋଲ ସ୍ଥିତି" : "Paracetamol Runway"} />
                <Bar dataKey="ORS" fill="#f97316" radius={[0, 4, 4, 0]} name={globalLang === "hi" ? "ओआरएस रनवे" : globalLang === "or" ? "ଓଆରଏସ ସ୍ଥିତି" : "ORS Runway"} />
                <Bar dataKey="Amoxicillin" fill="#1e3a5f" radius={[0, 4, 4, 0]} name={globalLang === "hi" ? "अमोक्सिसिलिन रनवे" : globalLang === "or" ? "ଆମୋକ୍ସିସିଲିନ ସ୍ଥିତି" : "Amoxicillin Runway"} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Doctor Attendance stacked bar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h4 className="font-display font-bold text-slate-800 text-sm">
              {globalLang === "hi" ? "कर्मचारी ड्यूटी उपस्थिति (पिछले ७ दिन)" : globalLang === "or" ? "କର୍ମଚାରୀ ଡ୍ୟୁଟି ଉପସ୍ଥିତି (ବିଗତ ୭ ଦିନ)" : "Staff Duty Attendance (Trailing 7 Days)"}
            </h4>
            <p className="text-xs text-slate-400">
              {globalLang === "hi" ? "विभिन्न केंद्रों पर दैनिक ड्यूटी रोस्टर उपस्थिति की तुलना" : globalLang === "or" ? "କେନ୍ଦ୍ରଗୁଡ଼ିକରେ ଦୈନିକ ଡ୍ୟୁଟି ଉପସ୍ଥିତିର ତୁଳନା" : "Daily duty roster presence comparison across centers"}
            </p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockAnalyticsData.attendanceRate}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis max={100} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip formatter={(value) => [`${value}%`]} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="PHC Bhubaneswar North" stackId="a" fill="#16a34a" name={globalLang === "hi" ? "भुवनेश्वर उ." : globalLang === "or" ? "ଭୁବନେଶ୍ୱର ଉ." : "Bhubaneswar N."} />
                <Bar dataKey="PHC Jatni" stackId="a" fill="#d97706" name={globalLang === "hi" ? "जटनी" : globalLang === "or" ? "ଜଟଣୀ" : "Jatni"} />
                <Bar dataKey="CHC Khordha" stackId="a" fill="#1e3a5f" name={globalLang === "hi" ? "खोर्धा" : globalLang === "or" ? "ଖୋର୍ଦ୍ଧା" : "Khordha"} />
                <Bar dataKey="CHC Balugaon" stackId="a" fill="#dc2626" name={globalLang === "hi" ? "बालूगांव" : globalLang === "or" ? "ବାଲୁଗାଁ" : "Balugaon"} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* MISSING REPORTS DELINQUENCY REGISTER */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-red-50/20 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="text-red-600 w-5 h-5 flex-shrink-0" />
            <div>
              <h4 className="font-display font-bold text-slate-800 text-sm">
                {globalLang === "hi" ? "HMIS टेलीमेट्री रिपोर्ट अनुपस्थिति बहीखाता" : globalLang === "or" ? "HMIS ଟେଲିମେଟ୍ରି ବିଳମ୍ବ ଖାତା" : "HMIS Telemetry Delinquency Ledger"}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                {globalLang === "hi" ? "वे सुविधाएं जिन्होंने आज स्वास्थ्य रिपोर्टों को सिंक्रनाइज़ नहीं किया है" : globalLang === "or" ? "ଯେଉଁ କେନ୍ଦ୍ରଗୁଡ଼ିକ ଆଜି ସ୍ୱାସ୍ଥ୍ୟ ରିପୋର୍ଟ ସିଙ୍କ୍ରୋନାଇଜ୍ କରିନାହାଁନ୍ତି" : "Facilities that have not synchronized health reports today"}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-red-700 bg-red-100 px-3 py-1 rounded-full">
            {missingReportCenters.length} {globalLang === "hi" ? "लंबित कार्रवाई" : globalLang === "or" ? "ପଡ଼ିରହିଥିବା କାର୍ଯ୍ୟ" : "Pending Actions"}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <th className="py-3 px-4">{globalLang === "hi" ? "केंद्र का नाम" : globalLang === "or" ? "କେନ୍ଦ୍ରର ନାମ" : "Center Name"}</th>
                <th className="py-3 px-4">{globalLang === "hi" ? "सुविधा प्रकार" : globalLang === "or" ? "କେନ୍ଦ୍ର ପ୍ରକାର" : "Facility Type"}</th>
                <th className="py-3 px-4">{globalLang === "hi" ? "प्रभारी चिकित्सा अधिकारी" : globalLang === "or" ? "ଦାୟିତ୍ୱରେ ଥିବା ଚିକିତ୍ସା ଅଧିକାରୀ" : "In-Charge Medical Officer"}</th>
                <th className="py-3 px-4 text-red-600">{globalLang === "hi" ? "अंतिम अद्यतन से दिन" : globalLang === "or" ? "ଶେଷ ଅପଡେଟ୍ ଠାରୁ ଦିନ" : "Days Since Last Update"}</th>
                <th className="py-3 px-4">{globalLang === "hi" ? "अंतिम रिपोर्ट का समय" : globalLang === "or" ? "ଶେଷ ରିପୋର୍ଟ ସମୟ" : "Last Reported Timestamp"}</th>
                <th className="py-3 px-4 text-right">{globalLang === "hi" ? "ड्यूटी कार्रवाई निर्देश" : globalLang === "or" ? "ଡ୍ୟୁଟି କାର୍ଯ୍ୟାନୁଷ୍ଠାନ" : "Duty Action Directive"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {missingReportCenters.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-green-600 font-bold">
                    ✅ {globalLang === "hi" ? "उत्कृष्ट स्थिति! सभी केंद्रों ने आज रिपोर्टें सिंक्रनाइज़ की हैं।" : globalLang === "or" ? "ଉତ୍କୃଷ୍ଟ ସ୍ଥିତି! ସମସ୍ତ କେନ୍ଦ୍ର ଆଜି ସିଙ୍କ୍ରୋନାଇଜ୍ କରିଛନ୍ତି।" : "Excellent standing! All centers have synchronized telemetry registers today."}
                  </td>
                </tr>
              ) : (
                missingReportCenters.map((center) => (
                  <tr key={center.id} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{getLocalizedCenterName(center.name, globalLang)}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-500">{center.type}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">{center.doctor_name || (globalLang === "hi" ? "अनिर्धारित" : globalLang === "or" ? "ଅପରିଭାଷିତ" : "Unassigned")}</td>
                    <td className="py-3.5 px-4 font-bold text-red-600 font-mono text-sm">
                      {center.last_report_days_ago} {globalLang === "hi" ? "दिन विलंब" : globalLang === "or" ? "ଦିନ ବିଳମ୍ବ" : "days delayed"}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono">{center.last_report_time}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleSendReminder(center.name)}
                        className="px-3 py-1.5 bg-[#f97316] hover:bg-orange-600 text-white rounded font-display text-[10px] font-bold shadow-xs hover:shadow-sm transition inline-flex items-center space-x-1"
                      >
                        <Send className="w-3 h-3 text-white" />
                        <span>{globalLang === "hi" ? "चेतावनी एसएमएस भेजें" : globalLang === "or" ? "ଚେତାବନୀ SMS ପଠାନ୍ତୁ" : "Send Reminder SMS"}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TOAST PANEL */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-[#1e3a5f] text-white px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-2">
          <Clock className="w-5 h-5 text-[#f97316] animate-pulse" />
          <span className="text-xs font-bold font-display">{toastMsg}</span>
        </div>
      )}

    </div>
  );
}
