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
import { DotPattern } from "@/components/ui/dot-pattern";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { AuroraText } from "@/components/ui/aurora-text";

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

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
  const [activeTab, setActiveTab] = useState<"home" | "redeem" | "profile">("home");

  // Geolocation & Flooded Street States (Hardcoded to Developer Location in Mỹ Tho)
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>({ lat: 10.35746, lng: 106.36135 });

  // Fallback: decoded points of Hùng Vương Street to Trần Hưng Đạo route in Mỹ Tho
  const [floodedStreetCoords, setFloodedStreetCoords] = useState<[number, number][]>([
    [106.36442, 10.36209],
    [106.36437, 10.36124],
    [106.36198, 10.36168],
    [106.35813, 10.36437],
    [106.35729, 10.35833],
    [106.35783, 10.35792]
  ]);

  // Fallback: decoded alternative route coordinates in Mỹ Tho
  const [alternativeStreetCoords, setAlternativeStreetCoords] = useState<[number, number][]>([
    [106.36442, 10.36209],
    [106.36437, 10.36124],
    [106.3643, 10.36007],
    [106.36421, 10.35848],
    [106.36419, 10.35812],
    [106.36414, 10.35727],
    [106.36407, 10.35607],
    [106.36397, 10.35462],
    [106.36396, 10.35435],
    [106.36211, 10.35445],
    [106.36139, 10.35449],
    [106.36078, 10.35454],
    [106.35978, 10.35514],
    [106.35923, 10.35556],
    [106.35878, 10.3559],
    [106.35818, 10.35636],
    [106.35792, 10.35656],
    [106.35799, 10.35745],
    [106.35783, 10.35792]
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
        const res = await fetch(`https://rsapi.goong.io/direction?origin=10.3621,106.3642&destination=10.3579,106.3578&vehicle=bike&alternatives=true&api_key=${apiKey}`);
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
          <div class="flex items-center gap-3">
            <span class="text-lg sm:text-xl md:text-2xl">⚠️</span>
            <span class="font-extrabold text-sm sm:text-base md:text-lg text-neutral-900 dark:text-neutral-100 tracking-normal leading-relaxed">
              Đoạn đường <span class="text-[#00a850] dark:text-[#05c46b] font-black">Võ Thị Sáu</span> sắp ngập trong <span class="text-yellow-600 dark:text-yellow-400 font-black">10 phút</span> tới
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

    incidents.forEach((inc: any) => {
      if (inc.status !== "ACTIVE") return;

      let markerColor = "#3b82f6";
      if (inc.riskLevel === "HIGH") markerColor = "#ef4444";
      else if (inc.riskLevel === "MEDIUM") markerColor = "#f97316";

      const el = document.createElement("div");
      el.className = "cursor-pointer group flex items-center justify-center p-2 rounded-full border bg-background shadow-lg transition-transform hover:scale-105";
      el.style.borderColor = markerColor;
      el.innerHTML = `
        <div class="w-6 h-6 rounded-full flex items-center justify-center" style="background-color: ${markerColor}20; color: ${markerColor}">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
      `;

      el.addEventListener("click", () => {
        setSelectedIncident(inc);
      });

      const marker = new goongjs.Marker(el)
        .setLngLat([inc.longitude, inc.latitude])
        .addTo(map);

      markersRef.current.push(marker);

      if (mapHero) {
        const elHero = document.createElement("div");
        elHero.className = "flex items-center justify-center p-1 rounded-full border bg-background shadow-md";
        elHero.style.borderColor = markerColor;
        elHero.innerHTML = `
          <div class="w-3.5 h-3.5 rounded-full flex items-center justify-center" style="background-color: ${markerColor}20; color: ${markerColor}">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
        `;
        const markerHero = new goongjs.Marker(elHero)
          .setLngLat([inc.longitude, inc.latitude])
          .addTo(mapHero);

        heroMarkersRef.current.push(markerHero);
      }
    });
  }, [map, mapHero, incidents]);

  useEffect(() => {
    if (map && incidents.length > 0) {
      renderMarkers();
    }
  }, [map, mapHero, incidents, renderMarkers]);

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
      <section className="relative z-10 min-h-[calc(100vh-4rem)] flex flex-col lg:flex-row items-stretch w-full overflow-hidden border-b border-border/40">

        {/* Left Column: Heading and description */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease }}
          className="w-full lg:w-1/2 flex flex-col justify-center relative pt-28 pb-16 lg:py-16 px-6 sm:px-12 lg:pl-[calc((100vw-min(100vw,1400px))/2+2rem)] lg:pr-16 z-10"
        >
          {/* Grid Pattern Background visible behind left column text */}
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
              "[mask-image:radial-gradient(400px_circle_at_center,white,transparent)]",
              "inset-x-0 inset-y-[-30%] h-[200%] skew-y-12",
              "absolute inset-0 z-[-1] opacity-70 stroke-gray-300 dark:stroke-zinc-800 fill-blue-500/5 dark:fill-blue-500/10"
            )}
          />

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
          className="w-full lg:w-1/2 lg:absolute lg:right-0 lg:top-0 lg:bottom-0 relative h-[380px] lg:h-auto overflow-hidden bg-transparent"
        >
          {/* Glowing background radial */}
          <div className="absolute inset-0 z-10 rounded-full filter blur-3xl" />

          <img
            src="/assets/banner.png"
            alt="GoSafe City Map Overview"
            className="absolute inset-0 w-full h-full object-cover object-left-top select-none"
          />
        </motion.div>
      </section>

      {/* Script for Goong Map */}
      <Script
        src="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.js"
        strategy="afterInteractive"
        onLoad={() => setMapLoaded(true)}
      />

      {/* Map Section - Below Hero - OPEN TO EVERYONE (No session check) */}
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



            {/* Navigation simulation widget */}
            {navStep !== "idle" && (
              <div className="absolute top-3 right-3 z-20 p-3 rounded-xl bg-background border border-border shadow-lg w-[240px] text-[10px] flex flex-col gap-2 border-border/50">
                <div className="flex items-center justify-between font-medium">
                  <span className="flex items-center gap-1 font-bold"><Navigation className="w-3.5 h-3.5 text-primary animate-pulse" /> Detour Routing</span>
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

      {/* Admin Control Panel Section - ONLY visible if logged in as Admin */}
      {session && session.user?.role === "ADMIN" && (
        <section className="container py-16">
          <div className="w-full max-w-5xl mx-auto flex flex-col gap-6">
            <h3 className="text-xl font-bold border-b pb-3 border-border/50">Admin Control Panel</h3>

            {/* Admin subtabs navigation */}
            <div className="flex border-b border-border text-xs gap-4 font-medium pb-1.5 overflow-x-auto border-border/50">
              <button
                onClick={() => setActiveAdminSubTab("reports")}
                className={cn("pb-2 px-1 border-b-2 border-transparent transition-all whitespace-nowrap bg-transparent border-0", activeAdminSubTab === "reports" && "border-primary text-primary font-bold")}
              >
                Incident Reports ({pendingReports.length})
              </button>
              <button
                onClick={() => setActiveAdminSubTab("hazards")}
                className={cn("pb-2 px-1 border-b-2 border-transparent transition-all whitespace-nowrap bg-transparent border-0", activeAdminSubTab === "hazards" && "border-primary text-primary font-bold")}
              >
                Active Hazards ({getFilteredIncidents().length})
              </button>
              <button
                onClick={() => setActiveAdminSubTab("vouchers")}
                className={cn("pb-2 px-1 border-b-2 border-transparent transition-all whitespace-nowrap bg-transparent border-0", activeAdminSubTab === "vouchers" && "border-primary text-primary font-bold")}
              >
                Vouchers Manager
              </button>
              <button
                onClick={() => setActiveAdminSubTab("consent")}
                className={cn("pb-2 px-1 border-b-2 border-transparent transition-all whitespace-nowrap bg-transparent border-0", activeAdminSubTab === "consent" && "border-primary text-primary font-bold")}
              >
                Privacy Consent Logs
              </button>
            </div>

            {/* Subtab: Pending reports */}
            {activeAdminSubTab === "reports" && (
              <div className="flex flex-col gap-3">
                {pendingReports.length === 0 ? (
                  <div className="text-center py-10 border rounded-2xl text-foreground text-xs border-border/50">
                    No pending incident reports.
                  </div>
                ) : (
                  pendingReports.map((rep: any) => (
                    <div key={rep.id} className="p-4 border rounded-2xl bg-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs shadow-sm border-border/50">
                      <div className="flex gap-3">
                        {rep.imageUrl && (
                          <img src={rep.imageUrl} alt="attached" className="w-12 h-12 object-cover rounded-xl border border-border/50" />
                        )}
                        <div>
                          <span className="font-bold capitalize text-foreground">{rep.category === "FLOODING" ? "Flooding" : rep.category === "ACCIDENT" ? "Accident" : rep.category === "DEBRIS" ? "Road Debris" : "Pothole"} ({rep.type})</span>
                          <p className="text-foreground mt-0.5 font-medium">{rep.description}</p>
                          <span className="text-[9px] text-foreground font-semibold block mt-1">Coordinates: {rep.latitude.toFixed(4)}, {rep.longitude.toFixed(4)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <Button variant="outline" size="sm" onClick={() => handleRejectReport(rep.id)} className="h-8 rounded-xl px-3 text-[10px] text-red-500 border-red-500/20 font-bold">Reject</Button>
                        <Button size="sm" onClick={() => handleOpenApprove(rep)} className="h-8 rounded-xl px-3 text-[10px] bg-primary hover:bg-primary/90 text-primary-foreground font-bold border-0">Verify &amp; AI Assess</Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Subtab: Active Hazards */}
            {activeAdminSubTab === "hazards" && (
              <div className="flex flex-col gap-4">
                {/* Advanced filters */}
                <div className="flex flex-wrap gap-2 text-[10px]">
                  <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="p-2 border rounded-xl bg-background font-bold border-border/50">
                    <option value="ALL">All Categories</option>
                    <option value="FLOODING">Flooding</option>
                    <option value="ACCIDENT">Accident</option>
                    <option value="DEBRIS">Debris</option>
                    <option value="POTHOLES">Potholes</option>
                  </select>
                  <select value={filterRiskLevel} onChange={(e) => setFilterRiskLevel(e.target.value)} className="p-2 border rounded-xl bg-background font-bold border-border/50">
                    <option value="ALL">All Risk Levels</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                  <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="p-2 border rounded-xl bg-background w-28 border-border/50 font-bold" />
                </div>

                <div className="flex flex-col gap-3">
                  {getFilteredIncidents().length === 0 ? (
                    <div className="text-center py-10 border rounded-2xl text-foreground text-xs border-border/50">
                      No matching active hazards.
                    </div>
                  ) : (
                    getFilteredIncidents().map((inc: any) => (
                      <div key={inc.id} className="p-4 border rounded-2xl bg-card flex justify-between items-center text-xs shadow-sm border-border/50">
                        <div>
                          <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-bold uppercase mr-2", inc.riskLevel === "HIGH" ? "bg-red-500/10 text-red-500" : "bg-orange-500/10 text-orange-500")}>
                            {inc.riskLevel === "HIGH" ? "HIGH" : inc.riskLevel === "MEDIUM" ? "MEDIUM" : "LOW"} ({inc.riskScore}%)
                          </span>
                          <span className="font-bold text-foreground">{inc.locationName}</span>
                          <p className="text-foreground font-medium mt-1">{inc.description}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleClearIncident(inc.id)} className="h-8 rounded-xl text-[10px] text-green-500 border-green-500/20 font-bold">Mark Cleared</Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Subtab: Vouchers creation */}
            {activeAdminSubTab === "vouchers" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div className="p-5 border rounded-2xl bg-card border-border/50">
                  <h4 className="font-bold mb-3">Add Voucher</h4>
                  <form onSubmit={handleAddVoucherSubmit} className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" value={voucherCode} onChange={(e) => setVoucherCode(e.target.value)} placeholder="VOUCHER CODE" className="p-3 border rounded-xl bg-background uppercase font-mono font-bold border-border/50" />
                      <input type="text" value={voucherTitle} onChange={(e) => setVoucherTitle(e.target.value)} placeholder="Voucher Title" className="p-3 border rounded-xl bg-background font-bold border-border/50" />
                    </div>
                    <textarea value={voucherDesc} onChange={(e) => setVoucherDesc(e.target.value)} placeholder="Description details..." className="p-3 border rounded-xl bg-background h-16 resize-none font-bold border-border/50" />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" value={voucherPoints} onChange={(e) => setVoucherPoints(parseInt(e.target.value) || 0)} placeholder="Points Required" className="p-3 border rounded-xl bg-background font-bold border-border/50" />
                      <input type="number" value={voucherQty} onChange={(e) => setVoucherQty(parseInt(e.target.value) || 0)} placeholder="Quantity" className="p-3 border rounded-xl bg-background font-bold border-border/50" />
                    </div>
                    <Button type="submit" className="h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold border-0">Add Voucher</Button>
                  </form>
                </div>

                <div className="p-5 border rounded-2xl bg-orange-50/5 flex flex-col gap-3 border-border/50">
                  <div className="flex items-center gap-1.5 text-orange-500 font-bold"><Bell className="w-4 h-4" /> Broadcast Emergency Notice</div>
                  <form onSubmit={handleBroadcastAlert} className="flex flex-col gap-2">
                    <input type="text" value={broadcastTitle} onChange={(e) => setBroadcastTitle(e.target.value)} placeholder="Notice Title" className="p-3 border rounded-xl bg-background font-bold border-border/50" />
                    <input type="text" value={broadcastMessage} onChange={(e) => setBroadcastMessage(e.target.value)} placeholder="Instruction message alert..." className="p-3 border rounded-xl bg-background font-bold border-border/50" />
                    <Button type="submit" className="h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold mt-1 border-0">Broadcast Alert</Button>
                  </form>
                </div>
              </div>
            )}

            {/* Subtab: User consent */}
            {activeAdminSubTab === "consent" && (
              <div className="border rounded-2xl overflow-hidden text-xs shadow-sm border-border/50">
                <table className="w-full">
                  <thead className="bg-muted text-foreground text-[10px] font-bold border-b border-border/50">
                    <tr>
                      <th className="p-3 text-left">User</th>
                      <th className="p-3 text-left">Consent Status</th>
                      <th className="p-3 text-left">Credits Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminUsers.map((usr: any) => (
                      <tr key={usr.id} className="border-b last:border-0 hover:bg-muted/10 bg-card border-border/50 font-bold">
                        <td className="p-3">
                          <p className="font-bold">{usr.name || "Anonymous"}</p>
                          <p className="text-[10px] text-foreground/75 font-semibold">{usr.email}</p>
                        </td>
                        <td className="p-3">
                          <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold uppercase", usr.consent ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500")}>
                            {usr.consent ? "GRANTED" : "REVOKED"}
                          </span>
                        </td>
                        <td className="p-3 font-bold">{usr.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Platform Features / Bento Grid Informational Section */}
      <ModulesSection />

      {/* Floating Report Hazard Dialog */}
      {isReportOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border border-border shadow-2xl rounded-3xl w-full max-w-md p-6 flex flex-col gap-4 text-xs border-border/50">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-1">
                <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" /> Report Road Hazard
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

      {/* Vouchers Catalog Modal (Redeem Tab) */}
      {activeTab === "redeem" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border border-border shadow-2xl rounded-3xl w-full max-w-2xl p-6 flex flex-col gap-4 text-xs border-border/50 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-border/50">
              <h3 className="font-bold text-sm flex items-center gap-1.5">
                <Award className="w-5 h-5 text-primary" /> Vouchers Catalog
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setActiveTab("home")} className="h-8 w-8 rounded-full">
                <XCircle className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold">Credits Wallet Balance</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  You currently have <strong className="text-primary">{points} credits</strong>. Exchange them for vouchers below.
                </p>
              </div>
              <Award className="w-8 h-8 text-primary animate-pulse" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {vouchers.map((voucher: any) => (
                <div key={voucher.id} className="p-4 rounded-xl border bg-card flex flex-col justify-between gap-3 shadow-sm border-border/50">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2 border-b pb-1.5 border-border/50">
                      <h5 className="font-bold text-xs leading-snug">{voucher.title}</h5>
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[9px]">
                        {voucher.pointsRequired} pts
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-normal">{voucher.description}</p>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-semibold pt-1 border-t border-border/50">
                    <span>Stock: <span className="text-primary font-bold">{voucher.quantity}</span></span>
                    <Button
                      size="sm"
                      disabled={points < voucher.pointsRequired || voucher.quantity <= 0}
                      onClick={() => handleVoucherExchange(voucher.id, voucher.pointsRequired)}
                      className="h-6 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-[9px] font-bold border-0 px-2.5"
                    >
                      Redeem
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Claimed History */}
            <div className="pt-4 border-t border-border/50">
              <h4 className="font-semibold text-[10px] uppercase tracking-wider text-muted-foreground mb-3">Claimed Voucher History</h4>
              {claimedVouchers.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-[10px] border border-dashed rounded-xl border-border/50">
                  You have not claimed any vouchers yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {claimedVouchers.map((c: any) => (
                    <div key={c.id} className="p-2.5 border rounded-xl bg-card flex justify-between items-center text-[10px] shadow-sm border-border/50">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">{c.voucher.title}</span>
                        <span className="font-mono text-[8px] text-primary uppercase">{c.voucher.code}</span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[9px] text-muted-foreground">{new Date(c.exchangedAt).toLocaleDateString()}</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-green-500/10 text-green-600 font-medium text-[7px] uppercase">{c.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile & Settings Modal */}
      {activeTab === "profile" && session && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border border-border shadow-2xl rounded-3xl w-full max-w-md p-6 flex flex-col gap-4 text-xs border-border/50">
            <div className="flex items-center justify-between border-b pb-3 border-border/50">
              <h3 className="font-bold text-sm flex items-center gap-1.5">
                <User className="w-5 h-5 text-primary" /> My Profile &amp; Settings
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setActiveTab("home")} className="h-8 w-8 rounded-full">
                <XCircle className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex items-center gap-3 p-2 border-b pb-4 border-border/50">
              <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-primary/20">
                <img
                  src={session.user?.image || "/logo.png"}
                  alt={session.user?.name || "User"}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-foreground">{session.user?.name}</span>
                <span className="text-[10px] text-muted-foreground">{session.user?.email}</span>
                <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[8px] font-bold w-fit mt-1 uppercase tracking-wider">
                  {session.user?.role || "MEMBER"}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center bg-card p-3.5 rounded-xl border border-border/50">
                <div>
                  <h4 className="font-bold text-xs">Credits Wallet</h4>
                  <p className="text-[10px] text-muted-foreground">Exchangeable for merchant vouchers</p>
                </div>
                <span className="text-base font-bold text-primary">✨ {points} pts</span>
              </div>

              {/* Privacy settings */}
              <div className="flex flex-col gap-2 p-3.5 rounded-xl border bg-card border-border/50">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Privacy Consent</span>
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
                <p className="text-[10px] text-muted-foreground leading-normal">
                  Opt-in to share real-time anonymous location and road hazard reports to help build sustainable cities.
                </p>
              </div>

              {/* Log Out action */}
              <Button
                variant="outline"
                onClick={() => signOut()}
                className="h-10 rounded-xl mt-2 text-red-500 border-red-500/20 hover:bg-red-500/5 hover:text-red-500 font-bold text-xs"
              >
                Sign Out / Log Out
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Center Floating Navigation Bar */}
      {session && session.user && session.user.role !== "ADMIN" && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-background/95 backdrop-blur-md px-4 py-2.5 rounded-full border border-border shadow-2xl flex items-center gap-3 w-fit select-none">
          
          {/* Tab 1: Home Navigation */}
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
            <span>Home Map</span>
            {/* Badge for Navigation / Reports */}
            {(isNavigating || pendingReports.length > 0) && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}
          </button>

          {/* Tab 2: Redeem */}
          <button
            onClick={() => {
              if (!session) {
                toast.error("Please sign in to view vouchers!");
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
            <span>Redeem</span>
            {points > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[8px] font-bold">
                {points}
              </span>
            )}
          </button>

          {/* Tab 3: Profile */}
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
            <span>Profile</span>
          </button>
        </div>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}