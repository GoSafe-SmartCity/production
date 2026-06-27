"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { toast, Toaster } from "sonner";
import Script from "next/script";
import {
  MapPin, AlertTriangle, Navigation, Award, Sliders, User,
  Calendar, Users, CheckCircle, XCircle, Plus, Loader2,
  Upload, Info, Bell, Shield, ArrowDown, Map, Compass, HardHat, Eye, Brain
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

  // Telemetry Widget State
  const [weather, setWeather] = useState<any>(null);

  // Bottom Tab State
  const [activeTab, setActiveTab] = useState<"home" | "navigation" | "redeem" | "profile">("home");

  // Geolocation & Flooded Street States (Focused on Đại học Quốc tế VNU-HCM in Thủ Đức)
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>({ lat: 10.8782, lng: 106.8008 });

  // Fallback: decoded points of blocked Vo Truong Toan road
  const [floodedStreetCoords, setFloodedStreetCoords] = useState<[number, number][]>([
    [106.8020, 10.8795],
    [106.8015, 10.8790],
    [106.8010, 10.8785],
    [106.8005, 10.8778]
  ]);

  // Fallback: decoded alternative VNU campus detour path
  const [alternativeStreetCoords, setAlternativeStreetCoords] = useState<[number, number][]>([
    [106.8020, 10.8795],
    [106.8030, 10.8788],
    [106.8025, 10.8775],
    [106.8010, 10.8768],
    [106.8005, 10.8778]
  ]);

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

  // Fetch real street path & alternative path from Goong API
  useEffect(() => {
    const fetchRealStreetPath = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GOONG_API_KEY || "2X3t5rZDLQiFHgLAdeGC8tkz2RZdTwfwMDtyFYSm";
        const res = await fetch(`https://rsapi.goong.io/direction?origin=10.8795,106.8020&destination=10.8778,106.8005&vehicle=bike&alternatives=true&api_key=${apiKey}`);
        if (res.ok) {
          const data = await res.json();
          // Primary Route (Flooded)
          const polyline0 = data.routes?.[0]?.overview_polyline?.points;
          if (polyline0) {
            const decoded0 = decodePolyline(polyline0);
            if (decoded0.length > 0) {
              setFloodedStreetCoords(decoded0);
            }
          }
          // Alternative Route (Safe Detour)
          const polyline1 = data.routes?.[1]?.overview_polyline?.points;
          if (polyline1) {
            const decoded1 = decodePolyline(polyline1);
            if (decoded1.length > 0) {
              setAlternativeStreetCoords(decoded1);
            }
          }
        }
      } catch (e) {
        console.error("Failed to fetch Goong street path: ", e);
      }
    };
    fetchRealStreetPath();
  }, [decodePolyline]);

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
  const drawFloodedStreet = useCallback((mapInstance: any, primaryCoords: [number, number][], altCoords: [number, number][]) => {
    if (!mapInstance || primaryCoords.length === 0 || altCoords.length === 0) return;

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

      // 3. Add Primary Flooded Route (Red line, width 12)
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

      // 6. Add Persistent Popover Warning on the Primary route (at the middle coord)
      const midIdx = Math.floor(primaryCoords.length / 2);
      const midCoord = primaryCoords[midIdx] || [106.3609, 10.3600];

      const popup = new goongjs.Popup({
        closeButton: false,
        closeOnClick: false,
        className: "custom-popup"
      })
        .setLngLat(midCoord)
        .setHTML(`
          <div class="flex items-center p-0.5 font-bold">
            <span class="font-extrabold text-sm sm:text-base md:text-lg text-neutral-900 dark:text-neutral-100 tracking-normal leading-relaxed font-inter">
              <span class="text-red-500 font-black">Marie Curie</span> street is going to be <span class="text-red-500 font-black">flooded</span> in <span class="text-yellow-600 dark:text-yellow-400 font-black font-semibold">10 minutes</span>
            </span>
          </div>
        `)
        .addTo(mapInstance);

      floodPopupRef.current = popup;

      // 7. Add Pin markers: Bike for Start, Red Pin for End
      // Start (Current Position) - Bike Asset
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

      // End Position - Pin Icon (NO ANIMATION)
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

      const sparseAltCoords = interpolateCoords(altCoords, 3); // Densely sparse: 3 intermediate steps for clean sliding

      // 8. Play Route Flow Animation (Moving Navigation Arrow with Gray Traveled Segment)
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

      // Apply CSS transition to the parent element positioned by Goong JS map
      const markerContainer = travelerMarker.getElement();
      if (markerContainer) {
        markerContainer.style.transition = "transform 0.24s linear";
      }

      // Handle drag/zoom transition toggle to prevent lagging/jumping during map movement
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

      // Helper to compute bearing
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
        activeIdx = (activeIdx + 1) % sparseAltCoords.length;

        const currentPos = sparseAltCoords[activeIdx];
        const prevPos = sparseAltCoords[prevIdx];

        if (!currentPos) return;

        // Update Position (Slides smoothly thanks to transition on markerContainer)
        travelerMarker.setLngLat(currentPos);

        // Update Rotation (Bearing) on the inner rotated element
        const innerEl = arrowEl.querySelector(".arrow-inner") as HTMLElement;
        if (innerEl && prevPos && currentPos) {
          const heading = getBearing(prevPos, currentPos);
          innerEl.style.transform = `rotate(${heading - 45}deg)`;
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
      }, 240); // 240ms interval matched perfectly with 0.24s CSS transition for smooth gliding

    } catch (e) {
      console.warn("Failed to draw flooded street layer: ", e);
    }
  }, []);

  useEffect(() => {
    if (map && floodedStreetCoords.length > 0 && alternativeStreetCoords.length > 0) {
      if (map.isStyleLoaded()) {
        drawFloodedStreet(map, floodedStreetCoords, alternativeStreetCoords);
      } else {
        map.once("style.load", () => {
          drawFloodedStreet(map, floodedStreetCoords, alternativeStreetCoords);
        });
      }
    }
  }, [map, floodedStreetCoords, alternativeStreetCoords, drawFloodedStreet]);

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

      if (!map) {
        const mapInstance = new goongjs.Map({
          container: "goong-map",
          style: "https://tiles.goong.io/assets/goong_map_web.json",
          center: [106.36135, 10.35746],
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
    if (activeTab === "home" && map) {
      const timer = setTimeout(() => {
        map.resize();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeTab, map]);

  // Render Markers on Map - Only show navigation start/end when active
  const renderMarkers = useCallback(() => {
    if (!map) return;
    // @ts-ignore
    const goongjs = window.goongjs;
    if (!goongjs) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    heroMarkersRef.current.forEach(m => m.remove());
    heroMarkersRef.current = [];

    // Only show start (bike) and destination markers when navigating
    if (isNavigating && navPoints.length >= 2) {
      // Start marker (bike icon - blue dot)
      const startEl = document.createElement("div");
      startEl.innerHTML = `
        <div style="width:32px;height:32px;border-radius:50%;border:2.5px solid #3b82f6;background:white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(59,130,246,0.3), 0 0 0 4px rgba(59,130,246,0.15);">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2"/></svg>
        </div>
      `;
      const startMarker = new goongjs.Marker(startEl)
        .setLngLat([navPoints[0].lng, navPoints[0].lat])
        .addTo(map);
      markersRef.current.push(startMarker);

      // Destination marker (red pin dot)
      const endEl = document.createElement("div");
      endEl.innerHTML = `
        <div style="width:32px;height:32px;border-radius:50%;border:2.5px solid #ef4444;background:white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(239,68,68,0.3), 0 0 0 4px rgba(239,68,68,0.15);">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
      `;
      const endMarker = new goongjs.Marker(endEl)
        .setLngLat([navPoints[navPoints.length - 1].lng, navPoints[navPoints.length - 1].lat])
        .addTo(map);
      markersRef.current.push(endMarker);
    }
  }, [map, mapHero, isNavigating, navPoints]);

  useEffect(() => {
    renderMarkers();
  }, [map, mapHero, isNavigating, navPoints, renderMarkers]);

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
        toast.success("Image uploaded!");
      }
    } catch (err) {
      toast.error("Error uploading image");
    } finally {
      setUploading(false);
    }
  };

  // Submit Incident Report
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportDesc) {
      toast.error("Please add a description");
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
        toast.success("Report submitted!");
        setIsReportOpen(false);
        setReportDesc("");
        setReportImage(null);
        fetchIncidents();
        if (session?.user?.role === "ADMIN") {
          fetchPendingReports();
        }
      }
    } catch (e) {
      toast.error("Submission failed");
    }
  };

  // Start Navigation simulation
  const handleStartNavigation = () => {
    if (!map) return;
    setNavStep("routing");

    const points = [
      { lng: 106.7719, lat: 10.8507 },
      { lng: 106.7735, lat: 10.8512 },
      { lng: 106.7745, lat: 10.8525 },
      { lng: 106.7760, lat: 10.8530 }
    ];
    setNavPoints(points);

    if (map.getSource("route-source")) {
      map.getSource("route-source").setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: points.map(p => [p.lng, p.lat])
        }
      });
    } else {
      map.addSource("route-source", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: points.map(p => [p.lng, p.lat])
          }
        }
      });

      map.addLayer({
        id: "route-layer",
        type: "line",
        source: "route-source",
        layout: {
          "line-join": "round",
          "line-cap": "round"
        },
        paint: {
          "line-color": "#3b82f6",
          "line-width": 8,
          "line-opacity": 0.8
        }
      });
    }

    navRouteLayerRef.current = true;
  };

  const triggerNavStart = async () => {
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
        toast.info("Navigation active!");
      }
    } catch (e) {
      toast.error("Failed to start navigation");
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
        toast.success(`Arrived! Recieved +${data.pointsAwarded} credits.`);
        setNavStep("idle");
        setIsNavigating(false);
        setNavSessionId(null);
        fetchUserProfile();

        if (map && map.getLayer("route-layer")) {
          map.removeLayer("route-layer");
          map.removeSource("route-source");
          navRouteLayerRef.current = false;
        }
      }
    } catch (e) {
      toast.error("Error completing navigation");
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
        toast.success(nextConsent ? "Consent enabled." : "Consent revoked.");
        if (session?.user?.role === "ADMIN") {
          fetchAdminUsers();
        }
      }
    } catch (e) {
      toast.error("Failed to update privacy");
    }
  };

  const handleVoucherExchange = async (voucherId: string, requiredPoints: number) => {
    if (points < requiredPoints) {
      toast.error("Not enough points!");
      return;
    }

    try {
      const res = await fetch("/api/vouchers/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voucherId }),
      });

      if (res.ok) {
        toast.success("Voucher claimed!");
        fetchUserProfile();
        fetchVouchers();
      }
    } catch (e) {
      toast.error("Exchange failed");
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
    <div className="min-h-screen relative flex flex-col overflow-x-hidden text-foreground font-normal">
      <Toaster position="top-center" richColors />

      {/* Background Grid */}
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

      {/* Navbar */}
      <Navbar />

      {/* Hero Section - Split Screen layout */}
      {activeTab === "home" && (
        <section className="relative z-10 min-h-[calc(100vh-4rem)] flex flex-col lg:flex-row items-stretch w-full overflow-hidden border-b border-border/40">

          {/* Grid Pattern Background visible behind both columns */}
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

          {/* Left Column: Heading and description */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease }}
            className="w-full lg:w-1/2 flex flex-col justify-center relative pt-52 sm:pt-60 lg:pt-16 pb-16 lg:py-16 px-6 sm:px-12 lg:pl-[calc((100vw-min(100vw,1400px))/2+2rem)] lg:pr-16 z-10"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight leading-tight mb-6 text-foreground">
              <AuroraText className="text-5xl sm:text-6xl lg:text-7xl font-normal tracking-tight inline-block mb-1">GoSafe</AuroraText> <br /> Fast, Smart & Safe
            </h1>

            <p className="text-base sm:text-lg lg:text-xl font-medium text-foreground leading-relaxed mb-8 max-w-lg">
              Built for the community, driving sustainable cities.
            </p>

            {/* Action Area inside Hero */}
            <div className="max-w-md w-full">
              {!session ? (
                <div className="flex flex-col gap-3 items-start justify-center">
                  <Button
                    onClick={() => signIn("google")}
                    className="rounded-full px-6 py-5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium flex items-center gap-2 border-0 shadow transition-all"
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
                  <Button onClick={scrollToMap} className="rounded-full px-6 py-5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium flex items-center gap-2 border-0 shadow transition-all">
                    <Map className="w-4 h-4" /> Go to Live Map
                  </Button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Right Column: Premium Banner Image */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease, delay: 0.15 }}
            className="w-full lg:w-1/2 lg:absolute lg:right-0 lg:top-0 lg:bottom-0 relative h-[380px] lg:h-auto overflow-hidden bg-transparent z-10"
          >
            {/* Glowing background radial */}
            <div className="absolute inset-0 z-10 rounded-full filter blur-3xl" />

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

      {/* Map Section - Below Hero - OPEN TO EVERYONE (No session check) */}
      {(activeTab === "home" || activeTab === "navigation") && (
        <section id="map-section" className="pt-20 pb-0 bg-transparent">
          <div className="container">

            <div className="text-left mb-10">
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-foreground">
                Our <AuroraText>GoSafe</AuroraText> Map
              </h2>
              <p className="text-base sm:text-lg lg:text-xl font-medium text-foreground max-w-2xl mt-3 leading-relaxed">
                Real-time commuter alerts and AI camera feeds. Click coordinates to report new incidents.
              </p>
            </div>
          </div>

          {/* The map card - ALWAYS RENDERED (Full Width, No Padding) */}
          <div className="w-full border-y border-border/50 bg-card shadow-2xl relative flex flex-col h-[450px] sm:h-[600px] lg:h-[700px] p-0 gap-0 overflow-hidden">

            {/* Map rendering wrapper */}
            <div className="flex-1 relative overflow-hidden h-full w-full">

              {/* Navigation Search & Detour Control Card */}
              {activeTab === "navigation" && (
                <div className="absolute top-4 left-4 z-20 w-80 bg-background border border-border rounded-3xl p-5 flex flex-col gap-4 text-xs">
                  <div>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-primary animate-pulse" /> Điều hướng tránh ngập VNU-HCM
                    </h3>
                    <p className="text-[10px] text-muted-foreground mt-1">Tìm đường đi tối ưu tránh mọi điểm tắc nghẽn, ngập úng trong Đại học Quốc gia.</p>
                  </div>

                  <div className="flex flex-col gap-2 bg-card p-3 rounded-2xl border border-border/50 font-semibold">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase leading-none">Vị trí hiện tại:</span>
                    <span className="text-foreground text-[11px] flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-primary" /> Đại học Quốc tế (VNU-HCM)</span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase leading-none mb-1">Điểm đến:</label>
                    <input
                      type="text"
                      defaultValue="Nhà khách Đại học Quốc gia"
                      className="p-3 border rounded-2xl bg-muted/20 border-border text-xs font-bold text-foreground outline-none focus:border-primary"
                      placeholder="Nhập địa điểm đến..."
                    />
                  </div>

                  <Button
                    onClick={() => {
                      handleStartNavigation();
                    }}
                    disabled={isNavigating}
                    className="h-10 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold border-0 text-xs mt-1"
                  >
                    {isNavigating ? "Đang điều hướng..." : "Bắt đầu tìm đường"}
                  </Button>

                  {isNavigating && (
                    <div className="flex flex-col gap-3 p-4 rounded-2xl bg-orange-500/10 text-orange-600 border border-orange-500/20 font-semibold leading-relaxed">
                      <div className="flex items-center gap-1.5 font-bold">
                        <span>Phát hiện ngập Võ Trường Toản</span>
                      </div>
                      <p className="text-[10px] font-semibold text-foreground">GoSafe tự động điều chỉnh hướng di chuyển vòng qua đường nội bộ VNU để tránh vùng ngập sâu 45cm.</p>
                      <div className="text-[9px] text-muted-foreground border-t pt-1.5 border-orange-500/10 mt-1 flex justify-between font-bold">
                        <span>Thời gian: ~3 phút</span>
                        <span>Khoảng cách: 750m</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Navigation simulation widget */}
              {navStep !== "idle" && (
                <div className="absolute top-3 right-3 z-20 p-3 rounded-xl bg-background border border-border shadow-lg w-[240px] text-[10px] flex flex-col gap-2 border-border/50">
                  <div className="flex items-center justify-between font-medium">
                    <span className="flex items-center gap-1 font-bold"><Navigation className="w-3.5 h-3.5 text-primary animate-pulse" /> Detour Guidance</span>
                    <Button variant="ghost" size="icon" onClick={() => {
                      setNavStep("idle");
                      if (map && map.getLayer("route-layer")) {
                        map.removeLayer("route-layer");
                        map.removeSource("route-source");
                      }
                    }} className="h-5 w-5 rounded-full"><XCircle className="w-3 h-3" /></Button>
                  </div>
                  {navStep === "routing" ? (
                    <>
                      <p className="text-orange-500 bg-orange-500/10 p-1.5 rounded font-semibold border border-orange-500/20">
                        Flooding detected. Rerouted automatically.
                      </p>
                      <Button onClick={triggerNavStart} className="w-full h-7 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-[10px] border-0">
                        Accept Detour
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-green-500 bg-green-500/10 p-1.5 rounded font-semibold border border-green-500/20">
                        Active guidance. Bypassing blockages.
                      </p>
                      <Button onClick={() => handleArriveDestination(5, "Hazard bypassed successfully.")} className="w-full h-7 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-[10px] border-0">
                        Arrived (+5 credits)
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* Details Popup when Marker is selected */}
              {selectedIncident && (
                <div className="absolute bottom-3 left-3 right-3 z-20 p-3 rounded-xl bg-background border border-border shadow-2xl flex flex-col gap-2 text-[10px] border-border/50">
                  <div className="flex items-center justify-between border-b pb-1 border-border/50">
                    <span className="font-bold capitalize">Alert: {selectedIncident.category === "FLOODING" ? "Flooding" : selectedIncident.category === "ACCIDENT" ? "Accident" : selectedIncident.category === "DEBRIS" ? "Road Debris" : "Pothole"}</span>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedIncident(null)} className="h-5 w-5 rounded-full"><XCircle className="w-3.5 h-3.5" /></Button>
                  </div>
                  <div className="flex gap-2">
                    {selectedIncident.reports?.[0]?.imageUrl && (
                      <img src={selectedIncident.reports[0].imageUrl} alt="attachment" className="w-12 h-12 object-cover rounded-lg border border-border/50" />
                    )}
                    <div className="flex-1">
                      <p className="font-bold">{selectedIncident.locationName}</p>
                      <p className="text-foreground font-semibold">{selectedIncident.description}</p>
                    </div>
                  </div>
                  <div className="bg-muted/50 p-2 rounded-lg text-foreground font-semibold leading-normal border text-[9px] border-border/50">
                    <strong>AI Recommendation: </strong> {selectedIncident.recommendation}
                  </div>
                  <div className="flex items-center justify-end gap-2 border-t pt-1.5 border-border/50">
                    <span className="text-[9px] text-foreground mr-auto">Is this incident cleared?</span>
                    <Button size="sm" variant="outline" onClick={async () => {
                      if (!session) {
                        toast.error("Please sign in to verify incident!");
                        return;
                      }
                      try {
                        await fetch("/api/navigation", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ action: "arrive", sessionId: "feedback", rating: 5, comment: "Incident cleared" }),
                        });
                        toast.success("Feedback recorded! +5 credits earned.");
                        fetchUserProfile();
                        setSelectedIncident(null);
                      } catch (e) { }
                    }} className="h-6 text-[8px] font-bold rounded-lg px-2 border-border/50"><CheckCircle className="w-3 h-3 text-green-500 mr-1" /> Yes, Cleared (+5)</Button>
                  </div>
                </div>
              )}

              {/* Floating Map Actions */}
              <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2">
                <Button onClick={() => {
                  if (!session) {
                    toast.error("Please sign in to use detour routing!");
                    return;
                  }
                  handleStartNavigation();
                }} disabled={isNavigating} className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg flex items-center justify-center border-0 hover:scale-105 transition-transform">
                  <Navigation className="w-4.5 h-4.5" />
                </Button>
                <Button onClick={() => {
                  if (!session) {
                    toast.error("Please sign in to report hazards!");
                    return;
                  }
                  setIsReportOpen(true);
                }} variant="outline" className="h-10 w-10 rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform border border-border bg-background hover:bg-accent text-foreground">
                  <Plus className="w-5 h-5" />
                </Button>
              </div>

              {/* Goong map container */}
              <div id="goong-map" className="w-full h-full bg-transparent" />
            </div>

          </div>
        </section>
      )}

      {/* Platform Features / Bento Grid Informational Section */}
      {activeTab === "home" && (
        <ModulesSection />
      )}

      {/* Floating Report Hazard Dialog */}
      {isReportOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border border-border shadow-2xl rounded-3xl w-full max-w-md p-6 flex flex-col gap-4 text-xs border-border/50">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-1">
                Report Road Hazard
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setIsReportOpen(false)} className="h-8 w-8 rounded-full"><XCircle className="w-5 h-5" /></Button>
            </div>

            <form onSubmit={handleReportSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <span className="font-bold text-foreground">Incident Category</span>
                <select value={reportCategory} onChange={(e) => setReportCategory(e.target.value)} className="p-3 border rounded-xl bg-background font-semibold border-border/50">
                  <option value="FLOODING">🌊 Flooding &amp; Puddles</option>
                  <option value="ACCIDENT">🚗 Traffic Accident</option>
                  <option value="DEBRIS">🌲 Road Obstacles &amp; Debris</option>
                  <option value="POTHOLES">🕳️ Potholes &amp; Damage</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="font-bold text-foreground">Hazard Coordinates (Selected via map click)</span>
                <div className="p-3 border rounded-xl bg-muted/30 font-mono text-[9px] text-foreground font-bold border-border/50">
                  Latitude: {reportLocation.lat.toFixed(6)}, Longitude: {reportLocation.lng.toFixed(6)}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="font-bold text-foreground">Attached Image (PII Automatically Scrubbed)</span>
                <div className="flex items-center gap-2">
                  <label className="flex-1 flex flex-col items-center justify-center p-2 border border-dashed rounded-xl cursor-pointer bg-muted/20 hover:bg-muted/30 border-border/50">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Upload className="w-4 h-4 text-foreground" />}
                    <span className="text-[9px] text-foreground font-bold mt-1">Upload photo</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                  {reportImage && (
                    <img src={reportImage} alt="preview" className="w-12 h-12 object-cover rounded-xl border border-border/50" />
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="font-bold text-foreground">Description &amp; Details</span>
                <textarea value={reportDesc} onChange={(e) => setReportDesc(e.target.value)} placeholder="Detail lane blockages, obstacle sizes, approximate depth..." className="p-3 border rounded-xl bg-background resize-none h-16 font-semibold border-border/50" />
              </div>

              <Button type="submit" className="w-full rounded-xl py-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs mt-1 border-0">Submit Report</Button>
            </form>
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

      {/* Redeem Vouchers Inline Tab Section */}
      {activeTab === "redeem" && (
        <section className="container mx-auto px-6 py-24 flex flex-col gap-6 text-xs max-w-4xl min-h-[calc(100vh-8rem)]">
          <div className="flex items-center justify-between border-b pb-4 border-border/50">
            <div>
              <h2 className="text-3xl font-bold text-foreground">Danh mục Đổi Voucher</h2>
              <p className="text-xs text-muted-foreground mt-1">Sử dụng điểm thưởng GoSafe tích lũy được từ việc báo cáo sự cố để nhận quà.</p>
            </div>
            <Award className="w-10 h-10 text-primary animate-pulse" />
          </div>

          <div className="p-5 rounded-3xl bg-card border border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-foreground">Ví điểm thưởng GoSafe</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
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
                  <p className="text-[10px] text-muted-foreground leading-normal mt-1">{voucher.description}</p>
                </div>
                <div className="flex items-center justify-between text-[10px] font-semibold pt-2 border-t border-border/50">
                  <span>Kho hàng: <span className="text-primary font-bold">{voucher.quantity} chiếc</span></span>
                  <Button
                    size="sm"
                    disabled={points < voucher.pointsRequired || voucher.quantity <= 0}
                    onClick={() => handleVoucherExchange(voucher.id, voucher.pointsRequired)}
                    className="h-7 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] font-bold border-0 px-3.5"
                  >
                    Đổi ngay
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Claimed History */}
          <div className="pt-6 border-t border-border/50 mt-4">
            <h4 className="font-bold text-xs text-foreground uppercase mb-3">Lịch sử đổi Voucher của bạn</h4>
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

      {/* User Profile Inline Tab Section */}
      {activeTab === "profile" && session && (
        <section className="container mx-auto px-6 py-24 flex flex-col gap-6 text-xs max-w-md min-h-[calc(100vh-8rem)]">
          <div className="flex items-center justify-between border-b pb-4 border-border/50">
            <h2 className="text-2xl font-bold text-foreground">Hồ sơ &amp; Thiết lập</h2>
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
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[8px] font-bold w-fit mt-1.5 uppercase">
                {session.user?.role || "MEMBER"}
              </span>
            </div>
          </div>

          {/* Credits Wallet */}
          <div className="flex justify-between items-center bg-card p-4 rounded-3xl border border-border/50">
            <div>
              <h4 className="font-bold text-xs text-foreground">Ví tích lũy điểm thưởng</h4>
              <p className="text-[10px] text-muted-foreground mt-0.5">Dùng để đổi quà tặng Voucher đối tác</p>
            </div>
            <span className="text-base font-bold text-primary">{points} pts</span>
          </div>

          {/* Mobile App Settings Group */}
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
            
            {/* Consent Toggle inside menu */}
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
            className="h-10 rounded-2xl mt-2 text-red-500 border-red-500/20 hover:bg-red-500/5 hover:text-red-500 font-bold text-xs"
          >
            Đăng xuất tài khoản
          </Button>
        </section>
      )}

      {/* Bottom Center Floating Navigation Bar */}
      {session && session.user && session.user.role !== "ADMIN" && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-background/80 backdrop-blur-md px-5 py-3 rounded-full border border-border shadow-lg flex items-center gap-4 w-fit select-none">
          
          {/* Tab 1: Home Map */}
          <button
            onClick={() => setActiveTab("home")}
            className={cn(
              "relative px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-colors border-0 bg-transparent cursor-pointer",
              activeTab === "home" ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "home" && (
              <motion.div
                layoutId="active-nav-pill"
                className="absolute inset-0 bg-primary rounded-full z-[-1]"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <Map className="w-4 h-4" />
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
            }}
            className={cn(
              "relative px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-colors border-0 bg-transparent cursor-pointer",
              activeTab === "navigation" ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "navigation" && (
              <motion.div
                layoutId="active-nav-pill"
                className="absolute inset-0 bg-primary rounded-full z-[-1]"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <Compass className="w-4 h-4" />
            <span>Navigation</span>
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
              "relative px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-colors border-0 bg-transparent cursor-pointer",
              activeTab === "redeem" ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "redeem" && (
              <motion.div
                layoutId="active-nav-pill"
                className="absolute inset-0 bg-primary rounded-full z-[-1]"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <Award className="w-4 h-4" />
            <span>Redemption</span>
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
              "relative px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-colors border-0 bg-transparent cursor-pointer",
              activeTab === "profile" ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === "profile" && (
              <motion.div
                layoutId="active-nav-pill"
                className="absolute inset-0 bg-primary rounded-full z-[-1]"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <User className="w-4 h-4" />
            <span>My Profile</span>
          </button>
        </div>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}