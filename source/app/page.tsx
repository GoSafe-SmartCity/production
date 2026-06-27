"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession, signIn } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { toast, Toaster } from "sonner";
import Script from "next/script";
import { 
  MapPin, AlertTriangle, Navigation, Award, Sliders, 
  Calendar, Users, CheckCircle, XCircle, Plus, Loader2, 
  Upload, Info, Bell, Shield, ArrowDown, Map, Compass, HardHat, Eye, Brain
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
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
          center: [106.7719, 10.8507], // center near HCMUTE campus
          zoom: 14,
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

      {/* Hero Section - Split Screen layout inspired by totnghiep.hcmute.edu.vn */}
      <section className="container relative z-10 min-h-[calc(100vh-4rem)] flex items-center justify-center py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full relative">
          
          {/* Left Column: Heading and description */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease }}
            className="flex flex-col text-left justify-center relative p-8 rounded-3xl overflow-hidden"
          >
            {/* Dot Pattern Background behind left column text */}
            <DotPattern
              width={16}
              height={16}
              cx={1}
              cy={1}
              cr={1}
              className="absolute inset-0 z-[-1] opacity-50 dark:opacity-30 [mask-image:radial-gradient(350px_circle_at_left_top,white,transparent)]"
            />

            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3 block">
              Bypass Danger. Earn Rewards.
            </span>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight leading-tight mb-6 text-foreground">
              <AuroraText>GoSafe</AuroraText> Active Traffic Hazard Routing
            </h1>

            <p className="text-sm text-muted-foreground leading-relaxed mb-8 max-w-lg">
              Navigate floods, potholes, and blocks in real-time. Report hazards to protect commuters and earn local merchant vouchers.
            </p>

            {/* Stats Bar */}
            <div className="grid grid-cols-3 gap-4 border-y py-4 mb-8 text-center sm:text-left max-w-md border-border/50">
              <div>
                <span className="text-2xl font-medium text-foreground">3</span>
                <p className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider">Active Hazards</p>
              </div>
              <div>
                <span className="text-2xl font-medium text-foreground">150+</span>
                <p className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider">Detours Guided</p>
              </div>
              <div>
                <span className="text-2xl font-medium text-foreground">100%</span>
                <p className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider">Scrubbed PII</p>
              </div>
            </div>

            {/* Action Area inside Hero */}
            <div className="max-w-md w-full">
              {!session ? (
                <div className="flex flex-col gap-3 items-start justify-center">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Login to continue</span>
                  <Button
                    onClick={() => signIn("google")}
                    className="rounded-full px-6 py-5 bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-2 border-0 shadow transition-all"
                  >
                    <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                    </svg>
                    Authenticate with Google
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={scrollToMap} className="rounded-full px-6 py-5 bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-2 border-0 shadow transition-all">
                    <Map className="w-4 h-4" /> Go to Live Map
                  </Button>
                  <Button variant="outline" onClick={handleConsentToggle} className="rounded-full px-6 py-5 font-medium text-xs flex items-center gap-1.5 border border-border/50">
                    {consent ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Eye className="w-4 h-4 text-muted-foreground" />} Consent Status: {consent ? "On" : "Off"}
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
            className="relative lg:absolute lg:right-[-120px] lg:top-0 lg:bottom-0 lg:h-full flex items-stretch justify-center lg:justify-end min-h-[380px] lg:w-[48vw] overflow-visible pointer-events-none"
          >
            {/* Glowing background radial */}
            <div className="absolute inset-0 z-[-1] bg-gradient-to-tr from-blue-500/10 via-indigo-500/5 to-transparent rounded-full filter blur-3xl" />

            <img 
              src="/assets/banner.png" 
              alt="GoSafe City Map Overview" 
              className="w-full h-full lg:h-full lg:max-w-none object-cover lg:object-left-top select-none"
            />
          </motion.div>
        </div>
      </section>

      {/* Script for Goong Map */}
      <Script
        src="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.js"
        strategy="afterInteractive"
        onLoad={() => setMapLoaded(true)}
      />

      {/* Map Section - Below Hero - OPEN TO EVERYONE (No session check) */}
      <section id="map-section" className="bg-muted/15 border-y border-border/40 py-16">
        <div className="container">
          
          <div className="text-left mb-8">
            <h2 className="text-3xl sm:text-4xl font-medium tracking-tight text-foreground">
              <AuroraText>Live Hazard Map</AuroraText>
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl mt-2 leading-relaxed">
              View live commuter overrides and CV camera feeds. Click coordinates to report new alerts.
            </p>
          </div>

          {/* The map card - ALWAYS RENDERED */}
          <div className="w-full border border-border/50 rounded-[32px] bg-card overflow-hidden shadow-2xl relative flex flex-col h-[600px]">
            
            {/* Map Info Bar */}
            <div className="px-5 py-3 border-b border-border/50 bg-muted/20 flex items-center justify-between text-[11px] font-medium">
              <div className="flex items-center gap-3">
                {session ? (
                  <>
                    <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-teal-400 via-indigo-500 to-purple-600 text-white font-medium flex items-center gap-1">
                      ✨ {points} credits
                    </span>
                    <span className="text-muted-foreground">|</span>
                    <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
                      <input 
                        type="checkbox" 
                        checked={consent} 
                        onChange={handleConsentToggle}
                        className="rounded border-border accent-indigo-500 cursor-pointer w-3.5 h-3.5"
                      />
                      Privacy Consent Logs
                    </label>
                  </>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-teal-400 via-indigo-500 to-purple-600 text-white font-medium">
                    ✨ Guest Mode - Sign in to earn credits
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider text-[9px]">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span>{session ? session.user?.role : "GUEST"} MODE</span>
              </div>
            </div>

            {/* Map rendering wrapper */}
            <div className="flex-1 relative overflow-hidden">
              
              {/* Weather widget */}
              {weather && (
                <div className="absolute top-3 left-3 z-20 p-2.5 rounded-xl bg-background/95 border shadow-md text-[10px] max-w-[150px] border-border/50">
                  <p className="font-medium uppercase text-muted-foreground text-[8px]">Weather Widget</p>
                  <p className="font-medium capitalize truncate text-foreground">{weather.description}</p>
                  <p className="text-muted-foreground mt-0.5">Rain: <strong>{weather.rainfall.toFixed(1)} mm</strong></p>
                </div>
              )}

              {/* Navigation simulation widget */}
              {navStep !== "idle" && (
                <div className="absolute top-3 right-3 z-20 p-3 rounded-xl bg-background border border-border shadow-lg w-[240px] text-[10px] flex flex-col gap-2 border-border/50">
                  <div className="flex items-center justify-between font-medium">
                    <span className="flex items-center gap-1"><Navigation className="w-3.5 h-3.5 text-blue-500 animate-pulse" /> Detour Routing</span>
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
                      <p className="text-orange-500 bg-orange-500/10 p-1.5 rounded font-medium border border-orange-500/20">
                        Active flood reported. Route recalculated.
                      </p>
                      <Button onClick={triggerNavStart} className="w-full h-7 rounded-lg bg-blue-500 text-white font-medium text-[10px] border-0">
                        Accept Detour
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-green-500 bg-green-500/10 p-1.5 rounded font-medium border border-green-500/20">
                        Active guide. Bypassing active blockages.
                      </p>
                      <Button onClick={() => handleArriveDestination(5, "Perfect bypass.")} className="w-full h-7 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-[10px] border-0">
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
                    <span className="font-medium capitalize">{selectedIncident.category} Alert</span>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedIncident(null)} className="h-5 w-5 rounded-full"><XCircle className="w-3.5 h-3.5" /></Button>
                  </div>
                  <div className="flex gap-2">
                    {selectedIncident.reports?.[0]?.imageUrl && (
                      <img src={selectedIncident.reports[0].imageUrl} alt="attachment" className="w-12 h-12 object-cover rounded-lg border border-border/50" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{selectedIncident.locationName}</p>
                      <p className="text-muted-foreground">{selectedIncident.description}</p>
                    </div>
                  </div>
                  <div className="bg-muted/50 p-2 rounded-lg text-muted-foreground leading-normal border text-[9px] border-border/50">
                    <strong>AI Navigation Advice: </strong> {selectedIncident.recommendation}
                  </div>
                  <div className="flex items-center justify-end gap-2 border-t pt-1.5 border-border/50">
                    <span className="text-[8px] text-muted-foreground mr-auto">Is this incident cleared?</span>
                    <Button size="sm" variant="outline" onClick={async () => {
                      if (!session) {
                        toast.error("Please sign in to verify incidents!");
                        return;
                      }
                      try {
                        await fetch("/api/navigation", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ action: "arrive", sessionId: "feedback", rating: 5, comment: "Incident cleared" }),
                        });
                        toast.success("Feedback recorded! +5 points awarded.");
                        fetchUserProfile();
                        setSelectedIncident(null);
                      } catch (e) {}
                    }} className="h-6 text-[8px] font-medium rounded-lg px-2 border-border/50"><CheckCircle className="w-3 h-3 text-green-500 mr-1" /> Yes, Cleared (+5)</Button>
                  </div>
                </div>
              )}

              {/* Floating Map Actions */}
              <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2">
                <Button onClick={() => {
                  if (!session) {
                    toast.error("Please sign in to access safety routing navigation!");
                    return;
                  }
                  handleStartNavigation();
                }} disabled={isNavigating} className="h-10 w-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center border-0 hover:scale-105 transition-transform">
                  <Navigation className="w-4.5 h-4.5" />
                </Button>
                <Button onClick={() => {
                  if (!session) {
                    toast.error("Please sign in to report road hazards!");
                    return;
                  }
                  setIsReportOpen(true);
                }} variant="outline" className="h-10 w-10 rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform border border-border bg-background hover:bg-accent text-foreground">
                  <Plus className="w-5 h-5" />
                </Button>
              </div>

              {/* Goong map container */}
              <div id="goong-map" className="w-full h-full bg-muted/20" />
            </div>

          </div>
        </div>
      </section>

      {/* Tabs & Vouchers Section - ONLY visible if logged in */}
      {session && (
        <section className="container py-16">
          <div className="w-full max-w-5xl mx-auto">
            
            <Tabs defaultValue="vouchers" className="w-full">
              <TabsList className={cn(
                "grid w-full max-w-[400px] mx-auto mb-10 rounded-3xl h-12 p-1.5 bg-background border border-border",
                session.user?.role === "ADMIN" ? "grid-cols-2" : "grid-cols-1 max-w-[200px]"
              )}>
                <TabsTrigger value="vouchers" className="rounded-2xl flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs font-medium border-0">
                  <Award className="w-4 h-4" />
                  Vouchers Catalog
                </TabsTrigger>
                {session.user?.role === "ADMIN" && (
                  <TabsTrigger value="admin" className="rounded-2xl flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs font-medium border-0">
                    <Sliders className="w-4 h-4" />
                    Admin Panel
                  </TabsTrigger>
                )}
              </TabsList>

              {/* VOUCHERS CATALOG CONTENT */}
              <TabsContent value="vouchers" className="mt-0 outline-none flex flex-col gap-8">
                
                <div className="p-6 rounded-3xl bg-gradient-to-r from-teal-400/5 via-indigo-500/5 to-purple-600/5 border border-indigo-500/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-medium">Credits Wallet Balance</h3>
                    <p className="text-xs text-muted-foreground">You currently have <strong>{points} credits</strong>. Exchange them for merchant vouchers below.</p>
                  </div>
                  <Award className="w-10 h-10 text-indigo-500 animate-pulse" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {vouchers.map((voucher: any) => (
                    <div key={voucher.id} className="p-5 rounded-2xl border bg-card flex flex-col justify-between gap-4 shadow-sm hover:shadow-md transition-shadow border-border/50">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between gap-2 border-b pb-2 border-border/50">
                          <h5 className="font-medium text-xs leading-snug">{voucher.title}</h5>
                          <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 font-medium text-[10px] whitespace-nowrap">
                            {voucher.pointsRequired} pts
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">{voucher.description}</p>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1.5 border-t border-border/50">
                        <span>Stock: <span className="font-medium text-foreground">{voucher.quantity}</span></span>
                        <Button 
                          size="sm"
                          disabled={points < voucher.pointsRequired || voucher.quantity <= 0}
                          onClick={() => handleVoucherExchange(voucher.id, voucher.pointsRequired)}
                          className="h-7 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-medium border-0"
                        >
                          Redeem
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Exchanged history */}
                <div className="pt-6 border-t border-border/50">
                  <h4 className="font-medium text-xs uppercase tracking-wider text-muted-foreground mb-4">My Claimed Voucher History</h4>
                  {claimedVouchers.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-xs border border-dashed rounded-2xl border-border/50">
                      You have not claimed any vouchers yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {claimedVouchers.map((c: any) => (
                        <div key={c.id} className="p-3.5 border rounded-2xl bg-card flex justify-between items-center text-xs shadow-sm border-border/50">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium">{c.voucher.title}</span>
                            <span className="font-mono text-[9px] text-muted-foreground uppercase">{c.voucher.code}</span>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] text-muted-foreground">{new Date(c.exchangedAt).toLocaleDateString()}</span>
                            <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 font-medium text-[8px] uppercase">{c.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </TabsContent>

              {/* ADMIN PANEL CONTENT */}
              {session.user?.role === "ADMIN" && (
                <TabsContent value="admin" className="mt-0 outline-none flex flex-col gap-6">
                  
                  {/* Admin subtabs navigation */}
                  <div className="flex border-b border-border text-xs gap-4 font-medium pb-1.5 overflow-x-auto border-border/50">
                    <button 
                      onClick={() => setActiveAdminSubTab("reports")} 
                      className={cn("pb-2 px-1 border-b-2 border-transparent transition-all whitespace-nowrap bg-transparent border-0", activeAdminSubTab === "reports" && "border-primary text-primary font-medium")}
                    >
                      Incident Reports ({pendingReports.length})
                    </button>
                    <button 
                      onClick={() => setActiveAdminSubTab("hazards")} 
                      className={cn("pb-2 px-1 border-b-2 border-transparent transition-all whitespace-nowrap bg-transparent border-0", activeAdminSubTab === "hazards" && "border-primary text-primary font-medium")}
                    >
                      Active Hazards ({getFilteredIncidents().length})
                    </button>
                    <button 
                      onClick={() => setActiveAdminSubTab("vouchers")} 
                      className={cn("pb-2 px-1 border-b-2 border-transparent transition-all whitespace-nowrap bg-transparent border-0", activeAdminSubTab === "vouchers" && "border-primary text-primary font-medium")}
                    >
                      Vouchers Manager
                    </button>
                    <button 
                      onClick={() => setActiveAdminSubTab("consent")} 
                      className={cn("pb-2 px-1 border-b-2 border-transparent transition-all whitespace-nowrap bg-transparent border-0", activeAdminSubTab === "consent" && "border-primary text-primary font-medium")}
                    >
                      Privacy Consent Logs
                    </button>
                  </div>

                  {/* Subtab: Pending reports */}
                  {activeAdminSubTab === "reports" && (
                    <div className="flex flex-col gap-3">
                      {pendingReports.length === 0 ? (
                        <div className="text-center py-10 border rounded-2xl text-muted-foreground text-xs border-border/50">
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
                                <span className="font-medium capitalize text-foreground">{rep.category} ({rep.type})</span>
                                <p className="text-muted-foreground mt-0.5">{rep.description}</p>
                                <span className="text-[9px] text-muted-foreground block mt-1">Coords: {rep.latitude.toFixed(4)}, {rep.longitude.toFixed(4)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 self-end sm:self-center">
                              <Button variant="outline" size="sm" onClick={() => handleRejectReport(rep.id)} className="h-8 rounded-xl px-3 text-[10px] text-red-500 border-red-500/20 font-medium">Reject</Button>
                              <Button size="sm" onClick={() => handleOpenApprove(rep)} className="h-8 rounded-xl px-3 text-[10px] bg-blue-600 hover:bg-blue-700 text-white font-medium border-0">Verify &amp; AI Assess</Button>
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
                        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="p-2 border rounded-xl bg-background font-medium border-border/50">
                          <option value="ALL">All Categories</option>
                          <option value="FLOODING">Flooding</option>
                          <option value="ACCIDENT">Accident</option>
                          <option value="DEBRIS">Debris</option>
                          <option value="POTHOLES">Potholes</option>
                        </select>
                        <select value={filterRiskLevel} onChange={(e) => setFilterRiskLevel(e.target.value)} className="p-2 border rounded-xl bg-background font-medium border-border/50">
                          <option value="ALL">All Risk Levels</option>
                          <option value="HIGH">High</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="LOW">Low</option>
                        </select>
                        <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="p-2 border rounded-xl bg-background w-28 border-border/50" />
                      </div>

                      <div className="flex flex-col gap-3">
                        {getFilteredIncidents().length === 0 ? (
                          <div className="text-center py-10 border rounded-2xl text-muted-foreground text-xs border-border/50">
                            No matching active hazards.
                          </div>
                        ) : (
                          getFilteredIncidents().map((inc: any) => (
                            <div key={inc.id} className="p-4 border rounded-2xl bg-card flex justify-between items-center text-xs shadow-sm border-border/50">
                              <div>
                                <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-medium uppercase mr-2", inc.riskLevel === "HIGH" ? "bg-red-500/10 text-red-500" : "bg-orange-500/10 text-orange-500")}>
                                  {inc.riskLevel} ({inc.riskScore}%)
                                </span>
                                <span className="font-medium text-foreground">{inc.locationName}</span>
                                <p className="text-muted-foreground mt-1">{inc.description}</p>
                              </div>
                              <Button variant="outline" size="sm" onClick={() => handleClearIncident(inc.id)} className="h-8 rounded-xl text-[10px] text-green-500 border-green-500/20 font-medium">Mark Cleared</Button>
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
                        <h4 className="font-medium mb-3">Add Merchant Voucher</h4>
                        <form onSubmit={handleAddVoucherSubmit} className="flex flex-col gap-3">
                          <div className="grid grid-cols-2 gap-2">
                            <input type="text" value={voucherCode} onChange={(e) => setVoucherCode(e.target.value)} placeholder="CODE" className="p-3 border rounded-xl bg-background uppercase font-mono border-border/50" />
                            <input type="text" value={voucherTitle} onChange={(e) => setVoucherTitle(e.target.value)} placeholder="Voucher Title" className="p-3 border rounded-xl bg-background border-border/50" />
                          </div>
                          <textarea value={voucherDesc} onChange={(e) => setVoucherDesc(e.target.value)} placeholder="Description details..." className="p-3 border rounded-xl bg-background h-16 resize-none border-border/50" />
                          <div className="grid grid-cols-2 gap-2">
                            <input type="number" value={voucherPoints} onChange={(e) => setVoucherPoints(parseInt(e.target.value) || 0)} placeholder="Points Required" className="p-3 border rounded-xl bg-background border-border/50" />
                            <input type="number" value={voucherQty} onChange={(e) => setVoucherQty(parseInt(e.target.value) || 0)} placeholder="Quantity" className="p-3 border rounded-xl bg-background border-border/50" />
                          </div>
                          <Button type="submit" className="h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium border-0">Add Voucher</Button>
                        </form>
                      </div>

                      <div className="p-5 border rounded-2xl bg-orange-50/5 flex flex-col gap-3 border-border/50">
                        <div className="flex items-center gap-1.5 text-orange-500 font-medium"><Bell className="w-4 h-4" /> Broadcast Emergency Notice</div>
                        <form onSubmit={handleBroadcastAlert} className="flex flex-col gap-2">
                          <input type="text" value={broadcastTitle} onChange={(e) => setBroadcastTitle(e.target.value)} placeholder="Notice Title" className="p-3 border rounded-xl bg-background border-border/50" />
                          <input type="text" value={broadcastMessage} onChange={(e) => setBroadcastMessage(e.target.value)} placeholder="Instruction message alert..." className="p-3 border rounded-xl bg-background border-border/50" />
                          <Button type="submit" className="h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium mt-1 border-0">Broadcast Alert</Button>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* Subtab: User consent */}
                  {activeAdminSubTab === "consent" && (
                    <div className="border rounded-2xl overflow-hidden text-xs shadow-sm border-border/50">
                      <table className="w-full">
                        <thead className="bg-muted text-muted-foreground text-[10px] font-medium border-b border-border/50">
                          <tr>
                            <th className="p-3 text-left">Commuter</th>
                            <th className="p-3 text-left">Consent Status</th>
                            <th className="p-3 text-left">Credits Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adminUsers.map((usr: any) => (
                            <tr key={usr.id} className="border-b last:border-0 hover:bg-muted/10 bg-card border-border/50">
                              <td className="p-3">
                                <p className="font-medium">{usr.name || "Anonymous"}</p>
                                <p className="text-[10px] text-muted-foreground">{usr.email}</p>
                              </td>
                              <td className="p-3">
                                <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-medium uppercase", usr.consent ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500")}>
                                  {usr.consent ? "Granted" : "Revoked"}
                                </span>
                              </td>
                              <td className="p-3 font-medium">{usr.points}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                </TabsContent>
              )}
            </Tabs>
          </div>
        </section>
      )}

      {/* Platform Features / Bento Grid Informational Section */}
      <section className="container pb-16 border-t pt-16 border-border/40">
        <div className="w-full max-w-5xl mx-auto">
          
          <div className="text-center mb-10">
            <span className="text-xs text-indigo-500 font-medium uppercase tracking-widest">Advanced Infrastructure</span>
            <h3 className="text-2xl font-medium text-foreground mt-2">GoSafe Key Modules</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Card 1: Local AI Scoring Engine (col-span-2) */}
            <div className="lg:col-span-2 p-8 rounded-3xl bg-card border border-border/50 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[220px] group hover:border-border transition-all">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                <Brain className="w-24 h-24 text-foreground" />
              </div>
              <div className="relative z-10 max-w-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-5 h-5 text-blue-500" />
                  <h4 className="font-semibold text-base text-foreground">Local AI Scoring Engine</h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Calculates risk score indexes dynamically from category base weights, report confidence scales, and weather multipliers.
                </p>
              </div>
              
              {/* Micro-UI mockup for visual accent */}
              <div className="mt-4 pt-4 border-t border-border/40 flex flex-wrap gap-4 items-center justify-between text-[10px] text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span>Category Weight: <span className="font-medium text-foreground">10.0</span></span>
                  <span>Confidence Index: <span className="font-medium text-foreground">94%</span></span>
                  <span>Weather Multiplier: <span className="font-medium text-foreground">1.2x</span></span>
                </div>
                <div className="px-2 py-0.5 rounded bg-red-500/10 text-red-500 font-semibold uppercase">Risk Level: High</div>
              </div>
            </div>

            {/* Card 2: Detour Routing Core (col-span-1) */}
            <div className="lg:col-span-1 p-8 rounded-3xl bg-card border border-border/50 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[220px] group hover:border-border transition-all">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                <Compass className="w-20 h-20 text-foreground" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <Compass className="w-5 h-5 text-indigo-500" />
                  <h4 className="font-semibold text-base text-foreground">Detour Routing Core</h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Queries the Goong direction API to redraw route guidelines around active high-danger zones to navigate users safely.
                </p>
              </div>
              <div className="text-[10px] text-indigo-500 font-medium hover:underline cursor-pointer flex items-center gap-1 mt-4">
                Explore Routing Core &rarr;
              </div>
            </div>

            {/* Card 3: Gamified Credits Economy (col-span-1) */}
            <div className="lg:col-span-1 p-8 rounded-3xl bg-card border border-border/50 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[220px] group hover:border-border transition-all">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                <Award className="w-20 h-20 text-foreground" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="w-5 h-5 text-emerald-500" />
                  <h4 className="font-semibold text-base text-foreground">Gamified Credits Economy</h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Distributes safety credits for submitting reports (+10 pts), route feedback (+5 pts), and resolving overlays to redeem merchant vouchers.
                </p>
              </div>
              <div className="text-[10px] text-emerald-500 font-medium hover:underline cursor-pointer flex items-center gap-1 mt-4">
                Redeem Rewards &rarr;
              </div>
            </div>

            {/* Card 4: Testimonial Quote & Smart City Map (col-span-2) */}
            <div className="lg:col-span-2 rounded-3xl border border-border/50 shadow-sm relative overflow-hidden flex flex-col lg:flex-row min-h-[220px] bg-zinc-950 text-white">
              {/* Background image half with overlay gradient */}
              <div className="lg:w-1/2 relative h-48 lg:h-auto overflow-hidden">
                <img 
                  src="/smart_city_nav_glow.png" 
                  alt="Smart City Navigation UI" 
                  className="absolute inset-0 w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-zinc-950" />
              </div>
              
              {/* Quote half */}
              <div className="lg:w-1/2 p-8 flex flex-col justify-center relative z-10">
                <span className="text-[10px] uppercase text-blue-400 font-semibold tracking-wider mb-2">Commuter Feedback</span>
                <blockquote className="text-xs italic text-zinc-300 leading-relaxed mb-4">
                  "GoSafe has transformed my commute. Getting real-time hazard routing on flood days saves me time and keeps me safe."
                </blockquote>
                <cite className="text-[10px] not-italic font-medium text-white">
                  — Minh Tuan, HCMUTE Commuter
                </cite>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* Floating Report Hazard Dialog */}
      {isReportOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border border-border shadow-2xl rounded-3xl w-full max-w-md p-6 flex flex-col gap-4 text-xs border-border/50">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm flex items-center gap-1">
                <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" /> Report Hazard
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setIsReportOpen(false)} className="h-8 w-8 rounded-full"><XCircle className="w-5 h-5" /></Button>
            </div>

            <form onSubmit={handleReportSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <span className="font-medium text-muted-foreground">Category</span>
                <select value={reportCategory} onChange={(e) => setReportCategory(e.target.value)} className="p-3 border rounded-xl bg-background border-border/50">
                  <option value="FLOODING">🌊 Flooding &amp; Puddles</option>
                  <option value="ACCIDENT">🚗 Accident blockage</option>
                  <option value="DEBRIS">🌲 Road Debris</option>
                  <option value="POTHOLES">🕳️ Potholes &amp; Cracks</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="font-medium text-muted-foreground">Location Coords (Selected by Clicking Map)</span>
                <div className="p-3 border rounded-xl bg-muted/30 font-mono text-[9px] text-muted-foreground border-border/50">
                  Lat: {reportLocation.lat.toFixed(6)}, Lng: {reportLocation.lng.toFixed(6)}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="font-medium text-muted-foreground">Attachment (PII Scrubbed)</span>
                <div className="flex items-center gap-2">
                  <label className="flex-1 flex flex-col items-center justify-center p-2 border border-dashed rounded-xl cursor-pointer bg-muted/20 hover:bg-muted/30 border-border/50">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-muted-foreground" />}
                    <span className="text-[9px] text-muted-foreground mt-1">Upload file</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                  {reportImage && (
                    <img src={reportImage} alt="preview" className="w-12 h-12 object-cover rounded-xl border border-border/50" />
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="font-medium text-muted-foreground">Description</span>
                <textarea value={reportDesc} onChange={(e) => setReportDesc(e.target.value)} placeholder="Detail lane blockages, obstacle sizes, approximate depth..." className="p-3 border rounded-xl bg-background resize-none h-16 border-border/50" />
              </div>

              <Button type="submit" className="w-full rounded-xl py-6 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs mt-1 border-0">Submit Report</Button>
            </form>
          </div>
        </div>
      )}

      {/* Admin Verification Modal */}
      {isApproveModalOpen && activeApproveReport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border border-border shadow-2xl rounded-3xl w-full max-w-md p-6 flex flex-col gap-3 text-xs border-border/50">
            <h3 className="font-medium text-sm text-green-600 flex items-center gap-1.5"><Shield className="w-4 h-4" /> AI Report Verification</h3>
            
            <div className="border-b pb-2 flex gap-2 border-border/50">
              {activeApproveReport.imageUrl && <img src={activeApproveReport.imageUrl} alt="attached" className="w-12 h-12 object-cover rounded-lg border border-border/50" />}
              <div>
                <p className="font-medium capitalize">{activeApproveReport.category}</p>
                <p className="text-muted-foreground text-[11px] leading-snug">{activeApproveReport.description}</p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-[10px] text-muted-foreground uppercase mb-1.5">AI Analysis Output</h4>
              {!approveAiResult ? (
                <div className="flex items-center justify-center gap-1.5 py-4 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin text-primary" /> Analysing report...</div>
              ) : (
                <div className="p-3 border rounded-xl bg-muted/40 flex flex-col gap-1 border-border/50">
                  <div className="flex justify-between items-center font-medium">
                    <span>Risk: {approveAiResult.riskScore}%</span>
                    <span className="uppercase text-[9px]">{approveAiResult.riskLevel} Risk</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-snug border-t pt-1 mt-1 border-border/50"><strong>Recommendation: </strong> {approveAiResult.recommendation}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <span className="font-semibold text-muted-foreground">Location Street Name</span>
              <input type="text" value={approveLocationName} onChange={(e) => setApproveLocationName(e.target.value)} placeholder="e.g. Vo Van Ngan St" className="p-3 border rounded-xl bg-background border-border/50" />
            </div>

            <div className="flex justify-end gap-2 border-t pt-3 border-border/50">
              <Button variant="outline" onClick={() => setIsApproveModalOpen(false)} className="h-8 rounded-xl text-[10px] font-medium border-border/50">Cancel</Button>
              <Button disabled={!approveAiResult || !approveLocationName} onClick={handleApproveReportSubmit} className="h-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-[10px] border-0">Approve &amp; Map overlay (+10 pts)</Button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer className={cn(session && "hidden md:block")} />
    </div>
  );
}