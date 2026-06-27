"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Camera, Users, CloudRain, ShieldCheck, MapPin, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Shared components & helper definitions
import { DataTable } from "../shared/data-table";
import { reportColumns, cameraDetectionColumns, weatherTelemetryColumns } from "../shared/columns";

// Sub-components & modals
import { FilterControls } from "./filter-controls";
import { TimelineScrubber } from "./timeline-scrubber";
import { GoongMapInline } from "./goong-map-inline";
import { ApproveModal } from "./modals/approve-modal";
import { CompareSliderModal } from "./modals/compare-slider-modal";
import { DecisionModal } from "./modals/decision-modal";
import { CrudIncidentModal } from "./modals/crud-incident-modal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function decodePolyline(encoded: string) {
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
}

export function FloodMapPage() {
    // Switcher Badges
    const [showCamera, setShowCamera] = useState(true);
    const [showFeedback, setShowFeedback] = useState(true);
    const [showWeather, setShowWeather] = useState(true);
    const [showDecision, setShowDecision] = useState(true);

    // Advanced timeline filters
    const [selectedDate, setSelectedDate] = useState("2026-06-27");
    const [selectedHour, setSelectedHour] = useState(23);
    const [searchKeyword, setSearchKeyword] = useState("");
    const [filterCategory, setFilterCategory] = useState("ALL");
    const [filterRiskLevel, setFilterRiskLevel] = useState("ALL");
    const [filterCameraId, setFilterCameraId] = useState("ALL");

    // Dynamic states loaded from API
    const [pendingReports, setPendingReports] = useState<any[]>([]);
    const [approvedReports, setApprovedReports] = useState<any[]>([]);
    const [cameraStations, setCameraStations] = useState<any[]>([]);
    const [weatherHistoryList, setWeatherHistoryList] = useState<any[]>([]);
    const [activeHazards, setActiveHazards] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Modals visibility and states
    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
    const [activeApproveReport, setActiveApproveReport] = useState<any | null>(null);
    const [selectedDetection, setSelectedDetection] = useState<any | null>(null);
    const [selectedDecisionDetail, setSelectedDecisionDetail] = useState<any | null>(null);
    const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
    const [selectedWeatherDetail, setSelectedWeatherDetail] = useState<any | null>(null);
    const [selectedReportDetail, setSelectedReportDetail] = useState<any | null>(null);
    
    const [isCrudModalOpen, setIsCrudModalOpen] = useState(false);
    const [activeIncident, setActiveIncident] = useState<any | null>(null);

    // Polyline road coordinates — fetched from Goong Directions API (same as homepage)
    const [floodedStreetCoords, setFloodedStreetCoords] = useState<[number, number][]>([
        [106.7991941, 10.8791999],
        [106.8004081, 10.8789166],
        [106.8013148, 10.8783257],
    ]);
    const [alternativeStreetCoords] = useState<[number, number][]>([]);

    const [activeMapSubTab, setActiveMapSubTab] = useState<"cameras" | "feedback" | "weather">("cameras");

    // Decode Goong polyline (same as homepage)
    const decodePolyline = useCallback((encoded: string): [number, number][] => {
        const points: [number, number][] = [];
        let index = 0, len = encoded.length;
        let lat = 0, lng = 0;
        while (index < len) {
            let b, shift = 0, result = 0;
            do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
            lat += ((result & 1) ? ~(result >> 1) : (result >> 1));
            shift = 0; result = 0;
            do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
            lng += ((result & 1) ? ~(result >> 1) : (result >> 1));
            points.push([lng / 1e5, lat / 1e5]);
        }
        return points;
    }, []);

    // Fetch real Marie Curie road path from Goong Directions API (same as homepage)
    useEffect(() => {
        const fetchRealStreetPath = async () => {
            try {
                const apiKey = process.env.NEXT_PUBLIC_GOONG_API_KEY || "2X3t5rZDLQiFHgLAdeGC8tkz2RZdTwfwMDtyFYSm";
                // Origin: William Shakespeare junction, Destination: east end of Marie Curie
                const res = await fetch(
                    `https://rsapi.goong.io/direction?origin=10.8791999,106.7991941&destination=10.8783257,106.8013148&vehicle=bike&api_key=${apiKey}`
                );
                if (res.ok) {
                    const data = await res.json();
                    const polyline = data.routes?.[0]?.overview_polyline?.points;
                    if (polyline) {
                        const decoded = decodePolyline(polyline);
                        if (decoded.length > 0) {
                            setFloodedStreetCoords(decoded);
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to fetch Goong street path: ", e);
            }
        };
        fetchRealStreetPath();
    }, [decodePolyline]);

    // Fetch handlers
    const fetchPendingReports = useCallback(async () => {
        try {
            const res = await fetch("/api/incidents?mode=reports&status=PENDING");
            if (res.ok) setPendingReports(await res.json());
        } catch (e) {
            console.error(e);
        }
    }, []);

    const fetchApprovedReports = useCallback(async () => {
        try {
            const res = await fetch("/api/incidents?mode=reports&status=APPROVED");
            if (res.ok) setApprovedReports(await res.json());
        } catch (e) {
            console.error(e);
        }
    }, []);

    const fetchActiveHazards = useCallback(async () => {
        try {
            const res = await fetch("/api/incidents");
            if (res.ok) setActiveHazards(await res.json());
        } catch (e) {
            console.error(e);
        }
    }, []);

    const fetchCameraDetections = useCallback(async () => {
        try {
            const res = await fetch("/api/camera/detections");
            if (res.ok) setCameraStations(await res.json());
        } catch (e) {
            console.error(e);
        }
    }, []);

    const fetchWeatherHistory = useCallback(async () => {
        try {
            const res = await fetch("/api/weather/history");
            if (res.ok) setWeatherHistoryList(await res.json());
        } catch (e) {
            console.error(e);
        }
    }, []);

    const loadAllData = useCallback(async () => {
        setIsLoading(true);
        await Promise.all([
            fetchPendingReports(),
            fetchApprovedReports(),
            fetchActiveHazards(),
            fetchCameraDetections(),
            fetchWeatherHistory()
        ]);
        setIsLoading(false);
    }, [fetchPendingReports, fetchApprovedReports, fetchActiveHazards, fetchCameraDetections, fetchWeatherHistory]);

    useEffect(() => {
        loadAllData();
    }, [loadAllData]);


    // Filter checker
    const matchesFilterQuery = useCallback((timestamp: string | Date, extraContent?: string) => {
        const date = new Date(timestamp);
        const dateStr = date.toISOString().split("T")[0];
        const hourVal = date.getHours();

        const isSameDate = dateStr === selectedDate;
        const beforeOrAtHour = hourVal <= selectedHour;

        let matchesSearch = true;
        if (searchKeyword && extraContent) {
            matchesSearch = extraContent.toLowerCase().includes(searchKeyword.toLowerCase());
        }

        return isSameDate && beforeOrAtHour && matchesSearch;
    }, [selectedDate, selectedHour, searchKeyword]);

    // Memoized filtered sets
    const filteredDetections = useMemo(() => {
        const list: any[] = [];
        cameraStations.forEach(st => {
            if (filterCameraId !== "ALL" && st.id !== filterCameraId) return;
            st.detections?.forEach((det: any) => {
                const withStationName = { ...det, station: { name: st.name } };
                if (matchesFilterQuery(det.timestamp, st.name + " " + det.stationId)) {
                    list.push(withStationName);
                }
            });
        });
        return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [cameraStations, filterCameraId, matchesFilterQuery]);

    const filteredReports = useMemo(() => {
        const allReports = [...pendingReports, ...approvedReports];
        return allReports.filter(rep => {
            const matchesCat = filterCategory === "ALL" || rep.category === filterCategory;
            const matchesRisk = filterRiskLevel === "ALL" || rep.riskLevel === filterRiskLevel;
            return matchesCat && matchesRisk && matchesFilterQuery(rep.createdAt, rep.description + " " + rep.category);
        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [pendingReports, approvedReports, filterCategory, filterRiskLevel, matchesFilterQuery]);

    const filteredWeather = useMemo(() => {
        return weatherHistoryList.filter(w =>
            matchesFilterQuery(w.createdAt, w.description)
        ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [weatherHistoryList, matchesFilterQuery]);

    // Modal Action triggers
    const handleVerifyReport = (report: any) => {
        setActiveApproveReport(report);
        setIsApproveModalOpen(true);
    };

    const handleApproveReportSubmit = async (reportId: string, locationName: string) => {
        try {
            const res = await fetch("/api/incidents/approve", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reportId, locationName }),
            });

            if (res.ok) {
                toast.success("Citizen report approved and mapped!");
                setIsApproveModalOpen(false);
                fetchActiveHazards();
                fetchPendingReports();
                fetchApprovedReports();
            } else {
                toast.error("Approval request failed");
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
                toast.success("Citizen report rejected.");
                fetchPendingReports();
                fetchApprovedReports();
            } else {
                toast.error("Rejection request failed");
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
                toast.success("Incident resolved and cleared!");
                fetchActiveHazards();
                fetchPendingReports();
                fetchApprovedReports();
            } else {
                toast.error("Failed to clear incident");
            }
        } catch (e) {
            toast.error("Failed to clear incident");
        }
    };

    // Incident CRUD submit
    const handleIncidentSubmit = async (payload: any) => {
        try {
            const res = await fetch(payload.id ? "/api/incidents" : "/api/incidents/approve", {
                method: payload.id ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload.id ? payload : {
                    directCreate: true,
                    category: payload.category,
                    riskLevel: payload.riskLevel,
                    riskScore: payload.riskScore,
                    locationName: payload.locationName,
                    description: payload.description,
                    recommendation: payload.recommendation,
                    latitude: payload.latitude,
                    longitude: payload.longitude,
                }),
            });

            if (res.ok) {
                toast.success(payload.id ? "Incident details updated!" : "New active incident logged!");
                setIsCrudModalOpen(false);
                fetchActiveHazards();
            } else {
                toast.error("Submit action failed");
            }
        } catch (e) {
            toast.error("Connection failed");
        }
    };

    const handleOpenAddIncident = () => {
        setActiveIncident(null);
        setIsCrudModalOpen(true);
    };

    const handleOpenEditIncident = (incident: any) => {
        setActiveIncident(incident);
        setIsCrudModalOpen(true);
    };

    const handleMapClick = (lat: number, lng: number) => {
        setActiveIncident({
            latitude: lat,
            longitude: lng,
            category: "FLOODING",
            riskLevel: "LOW",
            riskScore: 30,
            locationName: `Marie Curie St Coord (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
            description: "Flooding or hazard reported at selected map coordinate.",
            recommendation: "Detour recommended. Drive slowly."
        });
        setIsCrudModalOpen(true);
    };

    return (
        <div className="flex flex-col w-full">
            {/* Header */}
            <div className="px-8 pt-8 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Flood Map &amp; Traffic Overlays</h1>
                    <p className="text-sm text-slate-500 mt-1">Overlay live telemetry, CCTV feeds, and OpenWeather sensors. Make detour routing decisions.</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleOpenAddIncident} className="h-10 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold border border-primary/20 text-xs shadow-md">
                        <Plus className="w-4 h-4 mr-2" /> Log Incident Manually
                    </Button>
                </div>
            </div>

            <div className="w-full h-px bg-slate-200" />

            {/* Filter Configuration */}
            <div className="w-full bg-white border-b border-slate-200 px-8 py-5 flex flex-col gap-5 z-20 shadow-sm">
                <FilterControls 
                    filterCategory={filterCategory}
                    setFilterCategory={setFilterCategory}
                    filterRiskLevel={filterRiskLevel}
                    setFilterRiskLevel={setFilterRiskLevel}
                    showCamera={showCamera}
                    setShowCamera={setShowCamera}
                    showFeedback={showFeedback}
                    setShowFeedback={setShowFeedback}
                    showWeather={showWeather}
                    setShowWeather={setShowWeather}
                    showDecision={showDecision}
                    setShowDecision={setShowDecision}
                />

                <TimelineScrubber 
                    selectedDate={selectedDate}
                    setSelectedDate={setSelectedDate}
                    selectedHour={selectedHour}
                    setSelectedHour={setSelectedHour}
                />
            </div>

            {/* Inline Goong Map */}
            <GoongMapInline 
                showCamera={showCamera}
                showFeedback={showFeedback}
                showWeather={showWeather}
                showDecision={showDecision}
                cameraStations={cameraStations}
                filteredReports={filteredReports}
                filteredWeather={filteredWeather}
                floodedStreetCoords={floodedStreetCoords}
                alternativeStreetCoords={alternativeStreetCoords}
                matchesFilterQuery={matchesFilterQuery}
                activeHazards={activeHazards}
                onEditIncident={handleOpenEditIncident}
                onViewCameraDetection={(det) => {
                    setSelectedDetection(det);
                }}
                onVerifyReport={handleVerifyReport}
                onViewWeatherDetail={(w) => setSelectedWeatherDetail(w)}
                onViewDecisionDetail={(dec) => {
                    setSelectedDecisionDetail(dec);
                    setIsDecisionModalOpen(true);
                }}
                onMapClick={handleMapClick}
            />

            <div className="w-full h-px bg-slate-200" />

            {/* Bottom Portions: Tables */}
            <div className="px-8 py-6 flex flex-col gap-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3 max-w-lg w-full">
                        <input
                            type="text"
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            placeholder="Search tables for key terms..."
                            className="p-3 border rounded-2xl bg-white border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-primary w-full max-w-sm"
                        />
                        {activeMapSubTab === "cameras" && (
                            <Select value={filterCameraId} onValueChange={setFilterCameraId}>
                                <SelectTrigger className="w-[150px] h-10 rounded-2xl bg-white border-slate-200 text-xs font-bold text-slate-850">
                                    <SelectValue placeholder="All Cameras" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border border-slate-200 rounded-xl font-bold text-xs">
                                    <SelectItem value="ALL">All Cameras</SelectItem>
                                    <SelectItem value="CAM_01">Camera #1</SelectItem>
                                    <SelectItem value="CAM_02">Camera #2</SelectItem>
                                    <SelectItem value="CAM_03">Camera #3</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                    <Button 
                        onClick={() => {
                            loadAllData();
                            toast.success("Syncing neon database records!");
                        }}
                        className="h-10 rounded-2xl bg-slate-900 text-white font-bold text-xs border-0 px-4"
                    >
                        Sync Database Logs
                    </Button>
                </div>

                {/* Subtabs and Datatable list */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-slate-200">
                        <div className="flex text-xs gap-6 font-bold">
                            <button
                                onClick={() => setActiveMapSubTab("cameras")}
                                className={cn(
                                    "pb-3.5 px-1 border-b-2 border-transparent transition-all bg-transparent border-0 cursor-pointer text-xs font-bold flex items-center gap-1.5",
                                    activeMapSubTab === "cameras" ? "border-primary text-primary font-black" : "text-slate-500 hover:text-slate-800"
                                )}
                            >
                                <Camera className="w-4 h-4" /> CCTV Camera Detections ({filteredDetections.length})
                            </button>
                            <button
                                onClick={() => setActiveMapSubTab("feedback")}
                                className={cn(
                                    "pb-3.5 px-1 border-b-2 border-transparent transition-all bg-transparent border-0 cursor-pointer text-xs font-bold flex items-center gap-1.5",
                                    activeMapSubTab === "feedback" ? "border-primary text-primary font-black" : "text-slate-500 hover:text-slate-800"
                                )}
                            >
                                <Users className="w-4 h-4" /> Citizen Feedbacks ({filteredReports.length})
                            </button>
                            <button
                                onClick={() => setActiveMapSubTab("weather")}
                                className={cn(
                                    "pb-3.5 px-1 border-b-2 border-transparent transition-all bg-transparent border-0 cursor-pointer text-xs font-bold flex items-center gap-1.5",
                                    activeMapSubTab === "weather" ? "border-primary text-primary font-black" : "text-slate-500 hover:text-slate-800"
                                )}
                            >
                                <CloudRain className="w-4 h-4" /> OpenWeather API Logs ({filteredWeather.length})
                            </button>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col gap-4 py-8 animate-pulse">
                            <div className="h-10 bg-slate-200 rounded-2xl w-full" />
                            <div className="h-32 bg-slate-200 rounded-3xl w-full" />
                        </div>
                    ) : activeMapSubTab === "cameras" ? (
                        <DataTable
                            columns={cameraDetectionColumns}
                            data={filteredDetections}
                            searchColumnId="stationId"
                            searchPlaceholder="Search Camera ID..."
                            metaCallbacks={{
                                onViewCameraDetection: (det) => {
                                    setSelectedDetection(det);
                                }
                            }}
                        />
                    ) : activeMapSubTab === "feedback" ? (
                        <DataTable
                            columns={reportColumns}
                            data={filteredReports}
                            searchColumnId="category"
                            searchPlaceholder="Search category..."
                            metaCallbacks={{
                                onReject: handleRejectReport,
                                onApprove: handleVerifyReport,
                                onClear: handleClearIncident,
                                onViewDetail: (report) => setSelectedReportDetail(report)
                            }}
                        />
                    ) : (
                        <DataTable
                            columns={weatherTelemetryColumns}
                            data={filteredWeather}
                            searchColumnId="description"
                            searchPlaceholder="Search weather description..."
                        />
                    )}
                </div>
            </div>

            {/* Modals rendering */}
            {isApproveModalOpen && activeApproveReport && (
                <ApproveModal 
                    activeApproveReport={activeApproveReport}
                    onClose={() => setIsApproveModalOpen(false)}
                    onApprove={handleApproveReportSubmit}
                />
            )}

            {selectedDetection && (
                <CompareSliderModal 
                    selectedDetection={selectedDetection}
                    onClose={() => setSelectedDetection(null)}
                />
            )}

            {isDecisionModalOpen && selectedDecisionDetail && (
                <DecisionModal 
                    selectedDecisionDetail={selectedDecisionDetail}
                    onClose={() => setIsDecisionModalOpen(false)}
                />
            )}

            {/* Weather Detail Modal */}
            {selectedWeatherDetail && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in text-xs font-semibold text-slate-900">
                    <div className="bg-white border border-slate-250 rounded-3xl w-full max-w-md p-6 flex flex-col gap-4 shadow-2xl relative">
                        <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                            <h3 className="font-bold text-sm flex items-center gap-1.5 text-primary">
                                <CloudRain className="w-5 h-5 text-indigo-500 animate-pulse" /> Weather Station Telemetry
                            </h3>
                            <button onClick={() => setSelectedWeatherDetail(null)} className="h-6 w-6 rounded-full border-0 bg-transparent text-slate-450 hover:text-slate-650 cursor-pointer flex items-center justify-center">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex flex-col gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                            <span className="text-[10px] font-bold text-slate-500 uppercase leading-none">Telemetry Reading Spec</span>
                            <div className="h-px bg-slate-200 my-1" />
                            <div className="flex justify-between py-1 border-b border-slate-200/60 font-semibold text-slate-900">
                                <span className="text-slate-500 font-medium">Conditions:</span>
                                <span className="capitalize text-slate-800">{selectedWeatherDetail.description}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-200/60">
                                <span className="text-slate-500 font-medium">Temperature:</span>
                                <span className="text-slate-800">{selectedWeatherDetail.temperature.toFixed(1)} °C</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-200/60">
                                <span className="text-slate-500 font-medium">Precipitation / Rainfall:</span>
                                <span className="text-primary font-black">{selectedWeatherDetail.rainfall.toFixed(1)} mm</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-200/60">
                                <span className="text-slate-500 font-medium">Wind Speed:</span>
                                <span className="text-slate-800">{selectedWeatherDetail.windSpeed.toFixed(1)} m/s</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-200/60">
                                <span className="text-slate-500 font-medium">Atmospheric Pressure:</span>
                                <span className="text-slate-800">{selectedWeatherDetail.pressure} hPa</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-200/60">
                                <span className="text-slate-500 font-medium">Coordinates:</span>
                                <span className="text-slate-800">{selectedWeatherDetail.latitude.toFixed(5)}, {selectedWeatherDetail.longitude.toFixed(5)}</span>
                            </div>
                            <div className="flex justify-between py-1">
                                <span className="text-slate-500 font-medium">Logged At:</span>
                                <span className="text-slate-800">{new Date(selectedWeatherDetail.createdAt).toLocaleString('vi-VN')}</span>
                            </div>
                        </div>

                        <div className="flex justify-end border-t pt-4 border-slate-100">
                            <Button onClick={() => setSelectedWeatherDetail(null)} className="h-9.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 border-0">Close Telemetry</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Report Detail Modal */}
            {selectedReportDetail && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in text-xs font-semibold text-slate-900">
                    <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 flex flex-col gap-4 shadow-2xl relative">
                        <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                            <h3 className="font-bold text-sm flex items-center gap-1.5 text-primary">
                                <Users className="w-5 h-5 text-primary" /> Citizen Feedback Details
                            </h3>
                            <button onClick={() => setSelectedReportDetail(null)} className="h-6 w-6 rounded-full border-0 bg-transparent text-slate-450 hover:text-slate-650 cursor-pointer flex items-center justify-center">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-2 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 font-semibold text-slate-900">
                                <span className="text-[10px] font-bold text-slate-400 uppercase leading-none">Feedback Information</span>
                                <div className="h-px bg-slate-200 my-1" />
                                <div className="flex justify-between py-1 border-b border-slate-250/30">
                                    <span className="text-slate-500 font-medium">Incident Type:</span>
                                    <span className="font-bold uppercase text-slate-800">{selectedReportDetail.category}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-slate-250/30">
                                    <span className="text-slate-500 font-medium">Reporter:</span>
                                    <span className="text-slate-850 font-bold">{selectedReportDetail.reporter?.name || "Anonymous"}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-slate-250/30">
                                    <span className="text-slate-500 font-medium">Email:</span>
                                    <span className="text-slate-600">{selectedReportDetail.reporter?.email || "N/A"}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-slate-250/30">
                                    <span className="text-slate-500 font-medium">Coordinates:</span>
                                    <span className="text-slate-700">{selectedReportDetail.latitude.toFixed(5)}, {selectedReportDetail.longitude.toFixed(5)}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-slate-250/30">
                                    <span className="text-slate-500 font-medium">Status:</span>
                                    <span className={cn(
                                        "px-2 py-0.5 rounded text-[8px] font-bold uppercase",
                                        selectedReportDetail.status === "APPROVED" ? "bg-green-50 text-green-700 border border-green-200" :
                                        selectedReportDetail.status === "PENDING" ? "bg-orange-50 text-orange-700 border border-orange-200" :
                                        "bg-red-50 text-red-700 border border-red-200"
                                    )}>
                                        {selectedReportDetail.status}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-1 py-1">
                                    <span className="text-slate-500 font-medium">Description:</span>
                                    <p className="text-slate-700 font-normal leading-relaxed">{selectedReportDetail.description}</p>
                                </div>
                            </div>

                            {selectedReportDetail.imageUrl && (
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Evidence Photo (Crawled Google Image)</span>
                                    <div className="rounded-2xl overflow-hidden border border-slate-200 h-48 bg-slate-100 flex items-center justify-center relative shadow-inner">
                                        <img 
                                            src={selectedReportDetail.imageUrl} 
                                            alt="Evidence Photo" 
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80";
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end border-t pt-4 border-slate-100">
                            <Button onClick={() => setSelectedReportDetail(null)} className="h-9.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 border-0 cursor-pointer">
                                Close Details
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {isCrudModalOpen && (
                <CrudIncidentModal 
                    activeIncident={activeIncident}
                    onClose={() => setIsCrudModalOpen(false)}
                    onSubmit={handleIncidentSubmit}
                />
            )}
        </div>
    );
}
