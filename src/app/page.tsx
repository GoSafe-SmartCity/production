"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { toast, Toaster } from "sonner";
import Script from "next/script";
import {
  MapPin, AlertTriangle, Navigation, Award, Sliders, User,
  Calendar, Users, CheckCircle, XCircle, Plus, Loader2,
  Upload, Info, Bell, Shield, ArrowDown, Map, Compass, HardHat, Eye, Brain, ThumbsUp, ThumbsDown
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ModulesSection } from "@/components/modules-section";
import { GridPattern } from "@/components/ui/grid-pattern";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";
import { DotPattern } from "@/components/ui/dot-pattern";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { AuroraText } from "@/components/ui/aurora-text";
import { HomeDemoMap } from "@/components/pages/home/home-demo-map";

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

if (typeof window !== "undefined") {
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const msg = args.join(" ");
    if (
      msg.includes('trees') || 
      msg.includes('poi-tree') || 
      msg.includes('café') || 
      msg.includes('map.addImage')
    ) {
      return;
    }
    originalConsoleError.apply(console, args);
  };
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const [activeAdminSubTab, setActiveAdminSubTab] = useState<"reports" | "hazards" | "vouchers" | "consent">("reports");
  const [points, setPoints] = useState(0);
  const [consent, setConsent] = useState(false);

  // Map & Navigation States
  const [mapLoaded, setMapLoaded] = useState(false);
  const [map, setMap] = useState<any>(null);
  const [mapHero, setMapHero] = useState<any>(null);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navSessionId, setNavSessionId] = useState<string | null>(null);
  const [navStep, setNavStep] = useState<"idle" | "routing" | "active">("idle");
  const [navPoints, setNavPoints] = useState<{ lat: number; lng: number }[]>([]);

  // Start Autocomplete & Proposed Search States
  const [startCoords, setStartCoords] = useState<{ lat: number; lng: number }>({ lat: 10.8782, lng: 106.8008 });
  const [startQuery, setStartQuery] = useState("Vị trí hiện tại (GPS)");
  const [startSuggestions, setStartSuggestions] = useState<any[]>([]);
  const skipStartQueryRef = useRef(false);

  // Destination Autocomplete Search States
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destQuery, setDestQuery] = useState("");
  const [destSuggestions, setDestSuggestions] = useState<any[]>([]);
  const skipDestQueryRef = useRef(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  // Telemetry Widget State
  const [weather, setWeather] = useState<any>(null);

  // Bottom Tab State
  const [activeTab, setActiveTab] = useState<"home" | "navigation" | "redeem" | "profile">("home");

  // Geolocation & Flooded Street States (Focused on Đại học Quốc tế VNU-HCM in Thủ Đức)
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>({ lat: 10.8782, lng: 106.8008 });

  // Fallback: coordinates of Marie Curie street
  const [floodedStreetCoords, setFloodedStreetCoords] = useState<[number, number][]>([]);
  const [alternativeStreetCoords, setAlternativeStreetCoords] = useState<[number, number][]>([]);
  const dbBlockedLayersRef = useRef<string[]>([]);

  // Decode Goong polyline helper
  const decodePolyline = useCallback((encoded: string) => {
    const points: [number, number][] = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.push([lng / 1e5, lat / 1e5]);
    }
    return points;
  }, []);

  // Fetch real geolocation GPS coordinates on load
  useEffect(() => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserCoords(coords);
          setStartCoords(coords);

          // Reverse geocode starting position to a real address name using Goong API
          const apiKey = process.env.NEXT_PUBLIC_GOONG_API_KEY || "2X3t5rZDLQiFHgLAdeGC8tkz2RZdTwfwMDtyFYSm";
          skipStartQueryRef.current = true;
          fetch(`https://rsapi.goong.io/Geocode?api_key=${apiKey}&latlng=${coords.lat},${coords.lng}`)
            .then(res => res.json())
            .then(data => {
              const address = data.results?.[0]?.formatted_address;
              if (address) {
                setStartQuery(address);
              } else {
                setStartQuery(`Vị trí định vị GPS (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
              }
            })
            .catch(() => {
              setStartQuery(`Vị trí định vị GPS (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
            });
        },
        (error) => {
          console.warn("Geolocation access denied. Using fallback VNU-HCM coordinates.", error);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  // Autocomplete Suggestions for Starting Location
  useEffect(() => {
    if (skipStartQueryRef.current) {
      setStartSuggestions([]);
      return;
    }
    if (!startQuery || startQuery === "Vị trí hiện tại (GPS)" || startQuery.startsWith("Vị trí định vị GPS") || startQuery.length < 2) {
      setStartSuggestions([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GOONG_API_KEY || "2X3t5rZDLQiFHgLAdeGC8tkz2RZdTwfwMDtyFYSm";
        const res = await fetch(
          `https://rsapi.goong.io/Place/AutoComplete?api_key=${apiKey}&input=${encodeURIComponent(startQuery)}&location=${userCoords.lat},${userCoords.lng}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.predictions) {
            setStartSuggestions(data.predictions);
          }
        }
      } catch (e) {
        console.error("Autocomplete starting fetch failed:", e);
      }
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [startQuery, userCoords]);

  // Autocomplete Suggestions for Destination Location
  useEffect(() => {
    if (skipDestQueryRef.current) {
      setDestSuggestions([]);
      return;
    }
    if (!destQuery || destQuery.length < 2) {
      setDestSuggestions([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GOONG_API_KEY || "2X3t5rZDLQiFHgLAdeGC8tkz2RZdTwfwMDtyFYSm";
        const res = await fetch(
          `https://rsapi.goong.io/Place/AutoComplete?api_key=${apiKey}&input=${encodeURIComponent(destQuery)}&location=${userCoords.lat},${userCoords.lng}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.predictions) {
            setDestSuggestions(data.predictions);
          }
        }
      } catch (e) {
        console.error("Autocomplete destination fetch failed:", e);
      }
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [destQuery, userCoords]);

  const handleSelectStartSuggestion = async (suggestion: any) => {
    skipStartQueryRef.current = true;
    setStartQuery(suggestion.description);
    setStartSuggestions([]);
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOONG_API_KEY || "2X3t5rZDLQiFHgLAdeGC8tkz2RZdTwfwMDtyFYSm";
      const res = await fetch(`https://rsapi.goong.io/Place/Detail?api_key=${apiKey}&place_id=${suggestion.place_id}`);
      if (res.ok) {
        const data = await res.json();
        const loc = data.result?.geometry?.location;
        if (loc) {
          setStartCoords({ lat: loc.lat, lng: loc.lng });
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Không thể lấy toạ độ khởi hành.");
    }
  };

  const handleSelectDestSuggestion = async (suggestion: any) => {
    skipDestQueryRef.current = true;
    setDestQuery(suggestion.description);
    setDestSuggestions([]);
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOONG_API_KEY || "2X3t5rZDLQiFHgLAdeGC8tkz2RZdTwfwMDtyFYSm";
      const res = await fetch(`https://rsapi.goong.io/Place/Detail?api_key=${apiKey}&place_id=${suggestion.place_id}`);
      if (res.ok) {
        const data = await res.json();
        const loc = data.result?.geometry?.location;
        if (loc) {
          setDestCoords({ lat: loc.lat, lng: loc.lng });
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Không thể lấy toạ độ điểm đến.");
    }
  };

  // Update map centers when userCoords changes
  useEffect(() => {
    if (map && userCoords) {
      map.setCenter([userCoords.lng, userCoords.lat]);
    }
    if (mapHero && userCoords) {
      mapHero.setCenter([userCoords.lng, userCoords.lat]);
    }
  }, [map, mapHero, userCoords]);

  // Draw flooded street & safe alternative path section on map
  const drawFloodedStreet = useCallback((mapInstance: any, primaryCoords: [number, number][], altCoords: [number, number][], currentNavStep: string, tab: string, incidentsList: any[] = []) => {
    if (!mapInstance) return;

    const sourceId = "flooded-street-source";
    const layerId = "flooded-street-layer";
    const altSourceId = "alt-street-source";
    const altLayerId = "alt-street-layer";
    const traveledSourceId = "traveled-street-source";
    const traveledLayerId = "traveled-street-layer";

    try {
      // 1. Clean up previous layers
      if (mapInstance.getLayer(layerId)) mapInstance.removeLayer(layerId);
      if (mapInstance.getSource(sourceId)) mapInstance.removeSource(sourceId);
      if (mapInstance.getLayer(altLayerId)) mapInstance.removeLayer(altLayerId);
      if (mapInstance.getSource(altSourceId)) mapInstance.removeSource(altSourceId);
      if (mapInstance.getLayer(traveledLayerId)) mapInstance.removeLayer(traveledLayerId);
      if (mapInstance.getSource(traveledSourceId)) mapInstance.removeSource(traveledSourceId);

      // Clean up previous database incident layers
      dbBlockedLayersRef.current.forEach(id => {
        if (mapInstance.getLayer(id)) mapInstance.removeLayer(id);
        if (mapInstance.getSource(id)) mapInstance.removeSource(id);
      });
      dbBlockedLayersRef.current = [];

      // 2. Clean up previous markers & animations
      if (floodPopupRef.current) {
        floodPopupRef.current.remove();
        floodPopupRef.current = null;
      }
      if (bikeMarkerRef.current) {
        bikeMarkerRef.current.remove();
        bikeMarkerRef.current = null;
      }
      if (endMarkerRef.current) {
        endMarkerRef.current.remove();
        endMarkerRef.current = null;
      }
      if (animatedDotRef.current) {
        animatedDotRef.current.remove();
        animatedDotRef.current = null;
      }
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }
      if (mapInstanceRef.current) {
        if (moveStartHandlerRef.current) {
          mapInstanceRef.current.off("movestart", moveStartHandlerRef.current);
          moveStartHandlerRef.current = null;
        }
        if (moveEndHandlerRef.current) {
          mapInstanceRef.current.off("moveend", moveEndHandlerRef.current);
          moveEndHandlerRef.current = null;
        }
      }
      mapInstanceRef.current = mapInstance;

      // @ts-ignore
      const goongjs = window.goongjs;
      if (!goongjs) return;

      if (altCoords.length === 0) return;

      // Draw all active database incidents' blocked road segments in red on Map tab
      if (tab === "navigation") {
        incidentsList.forEach(inc => {
          if ((inc.status === "ACTIVE" || inc.status === "APPROVED") && inc.streetCoords) {
            try {
              const coords = JSON.parse(inc.streetCoords);
              const srcId = `db-blocked-src-${inc.id}`;
              const lyrId = `db-blocked-lyr-${inc.id}`;
              
              if (mapInstance.getSource(srcId)) return;

              mapInstance.addSource(srcId, {
                type: "geojson",
                data: {
                  type: "Feature",
                  properties: {},
                  geometry: {
                    type: "LineString",
                    coordinates: coords
                  }
                }
              });

              mapInstance.addLayer({
                id: lyrId,
                type: "line",
                source: srcId,
                layout: { "line-join": "round", "line-cap": "round" },
                paint: {
                  "line-color": "#ef4444",
                  "line-width": 8,
                  "line-opacity": 0.75
                }
              });

              dbBlockedLayersRef.current.push(lyrId);
            } catch (e) {}
          }
        });
      }

      // 3. Add Primary Flooded Route (Red line, width 12) - Only if blocked coords exist
      if (primaryCoords.length > 1) {
        mapInstance.addSource(sourceId, {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: primaryCoords
            }
          }
        });

        mapInstance.addLayer({
          id: layerId,
          type: "line",
          source: sourceId,
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": "#ef4444",
            "line-width": 12,
            "line-opacity": 0.85
          }
        });

        // Warn popup on the primary route (at the middle coord)
        const midIdx = Math.floor(primaryCoords.length / 2);
        const midCoord = primaryCoords[midIdx] || [106.8005, 10.8778];

        const popup = new goongjs.Popup({
          closeButton: false,
          closeOnClick: false,
          className: "custom-popup"
        })
          .setLngLat(midCoord)
          .setHTML(
            tab === "home"
              ? `
                <div class="flex items-center p-0.5 font-bold">
                  <span class="font-extrabold text-sm sm:text-base md:text-lg text-neutral-900 dark:text-neutral-100 tracking-normal leading-relaxed font-inter">
                    Đoạn đường <span class="text-red-500 font-black">Marie Curie</span> sắp ngập trong <span class="text-yellow-600 dark:text-yellow-400 font-black font-semibold">10 phút</span> tới
                  </span>
                </div>
              `
              : `
                <div class="flex items-center p-0.5 font-bold">
                  <span class="font-extrabold text-xs text-neutral-900 dark:text-neutral-100 tracking-normal leading-relaxed">
                    🔴 Road blocked. GoSafe automated detour routing active.
                  </span>
                </div>
              `
          )
          .addTo(mapInstance);

        floodPopupRef.current = popup;
      }

      // 4. Add Alternative Safe Route (Green line, width 12)
      mapInstance.addSource(altSourceId, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: altCoords
          }
        }
      });

      mapInstance.addLayer({
        id: altLayerId,
        type: "line",
        source: altSourceId,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#00a850",
          "line-width": 12,
          "line-opacity": 0.85
        }
      });

      // 5. Add Traveled Route Layer (Gray line, width 12)
      mapInstance.addSource(traveledSourceId, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [altCoords[0], altCoords[1]]
          }
        }
      });

      mapInstance.addLayer({
        id: traveledLayerId,
        type: "line",
        source: traveledSourceId,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#9ca3af",
          "line-width": 12,
          "line-opacity": 0.95
        }
      });

      // 6. Pin markers: Bike for Start, Red Pin for End
      const startCoord = altCoords[0];
      const bikeEl = document.createElement("div");
      bikeEl.className = "p-1.5 bg-[#00a850] text-white rounded-full shadow-2xl border-2 border-white animate-bounce-subtle cursor-pointer";
      bikeEl.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/>
          <circle cx="15" cy="5" r="1"/>
          <path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
        </svg>
      `;
      const bikeMarker = new goongjs.Marker(bikeEl)
        .setLngLat(startCoord)
        .addTo(mapInstance);
      bikeMarkerRef.current = bikeMarker;

      const endCoord = altCoords[altCoords.length - 1];
      const pinEl = document.createElement("div");
      pinEl.className = "p-1.5 bg-red-500 text-white rounded-full shadow-2xl border-2 border-white cursor-pointer";
      pinEl.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
        </svg>
      `;
      const endMarker = new goongjs.Marker(pinEl)
        .setLngLat(endCoord)
        .addTo(mapInstance);
      endMarkerRef.current = endMarker;

      // Only run arrow animation and camera bearing updates when the navigation is actively started
      if (currentNavStep !== "active") {
        return;
      }

      // Interpolate points for super smooth line following
      const interpolateCoords = (coords: [number, number][], stepsPerSegment: number = 8) => {
        const result: [number, number][] = [];
        for (let i = 0; i < coords.length - 1; i++) {
          const start = coords[i];
          const end = coords[i + 1];
          if (!start || !end) continue;
          for (let step = 0; step < stepsPerSegment; step++) {
            const alpha = step / stepsPerSegment;
            const lng = start[0] + (end[0] - start[0]) * alpha;
            const lat = start[1] + (end[1] - start[1]) * alpha;
            result.push([lng, lat]);
          }
        }
        result.push(coords[coords.length - 1]);
        return result;
      };

      const sparseAltCoords = interpolateCoords(altCoords, 3);

      // 7. Play Route Flow Animation (Moving Navigation Arrow with Gray Traveled Segment)
      let activeIdx = 0;
      const arrowEl = document.createElement("div");
      arrowEl.innerHTML = `
        <div class="arrow-inner" style="transition: transform 0.22s ease-out; transform: rotate(0deg); will-change: transform;">
          <div class="flex items-center justify-center p-1 bg-white rounded-full shadow-xl border-2 border-[#00a850]">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#00a850" stroke="white" stroke-width="1.5" stroke-linejoin="round">
              <polygon points="3 11 22 2 13 21 11 13 3 11"/>
            </svg>
          </div>
        </div>
      `;

      const travelerMarker = new goongjs.Marker(arrowEl)
        .setLngLat(startCoord)
        .addTo(mapInstance);
      animatedDotRef.current = travelerMarker;

      const markerContainer = travelerMarker.getElement();
      if (markerContainer) {
        markerContainer.style.transition = "transform 0.24s linear";
      }

      const handleMoveStart = () => {
        const el = travelerMarker.getElement();
        if (el) el.style.transition = "none";
      };
      const handleMoveEnd = () => {
        const el = travelerMarker.getElement();
        if (el) el.style.transition = "transform 0.24s linear";
      };

      mapInstance.on("movestart", handleMoveStart);
      mapInstance.on("moveend", handleMoveEnd);

      moveStartHandlerRef.current = handleMoveStart;
      moveEndHandlerRef.current = handleMoveEnd;

      const getBearing = (from: [number, number], to: [number, number]) => {
        const lat1 = from[1] * Math.PI / 180;
        const lat2 = to[1] * Math.PI / 180;
        const lon1 = from[0] * Math.PI / 180;
        const lon2 = to[0] * Math.PI / 180;
        const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
        const bearing = Math.atan2(y, x) * 180 / Math.PI;
        return (bearing + 360) % 360;
      };

      animationIntervalRef.current = setInterval(() => {
        const prevIdx = activeIdx;
        activeIdx = activeIdx + 1;

        if (activeIdx >= sparseAltCoords.length) {
          if (tab === "home") {
            activeIdx = 0;
          } else {
            clearInterval(animationIntervalRef.current);
            animationIntervalRef.current = null;
            // Reached destination! Prompt user for feedback immediately
            setIsFeedbackOpen(true);
            return;
          }
        }

        const currentPos = sparseAltCoords[activeIdx];
        const prevPos = sparseAltCoords[prevIdx];

        if (!currentPos) return;

        // Update Position
        travelerMarker.setLngLat(currentPos);

        // Update Rotation (Bearing) on the inner rotated element
        const innerEl = arrowEl.querySelector(".arrow-inner") as HTMLElement;
        let heading = 0;
        if (innerEl && prevPos && currentPos) {
          heading = getBearing(prevPos, currentPos);
          innerEl.style.transform = `rotate(${heading - 45}deg)`;
        }

        // UPDATE CAMERA (First Person Google Map View)
        if (mapInstance && currentPos && prevPos) {
          mapInstance.easeTo({
            center: currentPos,
            bearing: heading,
            pitch: 65,
            zoom: 18.5,
            duration: 220,
            easing: (t: number) => t
          });
        }

        // Update Traveled Gray segment
        const traveledSegment = sparseAltCoords.slice(0, activeIdx + 1);
        if (traveledSegment.length >= 2) {
          const src = mapInstance.getSource(traveledSourceId);
          if (src) {
            src.setData({
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: traveledSegment
              }
            });
          }
        }
      }, 240);

    } catch (e) {
      console.warn("Failed to draw flooded street layer: ", e);
    }
  }, []);



  useEffect(() => {
    if (map && activeTab === "navigation") {
      if (map.isStyleLoaded()) {
        drawFloodedStreet(map, floodedStreetCoords, alternativeStreetCoords, navStep, activeTab, incidents);
      } else {
        map.once("style.load", () => {
          drawFloodedStreet(map, floodedStreetCoords, alternativeStreetCoords, navStep, activeTab, incidents);
        });
      }
    }
  }, [map, floodedStreetCoords, alternativeStreetCoords, navStep, activeTab, incidents, drawFloodedStreet]);

  // Report Modal States
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState("FLOODING");
  const [reportDesc, setReportDesc] = useState("");
  const [reportImage, setReportImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [reportLocation, setReportLocation] = useState({ lat: 10.8507, lng: 106.7719 });

  // Admin States
  const [pendingReports, setPendingReports] = useState<any[]>([]);
  const [adminIncidents, setAdminIncidents] = useState<any[]>([]);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [claimedVouchers, setClaimedVouchers] = useState<any[]>([]);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [activeApproveReport, setActiveApproveReport] = useState<any | null>(null);
  const [approveLocationName, setApproveLocationName] = useState("");
  const [approveAiResult, setApproveAiResult] = useState<any | null>(null);

  // Admin Filters State
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterRiskLevel, setFilterRiskLevel] = useState("ALL");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  // Admin Add Voucher State
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherTitle, setVoucherTitle] = useState("");
  const [voucherDesc, setVoucherDesc] = useState("");
  const [voucherPoints, setVoucherPoints] = useState(50);
  const [voucherQty, setVoucherQty] = useState(10);

  // Alert Broadcast State
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");

  // Marker reference list to clear markers dynamically
  const markersRef = useRef<any[]>([]);
  const heroMarkersRef = useRef<any[]>([]);
  const navRouteLayerRef = useRef<boolean>(false);
  const floodPopupRef = useRef<any>(null);
  const bikeMarkerRef = useRef<any>(null);
  const endMarkerRef = useRef<any>(null);
  const animatedDotRef = useRef<any>(null);
  const animationIntervalRef = useRef<any>(null);
  const moveStartHandlerRef = useRef<any>(null);
  const moveEndHandlerRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);

  const homeFloodPopupRef = useRef<any>(null);
  const homeBikeMarkerRef = useRef<any>(null);
  const homeEndMarkerRef = useRef<any>(null);
  const homeAnimatedDotRef = useRef<any>(null);
  const homeAnimationIntervalRef = useRef<any>(null);
  const homeMoveStartHandlerRef = useRef<any>(null);
  const homeMoveEndHandlerRef = useRef<any>(null);
  const homeMapInstanceRef = useRef<any>(null);

  // Fetch current user points and consent
  const fetchUserProfile = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch("/api/users/consent");
      if (res.ok) {
        const users = await res.json();
        const currentUser = users.find((u: any) => u.id === session.user.id);
        if (currentUser) {
          setPoints(currentUser.points);
          setConsent(currentUser.consent);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [session]);

  // Fetch incidents list
  const fetchIncidents = useCallback(async () => {
    try {
      const res = await fetch("/api/incidents");
      if (res.ok) {
        const data = await res.json();
        setIncidents(data);
        setAdminIncidents(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Fetch pending reports for admin
  const fetchPendingReports = useCallback(async () => {
    if (session?.user?.role !== "ADMIN") return;
    try {
      const res = await fetch("/api/incidents?mode=reports&status=PENDING");
      if (res.ok) {
        const data = await res.json();
        setPendingReports(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, [session]);

  // Fetch users for admin
  const fetchAdminUsers = useCallback(async () => {
    if (session?.user?.role !== "ADMIN") return;
    try {
      const res = await fetch("/api/users/consent");
      if (res.ok) {
        const data = await res.json();
        setAdminUsers(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, [session]);

  // Fetch Vouchers catalog
  const fetchVouchers = useCallback(async () => {
    try {
      const res = await fetch("/api/vouchers");
      if (res.ok) {
        const data = await res.json();
        setVouchers(data);
      }

      if (session) {
        const resEx = await fetch("/api/vouchers/exchange");
        if (resEx.ok) {
          const dataEx = await resEx.json();
          setClaimedVouchers(dataEx);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [session]);

  // Sync Weather Telemetry
  const fetchWeather = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(`/api/weather?lat=${lat}&lng=${lng}`);
      if (res.ok) {
        const data = await res.json();
        setWeather(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Poll for Admin broadcasts/notifications
  useEffect(() => {
    if (!session) return;
    let lastPollTime = Date.now();
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "poll", since: new Date(lastPollTime).toISOString() }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.alerts && data.alerts.length > 0) {
            data.alerts.forEach((alert: any) => {
              toast.error(`${alert.title}: ${alert.message}`, {
                icon: <Bell className="text-red-500 animate-bounce" />,
                duration: 6000,
              });
            });
            lastPollTime = Date.now();
          }
        }
      } catch (e) {
        console.log(e);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [session]);

  // Load all initial data on session load
  useEffect(() => {
    fetchIncidents();
    fetchVouchers();
    if (session) {
      fetchUserProfile();
      if (session.user?.role === "ADMIN") {
        fetchPendingReports();
        fetchAdminUsers();
      }
    }
  }, [session, fetchUserProfile, fetchIncidents, fetchPendingReports, fetchAdminUsers, fetchVouchers]);

  // Weather query based on map center coords
  useEffect(() => {
    if (mapLoaded && map) {
      const updateWeather = () => {
        const center = map.getCenter();
        fetchWeather(center.lat, center.lng);
      };

      updateWeather();
      map.on("dragend", updateWeather);
      return () => {
        map.off("dragend", updateWeather);
      };
    }
  }, [mapLoaded, map, fetchWeather]);

  // Initializing Goong Map
  useEffect(() => {
    if (mapLoaded && typeof window !== "undefined") {
      // @ts-ignore
      const goongjs = window.goongjs;
      if (!goongjs) return;

      const tilesKey = process.env.NEXT_PUBLIC_GOONG_MAP_KEY || "hkBRTOlzhKDE79Z6WGwQCgI9MTgsGXyUNC7jS8i3";
      goongjs.accessToken = tilesKey;

      if (!map && document.getElementById("goong-map-nav")) {
        const mapInstance = new goongjs.Map({
          container: "goong-map-nav",
          style: "https://tiles.goong.io/assets/goong_map_web.json",
          center: [106.8008, 10.8782],
          zoom: 16.03,
          pitch: 55,
          bearing: -15,
        });

        mapInstance.on("load", () => {
          setMap(mapInstance);
        });

        mapInstance.on("click", (e: any) => {
          setReportLocation({ lat: e.lngLat.lat, lng: e.lngLat.lng });
        });
      }

      if (!mapHero && document.getElementById("goong-map-hero")) {
        const mapHeroInstance = new goongjs.Map({
          container: "goong-map-hero",
          style: "https://tiles.goong.io/assets/goong_map_web.json",
          center: [106.7719, 10.8507],
          zoom: 14.5,
          interactive: false,
        });

        mapHeroInstance.on("load", () => {
          setMapHero(mapHeroInstance);
        });
      }
    }
  }, [mapLoaded, map, mapHero]);

  // Map resize handler on activeTab changes
  useEffect(() => {
    if (activeTab === "navigation" && map) {
      const timer = setTimeout(() => {
        map.resize();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [activeTab, map]);

  // Render Markers on Map
  const renderMarkers = useCallback(() => {
    if (!map) return;
    // @ts-ignore
    const goongjs = window.goongjs;
    if (!goongjs) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    heroMarkersRef.current.forEach(m => m.remove());
    heroMarkersRef.current = [];

    // Draw active incidents as markers
    incidents.forEach(inc => {
      if (inc.status === "ACTIVE" || inc.status === "APPROVED") {
        let color = "#ef4444"; // Red for blockages
        if (inc.riskLevel === "MEDIUM") color = "#f97316";
        else if (inc.riskLevel === "LOW") color = "#3b82f6";

        const el = document.createElement("div");
        el.className = "cursor-pointer hover:scale-110 transition-transform";
        el.innerHTML = `
          <div style="width:34px;height:34px;border-radius:50%;background:white;border:3px solid ${color};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,0.25);">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
        `;

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          setSelectedIncident(inc);
        });

        const m = new goongjs.Marker({ element: el, anchor: "center" })
          .setLngLat([inc.longitude, inc.latitude])
          .addTo(map);

        markersRef.current.push(m);
      }
    });

  }, [map, incidents]);

  useEffect(() => {
    renderMarkers();
  }, [map, incidents, renderMarkers]);

  // Image upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/incidents/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setReportImage(data.imageUrl);
        toast.success("Đã tải ảnh lên!");
      }
    } catch (err) {
      toast.error("Lỗi tải ảnh");
    } finally {
      setUploading(false);
    }
  };

  // Submit Incident Report
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportDesc) {
      toast.error("Vui lòng chọn thông tin mô tả sự cố");
      return;
    }

    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: reportCategory,
          latitude: reportLocation.lat,
          longitude: reportLocation.lng,
          description: reportDesc,
          imageUrl: reportImage,
        }),
      });

      if (res.ok) {
        toast.success("Báo cáo thành công! +10 điểm.");
        setIsReportOpen(false);
        setReportDesc("");
        setReportImage(null);
        fetchIncidents();
        fetchUserProfile();
        if (session?.user?.role === "ADMIN") {
          fetchPendingReports();
        }
      }
    } catch (e) {
      toast.error("Báo cáo thất bại");
    }
  };

  // Start Navigation with dynamic route recalculation & active incident avoidance detour
  const handleStartNavigation = async () => {
    if (!map) return;
    setNavStep("routing");

    const start = `${startCoords.lat},${startCoords.lng}`;
    const dest = destCoords ? `${destCoords.lat},${destCoords.lng}` : "10.8778,106.8005"; // Nhà khách ĐHQG fallback

    try {
      const apiKey = process.env.NEXT_PUBLIC_GOONG_API_KEY || "2X3t5rZDLQiFHgLAdeGC8tkz2RZdTwfwMDtyFYSm";
      const res = await fetch(
        `https://rsapi.goong.io/direction?origin=${start}&destination=${dest}&vehicle=bike&alternatives=true&api_key=${apiKey}`
      );
      
      if (!res.ok) {
        toast.error("Lỗi tìm hướng di chuyển từ Goong Maps");
        return;
      }

      const data = await res.json();
      if (!data.routes || data.routes.length === 0) {
        toast.error("Không tìm thấy đường đi.");
        return;
      }

      const primaryRoute = data.routes[0];
      const polyline0 = primaryRoute.overview_polyline?.points;
      if (!polyline0) return;
      const primaryPoints = decodePolyline(polyline0);

      // Check distance to all active incidents
      let isBlocked = false;
      let blockingIncident = null;

      for (const incident of incidents) {
        if (incident.status === "ACTIVE" || incident.status === "APPROVED") {
          if (incident.streetCoords) {
            try {
              const blockedCoords: [number, number][] = JSON.parse(incident.streetCoords);
              for (const pt of primaryPoints) {
                for (const bPt of blockedCoords) {
                  const distance = getDistance(pt[1], pt[0], bPt[1], bPt[0]);
                  if (distance < 0.1) { // 100 meters
                    isBlocked = true;
                    blockingIncident = incident;
                    break;
                  }
                }
                if (isBlocked) break;
              }
            } catch (e) {
              console.error("Failed to parse incident streetCoords:", e);
            }
          } else {
            // Fallback to single coordinate proximity
            for (const pt of primaryPoints) {
              const distance = getDistance(pt[1], pt[0], incident.latitude, incident.longitude);
              if (distance < 0.5) { // 500m
                isBlocked = true;
                blockingIncident = incident;
                break;
              }
            }
          }
        }
        if (isBlocked) break;
      }

      // Distance helper (Haversine formula in km)
      function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
      }

      if (isBlocked && data.routes.length > 1) {
        const altRoute = data.routes[1];
        const polyline1 = altRoute.overview_polyline?.points;
        if (polyline1) {
          const altPoints = decodePolyline(polyline1);
          setFloodedStreetCoords(primaryPoints);
          setAlternativeStreetCoords(altPoints);
          setNavPoints(altPoints.map(p => ({ lat: p[1], lng: p[0] })));
          toast.warning(`Phát hiện sự cố ngập úng trên đường đi. Đã thiết lập lộ trình tránh!`);
        }
      } else {
        setFloodedStreetCoords([]);
        setAlternativeStreetCoords(primaryPoints);
        setNavPoints(primaryPoints.map(p => ({ lat: p[1], lng: p[0] })));
      }

      navRouteLayerRef.current = true;
    } catch (e) {
      console.error(e);
      toast.error("Lỗi lấy thông tin định tuyến.");
    }
  };

  const triggerNavStart = async () => {
    if (navPoints.length < 2) return;
    try {
      const res = await fetch("/api/navigation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          startLat: navPoints[0].lat,
          startLng: navPoints[0].lng,
          endLat: navPoints[navPoints.length - 1].lat,
          endLng: navPoints[navPoints.length - 1].lng,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setNavSessionId(data.session.id);
        setNavStep("active");
        setIsNavigating(true);
        toast.info("Bắt đầu điều hướng tránh ngập!");

        // Start 3D First Person Map Camera Follow
        if (map && alternativeStreetCoords.length > 0) {
          map.easeTo({
            center: alternativeStreetCoords[0],
            zoom: 18.5,
            pitch: 65,
            bearing: -15,
            duration: 1000
          });
        }
      }
    } catch (e) {
      toast.error("Lỗi kích hoạt điều hướng");
    }
  };

  const handleArriveDestination = async (rating: number, comment: string) => {
    if (!navSessionId) return;

    try {
      const res = await fetch("/api/navigation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "arrive",
          sessionId: navSessionId,
          rating,
          comment,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Đã đến điểm hẹn! Nhận được +${data.pointsAwarded} điểm GoSafe.`);
        setNavStep("idle");
        setIsNavigating(false);
        setNavSessionId(null);
        setIsFeedbackOpen(false);
        fetchUserProfile();

        // Reset camera to default center/tilt
        if (map) {
          map.easeTo({
            pitch: 55,
            bearing: -15,
            zoom: 16.03,
            duration: 1200
          });
        }

        if (map && map.getLayer("route-layer")) {
          map.removeLayer("route-layer");
          map.removeSource("route-source");
          navRouteLayerRef.current = false;
        }
      }
    } catch (e) {
      toast.error("Không thể ghi nhận kết thúc chuyến đi");
    }
  };

  const handleConsentToggle = async () => {
    const nextConsent = !consent;
    try {
      const res = await fetch("/api/users/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: nextConsent }),
      });
      if (res.ok) {
        setConsent(nextConsent);
        toast.success(nextConsent ? "Đã bật chia sẻ vị trí." : "Đã tắt chia sẻ vị trí.");
        if (session?.user?.role === "ADMIN") {
          fetchAdminUsers();
        }
      }
    } catch (e) {
      toast.error("Lỗi cập nhật quyền riêng tư");
    }
  };

  const handleVoucherExchange = async (voucherId: string, requiredPoints: number) => {
    if (points < requiredPoints) {
      toast.error("Không đủ điểm!");
      return;
    }

    try {
      const res = await fetch("/api/vouchers/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voucherId }),
      });

      if (res.ok) {
        toast.success("Đổi voucher thành công!");
        fetchUserProfile();
        fetchVouchers();
      }
    } catch (e) {
      toast.error("Lỗi giao dịch đổi điểm");
    }
  };

  const handleOpenApprove = async (report: any) => {
    setActiveApproveReport(report);
    setApproveLocationName("");
    setApproveAiResult(null);
    setIsApproveModalOpen(true);

    try {
      const res = await fetch("/api/incidents/ai-evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: report.category,
          latitude: report.latitude,
          longitude: report.longitude,
          description: report.description,
          confidence: report.confidence,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setApproveAiResult(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleApproveReportSubmit = async () => {
    if (!approveLocationName) {
      toast.error("Please specify location name");
      return;
    }

    try {
      const res = await fetch("/api/incidents/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: activeApproveReport.id,
          locationName: approveLocationName,
        }),
      });

      if (res.ok) {
        toast.success("Report approved and mapped!");
        setIsApproveModalOpen(false);
        fetchIncidents();
        fetchPendingReports();
      }
    } catch (e) {
      toast.error("Error approving report");
    }
  };

  const handleRejectReport = async (reportId: string) => {
    try {
      const res = await fetch("/api/incidents/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId: reportId, status: "REJECTED" }),
      });
      if (res.ok) {
        toast.success("Report rejected.");
        fetchPendingReports();
      }
    } catch (e) {
      toast.error("Failed to reject report");
    }
  };

  const handleClearIncident = async (incidentId: string) => {
    try {
      const res = await fetch("/api/incidents/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId, status: "CLEARED" }),
      });

      if (res.ok) {
        toast.success("Incident cleared!");
        fetchIncidents();
      }
    } catch (e) {
      toast.error("Failed to clear incident");
    }
  };

  const handleAddVoucherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherCode || !voucherTitle || !voucherDesc) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const res = await fetch("/api/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: voucherCode,
          title: voucherTitle,
          description: voucherDesc,
          pointsRequired: voucherPoints,
          quantity: voucherQty,
        }),
      });

      if (res.ok) {
        toast.success("Voucher registered!");
        setVoucherCode("");
        setVoucherTitle("");
        setVoucherDesc("");
        fetchVouchers();
      }
    } catch (e) {
      toast.error("Failed to create voucher");
    }
  };

  const handleBroadcastAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMessage) {
      toast.error("Please fill in fields");
      return;
    }

    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "broadcast",
          title: broadcastTitle,
          message: broadcastMessage,
        }),
      });

      if (res.ok) {
        toast.success("Warning alert broadcasted!");
        setBroadcastTitle("");
        setBroadcastMessage("");
      }
    } catch (e) {
      toast.error("Failed to broadcast alert");
    }
  };

  const getFilteredIncidents = () => {
    return adminIncidents.filter((inc: any) => {
      const matchCategory = filterCategory === "ALL" || inc.category === filterCategory;
      const matchRisk = filterRiskLevel === "ALL" || inc.riskLevel === filterRiskLevel;

      let matchDate = true;
      if (filterStartDate) {
        matchDate = matchDate && new Date(inc.createdAt) >= new Date(filterStartDate);
      }
      if (filterEndDate) {
        matchDate = matchDate && new Date(inc.createdAt) <= new Date(filterEndDate);
      }

      return matchCategory && matchRisk && matchDate;
    });
  };

  const scrollToMap = () => {
    const el = document.getElementById("map-section");
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen relative flex flex-col overflow-x-hidden text-foreground font-normal pb-24 md:pb-0 bg-background">
      <Toaster position="top-center" richColors />

      {/* Background Grid */}
      {activeTab === "home" && (
        <div className="absolute z-[-1] flex h-[350px] sm:h-[450px] lg:h-[600px] w-full flex-col items-center justify-center rounded-lg overflow-hidden">
          <GridPattern
            squares={[
              [4, 4],
              [5, 1],
              [8, 2],
              [5, 3],
              [5, 5],
              [10, 10],
              [12, 15],
              [15, 10],
              [10, 15],
              [15, 10],
              [10, 15],
              [15, 10],
            ]}
            className={cn(
              "[mask-image:radial-gradient(600px_circle_at_bottom_right,white,transparent)]",
              "inset-x-0 inset-y-[-30%] h-[200%] skew-y-12"
            )}
          />
        </div>
      )}

      {/* Navbar */}
      {activeTab !== "navigation" && <Navbar />}

      {/* Hero Section */}
      {activeTab === "home" && (
        <section className="relative z-10 min-h-[calc(100vh-4rem)] flex flex-col lg:flex-row items-stretch w-full overflow-hidden border-b border-border/40">
          <div 
            className="absolute inset-0 z-0 overflow-hidden"
            style={{
              maskImage: "radial-gradient(800px circle at bottom left, white, transparent)",
              WebkitMaskImage: "radial-gradient(800px circle at bottom left, white, transparent)"
            }}
          >
            <AnimatedGridPattern
              numSquares={70}
              maxOpacity={0.3}
              duration={1.5}
              repeatDelay={0.1}
              className={cn(
                "inset-x-0 inset-y-[-30%] h-[200%] skew-y-12",
                "absolute inset-0 opacity-70 stroke-gray-300 dark:stroke-zinc-800 fill-blue-500/5 dark:fill-blue-500/10"
              )}
            />
          </div>

          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease }}
            className="w-full lg:w-1/2 flex flex-col justify-center relative pt-52 sm:pt-60 lg:pt-16 pb-16 lg:py-16 px-6 sm:px-12 lg:pl-[calc((100vw-min(100vw,1400px))/2+2rem)] lg:pr-16 z-10"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight leading-tight mb-6 text-foreground font-Outfit">
              <AuroraText className="text-5xl sm:text-6xl lg:text-7xl font-normal tracking-tight inline-block mb-1">GoSafe</AuroraText> <br /> Fast, Smart &amp; Safe
            </h1>

            <p className="text-base sm:text-lg lg:text-xl font-medium text-foreground leading-relaxed mb-8 max-w-lg">
              Built for the community, driving sustainable cities.
            </p>

            <div className="max-w-md w-full">
              {!session ? (
                <div className="flex flex-col gap-3 items-start justify-center">
                  <Button
                    onClick={() => signIn("google")}
                    className="rounded-full px-6 py-5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium flex items-center gap-2 border-0 shadow transition-all cursor-pointer"
                  >
                    <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                    </svg>
                    Authenticate with Google
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={scrollToMap} className="rounded-full px-6 py-5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium flex items-center gap-2 border-0 shadow transition-all cursor-pointer">
                    <Map className="w-4 h-4" /> Go to Live Map
                  </Button>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease, delay: 0.15 }}
            className="w-full lg:w-1/2 lg:absolute lg:right-0 lg:top-0 lg:bottom-0 relative h-[380px] lg:h-auto overflow-hidden bg-transparent z-10"
          >
            <img
              src="/assets/banner.png"
              alt="GoSafe City Map Overview"
              className="absolute inset-0 w-full h-full object-cover object-left-top select-none animate-fade-in"
            />
          </motion.div>
        </section>
      )}

      {/* Script for Goong Map */}
      <Script
        src="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.js"
        strategy="afterInteractive"
        onLoad={() => setMapLoaded(true)}
      />

      {/* Map Section - Kept Mounted to fix tab-switching issue */}
      <section 
        id="map-section" 
        className={cn(
          "pb-0 bg-transparent transition-all duration-300 flex flex-col relative",
          (activeTab === "home" || activeTab === "navigation") ? "block opacity-100" : "hidden opacity-0 pointer-events-none",
          activeTab === "navigation" ? "pt-0 h-screen w-screen" : "pt-20"
        )}
      >
        {activeTab !== "navigation" && (
          <div className="container">
            <div className="text-left mb-10">
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-foreground font-Outfit">
                Our <AuroraText>GoSafe</AuroraText> Map
              </h2>
              <p className="text-base sm:text-lg lg:text-xl font-medium text-foreground max-w-2xl mt-3 leading-relaxed">
                Real-time commuter alerts and AI camera feeds. Click coordinates to report new incidents.
              </p>
            </div>
          </div>
        )}

        {/* Map Container */}
        <div className={cn(
          "w-full border-y border-border/50 bg-card shadow-2xl relative flex flex-col p-0 gap-0 overflow-hidden transition-all duration-300",
          activeTab === "navigation" 
            ? "fixed inset-0 z-30 h-screen w-screen border-none" 
            : "h-[450px] sm:h-[600px] lg:h-[700px]"
        )}>

          <div className="flex-1 relative overflow-hidden h-full w-full">

            {/* Navigation Tab Panels */}
            {activeTab === "navigation" && (
              <>
                {/* 1. TOP SEARCH PANEL (Mobile: fixed top, Desktop: absolute left card top portion) */}
                <div className="fixed top-0 left-0 right-0 z-45 bg-background/95 backdrop-blur-md border-b border-border p-4 pb-5 flex flex-col gap-3.5 shadow-md md:absolute md:top-4 md:left-4 md:right-auto md:w-80 md:rounded-3xl md:border md:shadow-2xl md:p-5">
                  <div className="hidden md:block">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 font-Outfit">
                      <Compass className="w-4 h-4 text-primary animate-pulse" /> Điều hướng tránh ngập GoSafe
                    </h3>
                    <p className="text-[10px] text-muted-foreground mt-1 font-semibold">Nhập địa điểm để tự động thiết lập lộ trình tránh các điểm ngập nước.</p>
                  </div>

                  {/* Start Location Input */}
                  <div className="flex flex-col gap-1 relative">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase leading-none mb-1">Điểm khởi hành:</label>
                    <input
                      type="text"
                      value={startQuery}
                      onChange={(e) => {
                        skipStartQueryRef.current = false;
                        setStartQuery(e.target.value);
                      }}
                      className="p-3 border rounded-2xl bg-muted/20 border-border text-xs font-bold text-foreground outline-none focus:border-primary w-full"
                      placeholder="Tìm kiếm điểm khởi hành..."
                    />

                    {startSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 bg-background border border-border rounded-2xl mt-1 shadow-2xl max-h-48 overflow-y-auto font-semibold">
                        {startSuggestions.map((suggestion) => (
                          <div
                            key={suggestion.place_id}
                            onClick={() => handleSelectStartSuggestion(suggestion)}
                            className="p-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0 border-border/50 text-[11px] leading-snug"
                          >
                            {suggestion.description}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Proposed Starting Points */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          skipStartQueryRef.current = true;
                          setStartCoords(userCoords);
                          const apiKey = process.env.NEXT_PUBLIC_GOONG_API_KEY || "2X3t5rZDLQiFHgLAdeGC8tkz2RZdTwfwMDtyFYSm";
                          fetch(`https://rsapi.goong.io/Geocode?api_key=${apiKey}&latlng=${userCoords.lat},${userCoords.lng}`)
                            .then(res => res.json())
                            .then(data => {
                              const address = data.results?.[0]?.formatted_address;
                              if (address) setStartQuery(address);
                              else setStartQuery(`Vị trí định vị GPS (${userCoords.lat.toFixed(4)}, ${userCoords.lng.toFixed(4)})`);
                            })
                            .catch(() => {
                              setStartQuery(`Vị trí định vị GPS (${userCoords.lat.toFixed(4)}, ${userCoords.lng.toFixed(4)})`);
                            });
                        }}
                        className="px-2 py-1 bg-muted/40 border border-border/50 text-[9px] font-bold rounded-lg hover:bg-muted/70 transition-colors cursor-pointer text-foreground flex items-center gap-1"
                      >
                        <MapPin className="w-2.5 h-2.5 text-primary" /> GPS của bạn
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          skipStartQueryRef.current = true;
                          setStartCoords({ lat: 10.8782, lng: 106.8008 });
                          setStartQuery("Marie Curie, Đông Hòa");
                        }}
                        className="px-2 py-1 bg-muted/40 border border-border/50 text-[9px] font-bold rounded-lg hover:bg-muted/70 transition-colors cursor-pointer text-foreground"
                      >
                        🏫 Marie Curie
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          skipStartQueryRef.current = true;
                          setStartCoords({ lat: 10.8825, lng: 106.8068 });
                          setStartQuery("Ký túc xá Khu B ĐHQG");
                        }}
                        className="px-2 py-1 bg-muted/40 border border-border/50 text-[9px] font-bold rounded-lg hover:bg-muted/70 transition-colors cursor-pointer text-foreground"
                      >
                        🏢 KTX Khu B ĐHQG
                      </button>
                    </div>
                  </div>

                  {/* Destination Location Input */}
                  <div className="flex flex-col gap-1 relative">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase leading-none mb-1">Điểm đến:</label>
                    <input
                      type="text"
                      value={destQuery}
                      onChange={(e) => {
                        skipDestQueryRef.current = false;
                        setDestQuery(e.target.value);
                      }}
                      className="p-3 border rounded-2xl bg-muted/20 border-border text-xs font-bold text-foreground outline-none focus:border-primary w-full"
                      placeholder="Tìm kiếm địa điểm đến..."
                    />

                    {destSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 bg-background border border-border rounded-2xl mt-1 shadow-2xl max-h-48 overflow-y-auto font-semibold">
                        {destSuggestions.map((suggestion) => (
                          <div
                            key={suggestion.place_id}
                            onClick={() => handleSelectDestSuggestion(suggestion)}
                            className="p-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0 border-border/50 text-[11px] leading-snug"
                          >
                            {suggestion.description}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Desktop Only Actions Panel */}
                  <div className="hidden md:flex flex-col gap-3 mt-2">
                    <Button
                      onClick={handleStartNavigation}
                      disabled={isNavigating}
                      className="h-10 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold border-0 text-xs w-full cursor-pointer"
                    >
                      {isNavigating ? "Đang thiết lập lộ trình..." : "Tìm đường đi tối ưu"}
                    </Button>

                    <Button
                      onClick={() => {
                        if (!session) {
                          toast.error("Vui lòng đăng nhập!");
                          return;
                        }
                        setIsReportOpen(true);
                      }}
                      variant="outline"
                      className="h-10 rounded-2xl border-border bg-background hover:bg-accent text-foreground font-bold text-xs w-full flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      🚩 Báo cáo sự cố khẩn cấp
                    </Button>

                    {isNavigating && floodedStreetCoords.length > 0 && (
                      <div className="flex flex-col gap-2.5 p-4 rounded-2xl bg-orange-500/10 text-orange-600 border border-orange-500/20 font-bold leading-relaxed">
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-orange-500 animate-bounce" />
                          <span>Phát hiện vùng ngập chắn lối</span>
                        </div>
                        <p className="text-[10px] font-semibold text-foreground leading-normal">GoSafe tự động đề xuất vòng qua để tránh vùng ngập sâu nguy hiểm.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. BOTTOM ACTION PANEL (Mobile: fixed bottom above rounded navigation bar, Desktop: hidden) */}
                <div className="fixed bottom-26 left-4 right-4 z-40 bg-background/95 backdrop-blur-md border border-border p-4 flex flex-col gap-2 shadow-xl rounded-2xl md:hidden">
                  <Button
                    onClick={handleStartNavigation}
                    disabled={isNavigating}
                    className="h-11 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold border-0 text-xs w-full cursor-pointer"
                  >
                    {isNavigating ? "Đang thiết lập lộ trình..." : "Tìm đường đi tối ưu"}
                  </Button>

                  <Button
                    onClick={() => {
                      if (!session) {
                        toast.error("Vui lòng đăng nhập!");
                        return;
                      }
                      setIsReportOpen(true);
                    }}
                    variant="outline"
                    className="h-10 rounded-2xl border-border bg-background hover:bg-accent text-foreground font-bold text-xs w-full flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    🚩 Báo cáo sự cố khẩn cấp
                  </Button>

                  {isNavigating && floodedStreetCoords.length > 0 && (
                    <div className="flex flex-col gap-2 p-3 rounded-2xl bg-orange-500/10 text-orange-600 border border-orange-500/20 font-bold leading-relaxed">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-orange-500 animate-bounce" />
                        <span>Phát hiện vùng ngập chắn lối</span>
                      </div>
                      <p className="text-[9px] font-semibold text-foreground leading-normal">GoSafe tự động đề xuất vòng qua để tránh vùng ngập sâu nguy hiểm.</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Navigation simulation Guidance Widget */}
            {navStep !== "idle" && (
              <div className="absolute top-3 right-3 z-40 p-3 rounded-2xl bg-background border border-border shadow-2xl w-[250px] text-[10px] flex flex-col gap-2 border-border/50">
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1"><Navigation className="w-3.5 h-3.5 text-primary animate-pulse" /> Detour Guidance</span>
                  <Button variant="ghost" size="icon" onClick={() => {
                    setNavStep("idle");
                    if (map && map.getLayer("route-layer")) {
                      map.removeLayer("route-layer");
                      map.removeSource("route-source");
                    }
                  }} className="h-5 w-5 rounded-full cursor-pointer"><XCircle className="w-3 h-3" /></Button>
                </div>
                {navStep === "routing" ? (
                  <>
                    <p className="text-orange-650 bg-orange-500/10 p-2 rounded-xl font-bold border border-orange-500/20">
                      Rerouting calculated successfully.
                    </p>
                    <Button onClick={triggerNavStart} className="w-full h-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[10px] border-0 cursor-pointer">
                      Chấp nhận và Bắt đầu đi
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-green-600 bg-green-500/10 p-2 rounded-xl font-bold border border-green-500/20">
                      Active guidance. First-person view tracking.
                    </p>
                    <Button onClick={() => setIsFeedbackOpen(true)} className="w-full h-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[10px] border-0 cursor-pointer">
                      Đã đến điểm hẹn (+5 pts)
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* Details Popup when Marker is selected */}
            {selectedIncident && (
              <div className="absolute bottom-24 left-4 right-4 md:right-auto md:w-80 z-40 p-4 rounded-3xl bg-background border border-border shadow-2xl flex flex-col gap-2.5 text-[10px] border-border/50">
                <div className="flex items-center justify-between border-b pb-1.5 border-border/50">
                  <span className="font-extrabold capitalize text-xs">Cảnh báo: {selectedIncident.category === "FLOODING" ? "Ngập nước" : selectedIncident.category === "ACCIDENT" ? "Tai nạn" : selectedIncident.category === "DEBRIS" ? "Vật cản đường" : "Hố ga hư hỏng"}</span>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedIncident(null)} className="h-5 w-5 rounded-full cursor-pointer"><XCircle className="w-4 h-4" /></Button>
                </div>
                <div className="flex gap-2">
                  {selectedIncident.reports?.[0]?.imageUrl && (
                    <img src={selectedIncident.reports[0].imageUrl} alt="attachment" className="w-16 h-16 object-cover rounded-xl border border-border/50" />
                  )}
                  <div className="flex-1 font-semibold text-slate-800">
                    <p className="font-bold text-foreground">{selectedIncident.locationName}</p>
                    <p className="mt-0.5 leading-normal">{selectedIncident.description}</p>
                  </div>
                </div>
                <div className="bg-muted/50 p-2.5 rounded-xl text-foreground font-semibold leading-normal border text-[9px] border-border/50">
                  <strong>Khuyến nghị từ GoSafe AI: </strong> {selectedIncident.recommendation}
                </div>
                <div className="flex items-center justify-end gap-2 border-t pt-2 border-border/50">
                  <span className="text-[9px] text-muted-foreground mr-auto">Sự cố đã được dọn dẹp?</span>
                  <Button size="sm" variant="outline" onClick={async () => {
                    if (!session) {
                      toast.error("Vui lòng đăng nhập!");
                      return;
                    }
                    try {
                      await fetch("/api/navigation", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "arrive", sessionId: "feedback", rating: 5, comment: "Incident cleared" }),
                      });
                      toast.success("Ghi nhận! Bạn nhận được +5 điểm.");
                      fetchUserProfile();
                      setSelectedIncident(null);
                    } catch (e) { }
                  }} className="h-7 text-[8px] font-bold rounded-lg px-2 border-border/50 cursor-pointer bg-white"><CheckCircle className="w-3 h-3 text-green-500 mr-1" /> Xác nhận Dọn dẹp (+5)</Button>
                </div>
              </div>
            )}

            {/* Floating Map Action Buttons */}
            {activeTab !== "navigation" && (
              <div className="absolute bottom-4 right-4 z-40 flex flex-col gap-2">
                <Button onClick={() => {
                  if (!session) {
                    toast.error("Vui lòng đăng nhập!");
                    return;
                  }
                  setActiveTab("navigation");
                  handleStartNavigation();
                }} disabled={isNavigating} className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg flex items-center justify-center border-0 hover:scale-105 transition-transform cursor-pointer">
                  <Navigation className="w-4.5 h-4.5" />
                </Button>
                <Button onClick={() => {
                  if (!session) {
                    toast.error("Vui lòng đăng nhập!");
                    return;
                  }
                  setIsReportOpen(true);
                }} variant="outline" className="h-10 w-10 rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform border border-border bg-background hover:bg-accent text-foreground cursor-pointer">
                  <Plus className="w-5 h-5" />
                </Button>
              </div>
            )}

            {/* Goong map container for home tab (demo) */}
            {activeTab === "home" && (
              <div className="w-full h-full bg-transparent">
                <HomeDemoMap />
              </div>
            )}

            {/* Goong map container for navigation tab (real) */}
            <div 
              id="goong-map-nav" 
              className={cn("w-full h-full bg-transparent", activeTab === "navigation" ? "block" : "hidden")} 
            />
          </div>

        </div>
      </section>

      {/* Platform Features / Bento Grid Informational Section */}
      {activeTab === "home" && (
        <ModulesSection />
      )}

      {/* Floating Report Hazard Dialog - Minimal Typing Form */}
      {isReportOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border border-border shadow-2xl rounded-3xl w-full max-w-md p-6 flex flex-col gap-4 text-xs border-border/50">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-1 font-Outfit">
                Báo cáo Sự cố trên đường (+10 pts)
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setIsReportOpen(false)} className="h-8 w-8 rounded-full cursor-pointer"><XCircle className="w-5 h-5" /></Button>
            </div>

            <form onSubmit={handleReportSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <span className="font-bold text-foreground">Loại Sự cố</span>
                <select value={reportCategory} onChange={(e) => setReportCategory(e.target.value)} className="p-3 border rounded-xl bg-background font-bold border-border/50 outline-none">
                  <option value="FLOODING">🌊 Đường Ngập Nước</option>
                  <option value="ACCIDENT">🚗 Tai nạn Giao thông</option>
                  <option value="DEBRIS">🌲 Vật cản chắn đường</option>
                  <option value="POTHOLES">🕳️ Hố sụt / Hỏng đường</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="font-bold text-foreground">Toạ độ Vị trí (Click chọn trên Bản đồ)</span>
                <div className="p-3 border rounded-xl bg-muted/30 font-mono text-[9px] text-foreground font-bold border-border/50">
                  Lat: {reportLocation.lat.toFixed(6)}, Lng: {reportLocation.lng.toFixed(6)}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="font-bold text-foreground">Ảnh thực tế đính kèm (Scrubbed PII)</span>
                <div className="flex items-center gap-2">
                  <label className="flex-1 flex flex-col items-center justify-center p-2.5 border border-dashed rounded-xl cursor-pointer bg-muted/20 hover:bg-muted/30 border-border/50">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Upload className="w-4 h-4 text-foreground" />}
                    <span className="text-[9px] text-foreground font-bold mt-1">Upload ảnh</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                  {reportImage && (
                    <img src={reportImage} alt="preview" className="w-12 h-12 object-cover rounded-xl border border-border/50" />
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="font-bold text-foreground">Mô tả Nhanh (Click để chọn nhanh, không cần gõ)</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {["Ngập nặng (>30cm)", "Ngập vừa (10-30cm)", "Cây đổ chắn đường", "Tai nạn xe máy", "Hố ga hư hỏng"].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setReportDesc(opt)}
                      className={cn(
                        "px-2.5 py-1.5 rounded-xl border text-[10px] font-bold transition-all bg-transparent cursor-pointer",
                        reportDesc === opt 
                          ? "border-primary text-primary bg-primary/5" 
                          : "border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full rounded-xl py-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs mt-1.5 border-0 cursor-pointer">Gửi báo cáo</Button>
            </form>
          </div>
        </div>
      )}

      {/* Trip Completed Feedback Modal */}
      {isFeedbackOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border border-border shadow-2xl rounded-3xl w-full max-w-sm p-6 flex flex-col gap-4 text-xs text-center">
            <h3 className="font-bold text-sm font-Outfit flex items-center justify-center gap-1.5"><CheckCircle className="w-5 h-5 text-green-500 animate-bounce" /> Lộ trình Hoàn tất!</h3>
            <p className="text-muted-foreground font-semibold leading-relaxed">Bạn đánh giá thế nào về lộ trình định tuyến tránh ngập của GoSafe vừa rồi?</p>
            
            <div className="flex justify-around gap-4 my-2">
              <Button 
                onClick={() => handleArriveDestination(5, "Lộ trình tránh ngập rất an toàn và tốt")} 
                className="flex-1 h-12 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold border-0 flex flex-col items-center justify-center gap-1 cursor-pointer"
              >
                <ThumbsUp className="w-4.5 h-4.5" />
                <span>Rất tốt</span>
              </Button>
              <Button 
                onClick={() => handleArriveDestination(1, "Vẫn bị ngập / Lộ trình kém")} 
                className="flex-1 h-12 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold border-0 flex flex-col items-center justify-center gap-1 cursor-pointer"
              >
                <ThumbsDown className="w-4.5 h-4.5" />
                <span>Không tốt</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Verification Modal */}
      {isApproveModalOpen && activeApproveReport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border border-border shadow-2xl rounded-3xl w-full max-w-md p-6 flex flex-col gap-3 text-xs border-border/50">
            <h3 className="font-bold text-sm text-green-600 flex items-center gap-1.5"><Shield className="w-4 h-4" /> AI Report Verification</h3>

            <div className="border-b pb-2 flex gap-2 border-border/50">
              {activeApproveReport.imageUrl && <img src={activeApproveReport.imageUrl} alt="attached" className="w-12 h-12 object-cover rounded-lg border border-border/50" />}
              <div>
                <p className="font-bold capitalize">{activeApproveReport.category === "FLOODING" ? "Flooding" : activeApproveReport.category === "ACCIDENT" ? "Accident" : activeApproveReport.category === "DEBRIS" ? "Road Debris" : "Pothole"}</p>
                <p className="text-foreground text-[11px] leading-snug font-medium">{activeApproveReport.description}</p>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-[10px] text-foreground uppercase mb-1.5">AI Analysis Output</h4>
              {!approveAiResult ? (
                <div className="flex items-center justify-center gap-1.5 py-4 text-foreground font-semibold"><Loader2 className="w-4 h-4 animate-spin text-primary" /> Analyzing report with AI...</div>
              ) : (
                <div className="p-3 border rounded-xl bg-muted/40 flex flex-col gap-1 border-border/50">
                  <div className="flex justify-between items-center font-bold">
                    <span>Risk: {approveAiResult.riskScore}%</span>
                    <span className="uppercase text-[9px]">Level: {approveAiResult.riskLevel === "HIGH" ? "HIGH" : approveAiResult.riskLevel === "MEDIUM" ? "MEDIUM" : "LOW"}</span>
                  </div>
                  <p className="text-[10px] text-foreground leading-snug border-t pt-1 mt-1 border-border/50 font-semibold"><strong>Recommendation: </strong> {approveAiResult.recommendation}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <span className="font-bold text-foreground">Street Name / Location</span>
              <input type="text" value={approveLocationName} onChange={(e) => setApproveLocationName(e.target.value)} placeholder="e.g., Vo Van Ngan Street" className="p-3 border rounded-xl bg-background font-bold border-border/50" />
            </div>

            <div className="flex justify-end gap-2 border-t pt-3 border-border/50">
              <Button variant="outline" onClick={() => setIsApproveModalOpen(false)} className="h-8 rounded-xl text-[10px] font-bold border-border/50">Cancel</Button>
              <Button disabled={!approveAiResult || !approveLocationName} onClick={handleApproveReportSubmit} className="h-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[10px] border-0">Approve &amp; Map Overlay (+10 pts)</Button>
            </div>
          </div>
        </div>
      )}

      {/* Redeem Vouchers Section */}
      {activeTab === "redeem" && (
        <section className="container mx-auto px-6 py-24 flex flex-col gap-6 text-xs max-w-4xl min-h-[calc(100vh-8rem)]">
          <div className="flex items-center justify-between border-b pb-4 border-border/50">
            <div>
              <h2 className="text-3xl font-bold text-foreground font-Outfit">Danh mục Đổi Voucher</h2>
              <p className="text-xs text-muted-foreground mt-1 font-semibold">Sử dụng điểm thưởng GoSafe tích lũy được từ việc báo cáo sự cố để nhận quà.</p>
            </div>
            <Award className="w-10 h-10 text-primary animate-pulse" />
          </div>

          <div className="p-5 rounded-3xl bg-card border border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-foreground">Ví điểm thưởng GoSafe</h4>
              <p className="text-xs text-muted-foreground mt-0.5 font-semibold">
                Bạn hiện đang sở hữu <strong className="text-primary text-sm font-bold">{points} điểm</strong>.
              </p>
            </div>
            <div className="px-4 py-2 bg-primary/10 border border-primary/20 text-primary font-bold rounded-2xl text-xs">
              Số dư: {points} pts
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {vouchers.map((voucher: any) => (
              <div key={voucher.id} className="p-5 rounded-3xl border bg-card flex flex-col justify-between gap-4 border-border/50">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2 border-b pb-2 border-border/50">
                    <h5 className="font-bold text-xs leading-snug text-foreground">{voucher.title}</h5>
                    <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[9px]">
                      {voucher.pointsRequired} pts
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-normal mt-1 font-semibold">{voucher.description}</p>
                </div>
                <div className="flex items-center justify-between text-[10px] font-semibold pt-2 border-t border-border/50">
                  <span>Kho hàng: <span className="text-primary font-bold">{voucher.quantity} chiếc</span></span>
                  <Button
                    size="sm"
                    disabled={points < voucher.pointsRequired || voucher.quantity <= 0}
                    onClick={() => handleVoucherExchange(voucher.id, voucher.pointsRequired)}
                    className="h-7 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] font-bold border-0 px-3.5 cursor-pointer"
                  >
                    Đổi ngay
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Claimed History */}
          <div className="pt-6 border-t border-border/50 mt-4">
            <h4 className="font-bold text-xs text-foreground uppercase mb-3 font-Outfit">Lịch sử đổi Voucher của bạn</h4>
            {claimedVouchers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-[10px] border border-dashed rounded-2xl border-border/50 bg-slate-50/50">
                Bạn chưa đổi bất kỳ voucher nào. Hãy tích cực báo cáo sự cố để kiếm điểm!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {claimedVouchers.map((c: any) => (
                  <div key={c.id} className="p-4 border rounded-2xl bg-card flex justify-between items-center text-[10px] border-border/50">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-foreground">{c.voucher.title}</span>
                      <span className="font-mono text-[9px] text-primary uppercase font-bold">
                        {`GS-${c.id.substring(c.id.length - 8).toUpperCase()}`}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 font-semibold">
                      <span className="text-[9px] text-muted-foreground">{new Date(c.exchangedAt).toLocaleDateString()}</span>
                      <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 font-bold text-[8px] uppercase">{c.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* User Profile Section */}
      {activeTab === "profile" && session && (
        <section className="container mx-auto px-6 py-24 flex flex-col gap-6 text-xs max-w-md min-h-[calc(100vh-8rem)]">
          <div className="flex items-center justify-between border-b pb-4 border-border/50">
            <h2 className="text-2xl font-bold text-foreground font-Outfit">Hồ sơ &amp; Thiết lập</h2>
          </div>

          <div className="flex items-center gap-4 p-4 border rounded-3xl border-border/50 bg-card">
            <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-primary/20">
              <img
                src={session.user?.image || "/logo.png"}
                alt={session.user?.name || "User"}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-foreground">{session.user?.name}</span>
              <span className="text-[10px] text-muted-foreground">{session.user?.email}</span>
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[8px] font-bold w-fit mt-1.5 uppercase font-Outfit">
                {session.user?.role || "MEMBER"}
              </span>
            </div>
          </div>

          {/* Credits Wallet */}
          <div className="flex justify-between items-center bg-card p-4 rounded-3xl border border-border/50 font-bold">
            <div>
              <h4 className="font-bold text-xs text-foreground">Ví tích lũy điểm thưởng</h4>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">Dùng để đổi quà tặng Voucher đối tác</p>
            </div>
            <span className="text-base font-bold text-primary">{points} pts</span>
          </div>

          <div className="flex flex-col border border-border/50 rounded-3xl bg-card overflow-hidden">
            <div className="p-4 border-b border-border/50 flex justify-between items-center hover:bg-slate-50/50 cursor-pointer">
              <div className="flex items-center gap-3 font-semibold text-foreground">
                <User className="w-4 h-4 text-slate-400" />
                <span>Thiết lập tài khoản</span>
              </div>
              <span className="text-slate-400 font-bold">&gt;</span>
            </div>
            <div className="p-4 border-b border-border/50 flex justify-between items-center hover:bg-slate-50/50 cursor-pointer">
              <div className="flex items-center gap-3 font-semibold text-foreground">
                <Compass className="w-4 h-4 text-slate-400" />
                <span>Phương tiện mặc định</span>
              </div>
              <span className="text-slate-400 font-bold">&gt;</span>
            </div>
            <div className="p-4 border-b border-border/50 flex justify-between items-center hover:bg-slate-50/50 cursor-pointer">
              <div className="flex items-center gap-3 font-semibold text-foreground">
                <Bell className="w-4 h-4 text-slate-400" />
                <span>Thông báo cảnh báo ngập lụt</span>
              </div>
              <span className="text-slate-400 font-bold">&gt;</span>
            </div>
            
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-3 font-semibold text-foreground">
                <Shield className="w-4 h-4 text-slate-400" />
                <div>
                  <span>Đồng ý Quyền riêng tư</span>
                  <p className="text-[9px] text-muted-foreground font-normal mt-0.5">Chia sẻ vị trí ẩn danh giúp cải thiện dự báo</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={handleConsentToggle}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => signOut()}
            className="h-10 rounded-2xl mt-2 text-red-500 border-red-500/20 hover:bg-red-500/5 hover:text-red-500 font-bold text-xs cursor-pointer"
          >
            Đăng xuất tài khoản
          </Button>
        </section>
      )}

      {/* Bottom Center Fixed Navigation Bar - Responsive mobile docked / desktop floating pill */}
      {session && session.user && session.user.role !== "ADMIN" && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-md px-6 py-2 pb-6 border-t border-border rounded-t-3xl shadow-lg flex items-center justify-around w-full select-none md:bottom-6 md:left-1/2 md:-translate-x-1/2 md:w-fit md:rounded-full md:border md:pb-3 md:pt-3 md:px-5 md:justify-start md:gap-4">
          
          {/* Tab 1: Home Map */}
          <button
            onClick={() => setActiveTab("home")}
            className={cn(
              "relative px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-full text-[10px] md:text-xs font-bold flex flex-col md:flex-row items-center gap-1 md:gap-2 transition-colors border-0 bg-transparent cursor-pointer min-w-16 md:min-w-0",
              activeTab === "home" ? "text-primary md:text-primary-foreground font-black" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "home" && (
              <motion.div
                layoutId="active-nav-pill"
                className="absolute inset-0 bg-primary/10 md:bg-primary rounded-xl md:rounded-full z-[-1]"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <Map className="w-5.5 h-5.5 md:w-4 h-4" />
            <span>Home</span>
          </button>

          {/* Tab 2: Navigation */}
          <button
            onClick={() => {
              if (!session) {
                toast.error("Vui lòng đăng nhập để sử dụng tính năng điều hướng!");
                return;
              }
              setActiveTab("navigation");
              handleStartNavigation();
            }}
            className={cn(
              "relative px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-full text-[10px] md:text-xs font-bold flex flex-col md:flex-row items-center gap-1 md:gap-2 transition-colors border-0 bg-transparent cursor-pointer min-w-16 md:min-w-0",
              activeTab === "navigation" ? "text-primary md:text-primary-foreground font-black" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "navigation" && (
              <motion.div
                layoutId="active-nav-pill"
                className="absolute inset-0 bg-primary/10 md:bg-primary rounded-xl md:rounded-full z-[-1]"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <Compass className="w-5.5 h-5.5 md:w-4 h-4" />
            <span>Map</span>
          </button>

          {/* Tab 3: Redeem */}
          <button
            onClick={() => {
              if (!session) {
                toast.error("Vui lòng đăng nhập để đổi quà!");
                return;
              }
              setActiveTab("redeem");
            }}
            className={cn(
              "relative px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-full text-[10px] md:text-xs font-bold flex flex-col md:flex-row items-center gap-1 md:gap-2 transition-colors border-0 bg-transparent cursor-pointer min-w-16 md:min-w-0",
              activeTab === "redeem" ? "text-primary md:text-primary-foreground font-black" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "redeem" && (
              <motion.div
                layoutId="active-nav-pill"
                className="absolute inset-0 bg-primary/10 md:bg-primary rounded-xl md:rounded-full z-[-1]"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <Award className="w-5.5 h-5.5 md:w-4 h-4" />
            <span>Gifts</span>
          </button>

          {/* Tab 4: Profile */}
          <button
            onClick={() => {
              if (!session) {
                signIn("google");
                return;
              }
              setActiveTab("profile");
            }}
            className={cn(
              "relative px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-full text-[10px] md:text-xs font-bold flex flex-col md:flex-row items-center gap-1 md:gap-2 transition-colors border-0 bg-transparent cursor-pointer min-w-16 md:min-w-0",
              activeTab === "profile" ? "text-primary md:text-primary-foreground font-black" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "profile" && (
              <motion.div
                layoutId="active-nav-pill"
                className="absolute inset-0 bg-primary/10 md:bg-primary rounded-xl md:rounded-full z-[-1]"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <User className="w-5.5 h-5.5 md:w-4 h-4" />
            <span>Profile</span>
          </button>
        </div>
      )}

      {/* Footer */}
      {activeTab !== "navigation" && <Footer />}
    </div>
  );
}