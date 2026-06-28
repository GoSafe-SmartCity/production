"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Video, Calendar, Sliders, AlertCircle, RefreshCw, Clock, MapPin, Eye, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Script from "next/script";
import { CompareSliderModal } from "@/components/pages/manage/map/modals/compare-slider-modal";

// Define the static camera configuration
const CAMERA_CONFIGS: Record<string, {
    camIndex: number;
    videoPath: string;
    rawImage: string;
    segmentImage: string;
    lat: number;
    lng: number;
    depth: string;
    coverage: string;
    vehicles: string;
    name: string;
}> = {
    CAM_01: {
        camIndex: 1,
        videoPath: "http://localhost:8000/assets/vietnam_flood_cctv_1.mp4",
        rawImage: "/detections/cam1_raw_day_3.jpg",
        segmentImage: "/detections/cam1_segment_day_3.jpg",
        lat: 10.8791999,
        lng: 106.7991941,
        depth: "45 cm",
        coverage: "71.8%",
        vehicles: "4 stalled",
        name: "Đ. William Shakespeare / Marie Curie"
    },
    CAM_02: {
        camIndex: 2,
        videoPath: "http://localhost:8000/assets/vietnam_flood_cctv_2.mp4",
        rawImage: "/detections/cam2_raw_day_4.jpg",
        segmentImage: "/detections/cam2_segment_day_4.jpg",
        lat: 10.8789166,
        lng: 106.8004081,
        depth: "20 cm",
        coverage: "55.9%",
        vehicles: "1 stalled",
        name: "Đường Marie Curie, Đông Hoà"
    },
    CAM_03: {
        camIndex: 3,
        videoPath: "http://localhost:8000/assets/vietnam_flood_cctv_3.mp4",
        rawImage: "/detections/cam3_raw_day_6.jpg",
        segmentImage: "/detections/cam3_segment_day_6.jpg",
        lat: 10.8783257,
        lng: 106.8013148,
        depth: "5 cm (Low obstruction)",
        coverage: "46.1%",
        vehicles: "0 stalled",
        name: "Khu thực hành CNSH, Đông Hoà"
    }
};

// Associated incidents static data
const INCIDENTS_DATA = [
    {
        id: "inc_01",
        riskLevel: "HIGH",
        riskScore: 85,
        date: "2026-06-27",
        time: "08:55 PM",
        hour: 20, // 20:55
        locationName: "Đường William Shakespeare / Marie Curie, Đông Hòa",
        description: "Ngập nặng tại ngã tư Marie Curie – William Shakespeare. Mực nước đo được 45cm.",
        recommendation: "CẤM ĐƯỜNG. Mực nước quá sâu. Xe máy đi vòng qua đường nội bộ ĐHQG.",
        rawFramePath: "/detections/cam1_raw_day_3.jpg",
        segmentFramePath: "/detections/cam1_segment_day_3.jpg",
        waterDepthCm: 45,
        floodedAreaPct: 71.8,
        vehiclesCount: 4,
    },
    {
        id: "inc_02",
        riskLevel: "MEDIUM",
        riskScore: 58,
        date: "2026-06-27",
        time: "08:55 PM",
        hour: 20, // 20:55
        locationName: "Đường Marie Curie, Đông Hoà, Dĩ An",
        description: "Đọng nước 20cm sau cơn mưa lớn. Xe vẫn lưu thông chậm được.",
        recommendation: "NGẬP VỪA. Đi chậm, giữ ga đều. Không tắt máy giữa vùng ngập.",
        rawFramePath: "/detections/cam2_raw_day_4.jpg",
        segmentFramePath: "/detections/cam2_segment_day_4.jpg",
        waterDepthCm: 20,
        floodedAreaPct: 55.9,
        vehiclesCount: 1,
    },
    {
        id: "inc_03",
        riskLevel: "LOW",
        riskScore: 25,
        date: "2026-06-27",
        time: "08:55 PM",
        hour: 20, // 20:55
        locationName: "Khu thực hành CNSH, Đông Hoà, Dĩ An",
        description: "Cành cây gãy chắn ngang làn phải. Ảnh hưởng nhẹ đến giao thông.",
        recommendation: "NGUY CƠ THẤP. Đường thông, lái vòng qua chướng ngại vật.",
        rawFramePath: "/detections/cam3_raw_day_6.jpg",
        segmentFramePath: "/detections/cam3_segment_day_6.jpg",
        waterDepthCm: 5,
        floodedAreaPct: 46.1,
        vehiclesCount: 0,
    }
];

// Suppress Goong Map style errors in this view
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

