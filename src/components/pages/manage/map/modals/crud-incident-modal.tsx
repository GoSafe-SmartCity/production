"use client";

import React, { useState, useEffect, useRef } from "react";
import Script from "next/script";
import { MapPin, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CrudIncidentModalProps {
    activeIncident: any | null;
    onClose: () => void;
    onSubmit: (payload: any) => Promise<void>;
}

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

export function CrudIncidentModal({
    activeIncident,
    onClose,
    onSubmit
}: CrudIncidentModalProps) {
    const [mapLoaded, setMapLoaded] = useState(false);
    
    // Form fields
    const [incidentCategory, setIncidentCategory] = useState(activeIncident ? activeIncident.category : "FLOODING");
    const [incidentRiskLevel, setIncidentRiskLevel] = useState(activeIncident ? activeIncident.riskLevel : "LOW");
    const [incidentRiskScore, setIncidentRiskScore] = useState(activeIncident ? activeIncident.riskScore : 30);
    const [incidentLocation, setIncidentLocation] = useState(activeIncident ? activeIncident.locationName : "");
    const [incidentDesc, setIncidentDesc] = useState(activeIncident ? activeIncident.description : "");
    const [incidentRec, setIncidentRec] = useState(activeIncident ? (activeIncident.recommendation || "") : "");
    const [incidentLat, setIncidentLat] = useState(activeIncident ? activeIncident.latitude : 10.87820);
    const [incidentLng, setIncidentLng] = useState(activeIncident ? activeIncident.longitude : 106.80080);

    const [specifySegment, setSpecifySegment] = useState(activeIncident?.streetCoords ? true : false);
    const [startLat, setStartLat] = useState<number>(() => {
        if (activeIncident?.streetCoords) {
            try {
                const arr = JSON.parse(activeIncident.streetCoords);
                if (arr.length > 0) return arr[0][1];
            } catch (e) {}
        }
        return activeIncident ? activeIncident.latitude : 10.87820;
    });
    const [startLng, setStartLng] = useState<number>(() => {
        if (activeIncident?.streetCoords) {
            try {
                const arr = JSON.parse(activeIncident.streetCoords);
                if (arr.length > 0) return arr[0][0];
            } catch (e) {}
        }
        return activeIncident ? activeIncident.longitude : 106.80080;
    });
    const [endLat, setEndLat] = useState<number>(() => {
        if (activeIncident?.streetCoords) {
            try {
                const arr = JSON.parse(activeIncident.streetCoords);
                if (arr.length > 0) return arr[arr.length - 1][1];
            } catch (e) {}
        }
        return activeIncident ? activeIncident.latitude : 10.87900;
    });
    const [endLng, setEndLng] = useState<number>(() => {
        if (activeIncident?.streetCoords) {
            try {
                const arr = JSON.parse(activeIncident.streetCoords);
                if (arr.length > 0) return arr[arr.length - 1][0];
            } catch (e) {}
        }
        return activeIncident ? activeIncident.longitude : 106.80200;
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Map refs
    const [crudMap, setCrudMap] = useState<any>(null);
    const crudMarkerRef = useRef<any>(null);
    const startMarkerRef = useRef<any>(null);
    const endMarkerRef = useRef<any>(null);

    // Check if script is already loaded (fallback)
    useEffect(() => {
        if (typeof window !== "undefined" && (window as any).goongjs) {
            setMapLoaded(true);
        }
    }, []);

    // Initialize Goong map in Modal
    useEffect(() => {
        let mapInstance: any = null;
        let timer: any = null;

        if (mapLoaded && typeof window !== "undefined") {
            // @ts-ignore
            const goongjs = window.goongjs;
            if (!goongjs) return;

            const tilesKey = process.env.NEXT_PUBLIC_GOONG_MAP_KEY || "hkBRTOlzhKDE79Z6WGwQCgI9MTgsGXyUNC7jS8i3";
            goongjs.accessToken = tilesKey;

            timer = setTimeout(() => {
                const el = document.getElementById("goong-map-crud");
                if (!el) return;

                const centerCoords: [number, number] = [incidentLng, incidentLat];

                mapInstance = new goongjs.Map({
                    container: "goong-map-crud",
                    style: "https://tiles.goong.io/assets/goong_map_web.json",
                    center: centerCoords,
                    zoom: activeIncident ? 16 : 14,
                });

                mapInstance.on("load", () => {
                    setCrudMap(mapInstance);

                    if (specifySegment) {
                        // Render two markers: Start (Green) and End (Red)
                        const startEl = document.createElement("div");
                        startEl.className = "w-6 h-6 rounded-full bg-green-500 border-2 border-white flex items-center justify-center text-white font-bold text-[9px] shadow-lg cursor-pointer";
                        startEl.innerHTML = "S";

                        const startMarker = new goongjs.Marker({ element: startEl, draggable: true })
                            .setLngLat([startLng, startLat])
                            .addTo(mapInstance);
                        startMarkerRef.current = startMarker;

                        const endEl = document.createElement("div");
                        endEl.className = "w-6 h-6 rounded-full bg-red-500 border-2 border-white flex items-center justify-center text-white font-bold text-[9px] shadow-lg cursor-pointer";
                        endEl.innerHTML = "E";

                        const endMarker = new goongjs.Marker({ element: endEl, draggable: true })
                            .setLngLat([endLng, endLat])
                            .addTo(mapInstance);
                        endMarkerRef.current = endMarker;

                        startMarker.on("dragend", () => {
                            const lngLat = startMarker.getLngLat();
                            setStartLat(lngLat.lat);
                            setStartLng(lngLat.lng);
                            setIncidentLat(lngLat.lat);
                            setIncidentLng(lngLat.lng);
                        });

                        endMarker.on("dragend", () => {
                            const lngLat = endMarker.getLngLat();
                            setEndLat(lngLat.lat);
                            setEndLng(lngLat.lng);
                        });
                    } else {
                        // Render single marker
                        const markerInstance = new goongjs.Marker({
                            draggable: true
                        })
                        .setLngLat(centerCoords)
                        .addTo(mapInstance);

                        crudMarkerRef.current = markerInstance;

                        markerInstance.on("dragend", () => {
                            const lngLat = markerInstance.getLngLat();
                            setIncidentLat(lngLat.lat);
                            setIncidentLng(lngLat.lng);
                        });
                    }
                });

                mapInstance.on("click", (e: any) => {
                    const coords = e.lngLat;
                    if (specifySegment) {
                        // Clicking maps places endMarker coords
                        setEndLat(coords.lat);
                        setEndLng(coords.lng);
                        if (endMarkerRef.current) {
                            endMarkerRef.current.setLngLat([coords.lng, coords.lat]);
                        }
                    } else {
                        setIncidentLat(coords.lat);
                        setIncidentLng(coords.lng);
                        if (crudMarkerRef.current) {
                            crudMarkerRef.current.setLngLat([coords.lng, coords.lat]);
                        }
                    }
                });
            }, 200);
        }

        return () => {
            if (timer) clearTimeout(timer);
            if (mapInstance) {
                mapInstance.remove();
            }
            setCrudMap(null);
            crudMarkerRef.current = null;
            startMarkerRef.current = null;
            endMarkerRef.current = null;
        };
    }, [mapLoaded, specifySegment]);

    const decodePolyline = (encoded: string) => {
        if (!encoded) return [];
        let len = encoded.length;
        let index = 0;
        let lat = 0;
        let lng = 0;
        const points: [number, number][] = [];

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
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!incidentLocation || !incidentDesc) {
            toast.error("Please fill in location and description fields");
            return;
        }

        setIsSubmitting(true);

        let streetCoordsStr = activeIncident?.streetCoords || null;
        if (specifySegment && startLat && startLng && endLat && endLng) {
            try {
                const apiKey = process.env.NEXT_PUBLIC_GOONG_API_KEY || "2X3t5rZDLQiFHgLAdeGC8tkz2RZdTwfwMDtyFYSm";
                const res = await fetch(`https://rsapi.goong.io/direction?origin=${startLat},${startLng}&destination=${endLat},${endLng}&vehicle=car&api_key=${apiKey}`);
                if (res.ok) {
                    const data = await res.json();
                    const polyline = data.routes?.[0]?.overview_polyline?.points;
                    if (polyline) {
                        const decoded = decodePolyline(polyline);
                        streetCoordsStr = JSON.stringify(decoded);
                    }
                }
            } catch (e) {
                console.error("Failed to fetch Goong road segment: ", e);
            }
        }

        const payload = {
            id: activeIncident?.id,
            category: incidentCategory,
            riskLevel: incidentRiskLevel,
            riskScore: incidentRiskScore,
            locationName: incidentLocation,
            description: incidentDesc,
            recommendation: incidentRec,
            latitude: incidentLat,
            longitude: incidentLng,
            status: activeIncident ? activeIncident.status : "ACTIVE",
            streetCoords: streetCoordsStr,
            geom: streetCoordsStr,
        };

        try {
            await onSubmit(payload);
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in text-xs">
            <Script
                src="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.js"
                strategy="afterInteractive"
                onLoad={() => setMapLoaded(true)}
            />

            <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                    <h3 className="font-bold text-sm flex items-center gap-1.5 text-primary">
                        <MapPin className="w-5 h-5" /> {activeIncident ? "Modify Incident Data" : "Log Incident Record"}
                    </h3>
                    <button onClick={onClose} className="h-6 w-6 rounded-full border-0 bg-transparent text-slate-450 hover:text-slate-650 cursor-pointer flex items-center justify-center">
                        <XCircle className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start text-xs font-semibold">
                    <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Category</label>
                                <select 
                                    value={incidentCategory} 
                                    onChange={(e) => setIncidentCategory(e.target.value)} 
                                    className="p-3 border rounded-2xl bg-slate-50 border-slate-200 text-xs font-bold text-slate-900 outline-none focus:border-primary cursor-pointer"
                                >
                                    <option value="FLOODING">Flooding</option>
                                    <option value="ACCIDENT">Accident</option>
                                    <option value="DEBRIS">Debris</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Risk Level</label>
                                <select 
                                    value={incidentRiskLevel} 
                                    onChange={(e) => setIncidentRiskLevel(e.target.value)} 
                                    className="p-3 border rounded-2xl bg-slate-50 border-slate-200 text-xs font-bold text-slate-900 outline-none focus:border-primary cursor-pointer"
                                >
                                    <option value="LOW">Low</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="HIGH">High</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl select-none">
                            <input 
                                type="checkbox" 
                                id="specify-segment-checkbox"
                                checked={specifySegment} 
                                onChange={(e) => setSpecifySegment(e.target.checked)} 
                                className="h-4 w-4 text-primary border-slate-350 rounded cursor-pointer"
                            />
                            <label htmlFor="specify-segment-checkbox" className="text-[11px] font-bold text-slate-700 cursor-pointer">
                                Specify Blocked Road Segment (Start & End coordinates)
                            </label>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Risk Score (0-100)</label>
                                <input 
                                    type="number" 
                                    min="0" 
                                    max="100" 
                                    value={incidentRiskScore} 
                                    onChange={(e) => setIncidentRiskScore(parseInt(e.target.value) || 0)} 
                                    className="p-3 border rounded-2xl bg-slate-50 border-slate-200 text-xs font-bold text-slate-900 outline-none focus:border-primary" 
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Location Name</label>
                                <input 
                                    type="text" 
                                    value={incidentLocation} 
                                    onChange={(e) => setIncidentLocation(e.target.value)} 
                                    placeholder="e.g. Vo Truong Toan Intersection" 
                                    className="p-3 border rounded-2xl bg-slate-50 border-slate-200 text-xs font-bold text-slate-900 outline-none focus:border-primary" 
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Description</label>
                            <textarea 
                                value={incidentDesc} 
                                onChange={(e) => setIncidentDesc(e.target.value)} 
                                placeholder="Enter details..." 
                                className="p-3 border rounded-2xl bg-slate-50 border-slate-200 text-xs h-16 resize-none font-bold text-slate-900 outline-none focus:border-primary" 
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Diverting Guidelines</label>
                            <textarea 
                                value={incidentRec} 
                                onChange={(e) => setIncidentRec(e.target.value)} 
                                placeholder="Divert vehicles via alternate internal routes..." 
                                className="p-3 border rounded-2xl bg-slate-50 border-slate-200 text-xs h-16 resize-none font-bold text-slate-900 outline-none focus:border-primary" 
                            />
                        </div>

                        {specifySegment ? (
                            <div className="flex flex-col gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                                <div className="grid grid-cols-2 gap-3 border-b pb-2 border-slate-200/50">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[9px] font-bold text-green-600 uppercase leading-none">Start Latitude</span>
                                        <span className="text-xs font-bold text-slate-800 mt-1">{startLat.toFixed(6)}</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[9px] font-bold text-green-600 uppercase leading-none">Start Longitude</span>
                                        <span className="text-xs font-bold text-slate-800 mt-1">{startLng.toFixed(6)}</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[9px] font-bold text-red-500 uppercase leading-none">End Latitude</span>
                                        <span className="text-xs font-bold text-slate-800 mt-1">{endLat.toFixed(6)}</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[9px] font-bold text-red-500 uppercase leading-none">End Longitude</span>
                                        <span className="text-xs font-bold text-slate-800 mt-1">{endLng.toFixed(6)}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase leading-none">Latitude (Lat)</span>
                                    <span className="text-xs font-bold text-slate-800 mt-1">{incidentLat.toFixed(6)}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase leading-none">Longitude (Lng)</span>
                                    <span className="text-xs font-bold text-slate-800 mt-1">{incidentLng.toFixed(6)}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-3 h-full">
                        <label className="text-[10px] font-bold text-slate-500 uppercase leading-none">Geographic Selection (Map Click or Drag Marker)</label>
                        <div className="border border-slate-200 rounded-3xl overflow-hidden w-full h-[300px] relative">
                            <div id="goong-map-crud" className="w-full h-full bg-slate-100" />
                        </div>
                        <div className="flex justify-end gap-2 border-t pt-4 border-slate-100 mt-2">
                            <Button type="button" variant="outline" onClick={onClose} className="h-9 rounded-xl text-[10px] font-bold border-slate-200 bg-white">Cancel</Button>
                            <Button 
                                type="submit" 
                                disabled={isSubmitting}
                                className="h-9 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[10px] border-0 shadow-md"
                            >
                                {isSubmitting ? "Saving..." : activeIncident ? "Update Record" : "Save Incident"}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
