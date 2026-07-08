import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Center } from "../types";

interface DistrictMapProps {
  centers: Center[];
  onSelectCenter?: (id: string) => void;
}

export default function DistrictMap({ centers, onSelectCenter }: DistrictMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Centered around Khordha District, Odisha (approx 20.15, 85.65)
    const map = L.map(mapContainerRef.current, {
      center: [20.15, 85.65],
      zoom: 10,
      zoomControl: true,
      attributionControl: true
    });

    // Add OpenStreetMap tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Add custom Map Legend
    const legend = new L.Control({ position: "bottomleft" });
    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "info legend p-3 bg-white/95 backdrop-blur-xs rounded-lg shadow-md text-xs border border-slate-200/80 space-y-2");
      div.innerHTML = `
        <h4 class="font-semibold text-slate-800 border-b pb-1 mb-1 font-display">Center Status</h4>
        <div class="flex items-center space-x-2">
          <span class="inline-block w-3.5 h-3.5 rounded-full bg-red-600 border border-white shadow-xs animate-pulse"></span>
          <span class="text-slate-600 font-medium">Critical Alert (क्रिटिकल)</span>
        </div>
        <div class="flex items-center space-x-2">
          <span class="inline-block w-3.5 h-3.5 rounded-full bg-amber-500 border border-white shadow-xs"></span>
          <span class="text-slate-600 font-medium">Warning (चेतावनी)</span>
        </div>
        <div class="flex items-center space-x-2">
          <span class="inline-block w-3.5 h-3.5 rounded-full bg-green-500 border border-white shadow-xs"></span>
          <span class="text-slate-600 font-medium">Good Standing (सामान्य)</span>
        </div>
      `;
      return div;
    };
    legend.addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerGroupRef.current = layerGroup;
    setMapLoaded(true);

    // Force map size refresh after rendering
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  // Update Markers when Centers list updates
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !layerGroupRef.current) return;

    // Clear existing markers
    layerGroupRef.current.clearLayers();

    centers.forEach((center) => {
      let iconClass = "marker-green";
      let size = 16;
      let anchor = 8;

      if (center.status === "CRITICAL") {
        iconClass = "pulsing-marker-red";
        size = 22;
        anchor = 11;
      } else if (center.status === "WARNING") {
        iconClass = "marker-amber";
        size = 18;
        anchor = 9;
      }

      const customIcon = L.divIcon({
        className: iconClass,
        iconSize: [size, size],
        iconAnchor: [anchor, anchor]
      });

      const popupContent = `
        <div class="space-y-2 text-slate-800">
          <div class="flex items-center justify-between border-b pb-1 gap-2">
            <h4 class="font-bold font-display text-sm text-slate-900">${center.name}</h4>
            <span class="px-1.5 py-0.5 text-[10px] font-bold tracking-wide rounded ${
              center.status === "CRITICAL"
                ? "bg-red-100 text-red-800"
                : center.status === "WARNING"
                ? "bg-amber-100 text-amber-800"
                : "bg-green-100 text-green-800"
            }">${center.status}</span>
          </div>
          <p class="text-xs text-slate-500">Type: <span class="font-semibold text-slate-700">${center.type}</span></p>
          <div class="grid grid-cols-2 gap-1 text-[11px] bg-slate-50 p-1.5 rounded border border-slate-100">
            <div>
              <p class="text-slate-400 font-medium">Beds Occupied</p>
              <p class="font-bold text-slate-700">${center.beds_occupied}/${center.beds_total}</p>
            </div>
            <div>
              <p class="text-slate-400 font-medium">Doctor Status</p>
              <p class="font-bold ${center.doctor_present ? "text-green-600" : "text-red-500"}">${
                center.doctor_present ? "✅ Present" : "❌ Absent"
              }</p>
            </div>
          </div>
          ${
            center.alertMessage
              ? `<p class="text-[11px] text-red-600 bg-red-50 p-1 rounded font-medium">⚠️ ${center.alertMessage}</p>`
              : ""
          }
          <div class="pt-1">
            <a href="#/center/${center.id}" class="block w-full text-center bg-[#1e3a5f] hover:bg-[#152943] text-white text-[11px] font-semibold py-1.5 rounded shadow-sm transition duration-150">
              View Full Details
            </a>
          </div>
        </div>
      `;

      L.marker([center.lat, center.lng], { icon: customIcon })
        .bindPopup(popupContent, { maxWidth: 220 })
        .addTo(layerGroupRef.current!);
    });
  }, [centers, mapLoaded]);

  return (
    <div className="relative w-full h-full min-h-[400px] lg:min-h-[500px] rounded-xl overflow-hidden border border-slate-200 shadow-md">
      {!mapLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 z-10 space-y-4">
          <div className="w-10 h-10 border-4 border-[#1e3a5f] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-500 font-display">Initializing Leaflet OpenStreetMap...</p>
        </div>
      )}
      <div ref={mapContainerRef} className="w-full h-full z-0" />
    </div>
  );
}