export default function CameraDetailPage() {
    const params = useParams();
    const cameraId = typeof params?.id === "string" ? params.id : "CAM_01";
    const config = CAMERA_CONFIGS[cameraId] || CAMERA_CONFIGS.CAM_01;

    // View Tabs: "video" | "map"
    const [activeTab, setActiveTab] = useState<"video" | "map">("video");
    const [mapLoaded, setMapLoaded] = useState(false);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);

    // Filters for incidents
    const [selectedDate, setSelectedDate] = useState<string>("all");
    const [selectedHour, setSelectedHour] = useState<number>(24);

    // Comparison Modal pop-up dialog
    const [selectedIncidentForModal, setSelectedIncidentForModal] = useState<any | null>(null);

    // Initialize Goong Map inside tab
    useEffect(() => {
        if (activeTab === "map" && mapLoaded && typeof window !== "undefined" && mapContainerRef.current) {
            // @ts-ignore
            const goongjs = window.goongjs;
            if (!goongjs) return;

            const tilesKey = process.env.NEXT_PUBLIC_GOONG_MAP_KEY || "hkBRTOlzhKDE79Z6WGwQCgI9MTgsGXyUNC7jS8i3";
            goongjs.accessToken = tilesKey;

            // Clear previous map if any
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }

            const mapInstance = new goongjs.Map({
                container: mapContainerRef.current,
                style: "https://tiles.goong.io/assets/goong_map_web.json",
                center: [config.lng, config.lat],
                zoom: 16.5,
                pitch: 45
            });

            mapInstance.on("load", () => {
                mapRef.current = mapInstance;

                // Render camera custom marker
                const el = document.createElement("div");
                el.className = "flex items-center justify-center p-2 rounded-full border-2 border-primary bg-white shadow-xl hover:scale-105 transition-transform cursor-pointer";
                el.innerHTML = `
                    <div class="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <svg class="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M23 7l-7 5 7 5V7zM1 5h14v14H1V5z"/></svg>
                    </div>
                `;

                new goongjs.Marker(el)
                    .setLngLat([config.lng, config.lat])
                    .addTo(mapInstance);
            });
        }

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [activeTab, mapLoaded, config.lat, config.lng]);

    // Handle map focus
    const handleTriggerMap = () => {
        setActiveTab("map");
    };

    // Filters logic
    const filteredIncidents = useMemo(() => {
        return INCIDENTS_DATA.filter(inc => {
            const matchesDate = selectedDate === "all" || inc.date === selectedDate;
            const matchesHour = inc.hour <= selectedHour;
            return matchesDate && matchesHour;
        });
    }, [selectedDate, selectedHour]);

    return (
        <div className="flex flex-col gap-6 px-8 py-8 w-full font-inter bg-slate-50 min-h-screen">
            {/* Scripts for Goong Map */}
            <Script
                src="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.js"
                strategy="afterInteractive"
                onLoad={() => setMapLoaded(true)}
            />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/manage/camera">
                        <Button variant="outline" className="h-10 w-10 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center p-0 cursor-pointer shadow-sm">
                            <ArrowLeft className="w-5 h-5 text-slate-700" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                            <Video className="w-8 h-8 text-slate-900" /> {cameraId} Control Center
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">Live streaming &amp; AI incident association log.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="bg-emerald-50/10 text-emerald-600 font-extrabold text-[10px] px-3.5 py-1.5 rounded-full border border-emerald-500/20 tracking-wider uppercase flex items-center gap-1.5 shadow-sm">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span> ONLINE FEED
                    </span>
                </div>
            </div>

            <div className="w-full h-px bg-slate-200" />

            {/* Content split grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left side: Tab display & Specs */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                    {/* View Controls */}
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60 max-w-[280px] self-start gap-1 w-full font-semibold">
                        <button 
                            onClick={() => setActiveTab("video")} 
                            className={`flex-1 h-9 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all border-0 cursor-pointer ${activeTab === "video" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800 bg-transparent"}`}
                        >
                            <Video className="w-4 h-4" /> Live Video
                        </button>
                        <button 
                            onClick={() => setActiveTab("map")} 
                            className={`flex-1 h-9 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all border-0 cursor-pointer ${activeTab === "map" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800 bg-transparent"}`}
                        >
                            <MapPin className="w-4 h-4" /> Location Map
                        </button>
                    </div>

                    {/* Tab viewport */}
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative aspect-video flex items-center justify-center">
                        {activeTab === "video" && (
                            <video 
                                src={config.videoPath}
                                autoPlay
                                loop
                                muted
                                playsInline
                                controls
                                className="w-full h-full object-cover rounded-3xl"
                            />
                        )}

                        {activeTab === "map" && (
                            <div ref={mapContainerRef} className="w-full h-full relative" />
                        )}
                    </div>

                     {/* Camera Station Information */}
                    <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col gap-4 font-semibold text-slate-900">
                        <h3 className="font-black text-base text-slate-900 border-b pb-3 border-slate-100">Hardware &amp; Stream Specifications</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <span className="text-[10px] text-slate-450 uppercase tracking-wider">Device Model</span>
                                <span className="text-slate-800 font-extrabold text-sm">{config.name}</span>
                            </div>
                            <div className="flex flex-col gap-1 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <span className="text-[10px] text-slate-450 uppercase tracking-wider">AI Integration</span>
                                <span className="text-primary font-extrabold text-sm">YOLOv11 Flood Segmentation</span>
                            </div>
                            <div className="flex flex-col gap-1 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <span className="text-[10px] text-slate-450 uppercase tracking-wider">Coordinates</span>
                                <span className="text-slate-800 font-extrabold text-sm flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> {config.lat}, {config.lng}
                                </span>
                            </div>
                            <div className="flex flex-col gap-1 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <span className="text-[10px] text-slate-450 uppercase tracking-wider">AI Estimated Info</span>
                                <span className="text-slate-800 font-extrabold text-sm">
                                    Depth: {config.depth} | Coverage: {config.coverage}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right side: Incidents Filter & List */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                    <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col gap-5">
                        <div className="flex items-center justify-between border-b pb-4 border-slate-100 font-inter">
                            <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-slate-900" /> Associated Incidents
                            </h3>
                            <span className="bg-slate-100 text-slate-700 font-bold text-xs px-3 py-1 rounded-full border border-slate-200">
                                {filteredIncidents.length} listed
                            </span>
                        </div>

                        {/* Date & Time Scrubber Controls */}
                        <div className="flex flex-col gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 font-semibold">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] text-slate-450 uppercase tracking-wider font-extrabold flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" /> Filter by Date
                                </label>
                                <select 
                                    value={selectedDate} 
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white font-semibold text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary/30"
                                >
                                    <option value="all">All Dates</option>
                                    <option value="2026-06-27">2026-06-27</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-1.5 mt-2">
                                <div className="flex justify-between items-center text-[10px] text-slate-450 uppercase tracking-wider font-extrabold">
                                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Max Incident Hour</span>
                                    <span className="text-primary font-black">{selectedHour === 24 ? "24:00 (All Day)" : `${selectedHour}:00`}</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="24"
                                    value={selectedHour}
                                    onChange={(e) => setSelectedHour(Number(e.target.value))}
                                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary mt-1"
                                />
                                <div className="flex justify-between text-[9px] text-slate-400 font-medium">
                                    <span>00:00</span>
                                    <span>12:00</span>
                                    <span>24:00</span>
                                </div>
                            </div>
                        </div>

                        {/* Incident list body */}
                        <div className="flex flex-col gap-4">
                            {filteredIncidents.length === 0 ? (
                                <div className="text-center py-10 text-xs font-semibold text-slate-400">
                                    No incidents match filters.
                                </div>
                            ) : (
                                filteredIncidents.map((inc) => {
                                    let riskColor = "bg-blue-500/10 text-blue-600 border-blue-500/20";
                                    if (inc.riskLevel === "HIGH") riskColor = "bg-red-500/10 text-red-600 border-red-500/20";
                                    else if (inc.riskLevel === "MEDIUM") riskColor = "bg-orange-500/10 text-orange-600 border-orange-500/20";

                                    return (
                                        <div key={inc.id} className={`p-4 rounded-2xl border flex flex-col gap-3 shadow-xs ${inc.riskLevel === "HIGH" ? "border-red-500/20 bg-red-50/10" : inc.riskLevel === "MEDIUM" ? "border-orange-500/20 bg-orange-50/10" : "border-blue-500/20 bg-blue-50/10"}`}>
                                            <div className="flex items-center justify-between">
                                                <span className={`text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-md border ${riskColor}`}>
                                                    {inc.riskLevel} RISK ({inc.riskScore}%)
                                                </span>
                                                <span className="text-[10px] text-slate-450 font-bold flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> {inc.time}
                                                </span>
                                            </div>
                                            <div className="font-semibold">
                                                <h4 className="font-black text-xs text-slate-900 leading-tight">{inc.locationName}</h4>
                                                <p className="text-[11px] text-slate-500 mt-1 leading-normal font-medium">{inc.description}</p>
                                            </div>
                                            <div className="p-2.5 rounded-xl bg-white text-[10px] text-slate-600 font-semibold border border-slate-100 leading-relaxed shadow-sm">
                                                <span className="font-extrabold text-slate-800">Recommendation:</span> {inc.recommendation}
                                            </div>
                                            <div className="flex gap-2 pt-1">
                                                <Button 
                                                    onClick={() => setSelectedIncidentForModal(inc)} 
                                                    className="h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] flex-1 border-0 shadow-xs cursor-pointer"
                                                >
                                                    <Eye className="w-3 h-3 mr-1" /> See Comparison Frame
                                                </Button>
                                                <Button 
                                                    onClick={handleTriggerMap} 
                                                    className="h-8 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-bold text-[10px] flex-1 border border-slate-200 shadow-xs cursor-pointer"
                                                >
                                                    <MapPin className="w-3.5 h-3.5 mr-1" /> View on Map
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Compare slider modal pop-up dialog */}
            {selectedIncidentForModal && (
                <CompareSliderModal 
                    selectedDetection={{
                        rawFramePath: selectedIncidentForModal.rawFramePath,
                        segmentFramePath: selectedIncidentForModal.segmentFramePath,
                        waterDepthCm: selectedIncidentForModal.waterDepthCm,
                        floodedAreaPct: selectedIncidentForModal.floodedAreaPct,
                        vehiclesCount: selectedIncidentForModal.vehiclesCount,
                        station: { name: config.name }
                    }}
                    onClose={() => setSelectedIncidentForModal(null)}
                    initialTab="slider"
                />
            )}
        </div>
    );
}
