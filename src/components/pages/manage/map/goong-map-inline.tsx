"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Script from "next/script";
import { toast } from "sonner";

/**
 * Admin GoongMapInline — copied from Homepage "Our GoSafe Map" section.
 * Uses Goong Directions API to get real road-following polyline (same as homepage).
 * Adds admin-specific markers: camera icons + alert/decision icon.
 */

interface GoongMapInlineProps {
    showCamera: boolean;
    showFeedback: boolean;
    showWeather: boolean;
    showDecision: boolean;
    cameraStations: any[];
    filteredReports: any[];
    filteredWeather: any[];
    floodedStreetCoords: [number, number][];
    alternativeStreetCoords: [number, number][];
    matchesFilterQuery: (timestamp: string | Date, extraContent?: string) => boolean;
    activeHazards: any[];
    onEditIncident?: (incident: any) => void;
    onViewCameraDetection: (det: any) => void;
    onVerifyReport: (report: any) => void;
    onViewWeatherDetail: (weather: any) => void;
    onViewDecisionDetail: (decision: any) => void;
    onMapClick: (lat: number, lng: number) => void;
}

// Suppress irrelevant Goong Map style errors
if (typeof window !== "undefined") {
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
        const msg = args.join(" ");
        if (msg.includes('trees') || msg.includes('poi-tree') || msg.includes('café') || msg.includes('map.addImage')) return;
        originalConsoleError.apply(console, args);
    };
}

export function GoongMapInline({
    showCamera,
    showFeedback,
    showWeather,
    showDecision,
    cameraStations,
    filteredReports,
    filteredWeather,
    floodedStreetCoords: _floodedStreetCoordsProp,
    alternativeStreetCoords: _altCoordsProp,
    matchesFilterQuery,
    activeHazards,
    onEditIncident,
    onViewCameraDetection,
    onVerifyReport,
    onViewWeatherDetail,
    onViewDecisionDetail,
    onMapClick
}: GoongMapInlineProps) {
    const [mapLoaded, setMapLoaded] = useState(false);
    const [adminMap, setAdminMap] = useState<any>(null);
    const markersRef = useRef<any[]>([]);
    const popupRef = useRef<any>(null);

    // Real road-following coords from Goong Directions API (same as homepage)
    const [realFloodedCoords, setRealFloodedCoords] = useState<[number, number][]>([]);

    // Decode Goong polyline (exact copy from homepage)
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

    // Fetch real road path from Goong Directions API (same as homepage)
    useEffect(() => {
        const fetchRealStreetPath = async () => {
            try {
                const apiKey = process.env.NEXT_PUBLIC_GOONG_API_KEY || "2X3t5rZDLQiFHgLAdeGC8tkz2RZdTwfwMDtyFYSm";
                // Same origin/destination as homepage
                const res = await fetch(
                    `https://rsapi.goong.io/direction?origin=10.8795,106.8020&destination=10.8778,106.8005&vehicle=bike&api_key=${apiKey}`
                );
                if (res.ok) {
                    const data = await res.json();
                    const polyline = data.routes?.[0]?.overview_polyline?.points;
                    if (polyline) {
                        const decoded = decodePolyline(polyline);
                        if (decoded.length > 0) {
                            setRealFloodedCoords(decoded);
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to fetch Goong street path: ", e);
            }
        };
        fetchRealStreetPath();
    }, [decodePolyline]);

    // Check if goong-js script is already loaded
    useEffect(() => {
        if (typeof window !== "undefined" && (window as any).goongjs) {
            setMapLoaded(true);
        }
    }, []);

    // Initialize map (same config as homepage)
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
                // Same map style as homepage — then setCenter to Marie Curie area
                mapInstance = new goongjs.Map({
                    container: "admin-goong-map-inline",
                    style: "https://tiles.goong.io/assets/goong_map_web.json",
                    center: [106.8008, 10.8782], // Marie Curie area (same userCoords as homepage)
                    zoom: 16.03,
                    pitch: 55,
                    bearing: -15,
                });

                mapInstance.on("click", (e: any) => {
                    onMapClick(e.lngLat.lat, e.lngLat.lng);
                });

                mapInstance.on("load", () => {
                    setAdminMap(mapInstance);
                });
            }, 200);
        }

        return () => {
            if (timer) clearTimeout(timer);
            if (mapInstance) mapInstance.remove();
            setAdminMap(null);
        };
    }, [mapLoaded]);

    // ══════════════════════════════════════════════════════════════
    // Draw road overlay + markers (copied from homepage drawFloodedStreet)
    // ══════════════════════════════════════════════════════════════
    useEffect(() => {
        if (!adminMap) return;

        // @ts-ignore
        const goongjs = window.goongjs;
        if (!goongjs) return;

        // ── Clear previous markers ──
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];
        if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }

        // ── Clear previous line layers ──
        const sourceId = "admin-flooded-street-source";
        const layerId = "admin-flooded-street-layer";
        try {
            if (adminMap.getStyle()) {
                if (adminMap.getLayer(layerId)) adminMap.removeLayer(layerId);
                if (adminMap.getSource(sourceId)) adminMap.removeSource(sourceId);
            }
        } catch (e) { /* ignore */ }

        // ═══════════════════════════════════════
        // 1. FLOODED ROAD LINE + ALERT (only when high-risk data in time window)
        // ═══════════════════════════════════════
        const hasHighCameraFlood = cameraStations.some(st =>
            st.detections?.some((d: any) => d.waterDepthCm >= 30 && matchesFilterQuery(d.timestamp))
        );
        const hasHighRain = filteredWeather.some(w => w.rainfall > 20);
        const hasUserReports = filteredReports.some(r => r.category === "FLOODING");
        const shouldShowFloodOverlay = showDecision && realFloodedCoords.length > 1 && (hasHighCameraFlood || hasHighRain || hasUserReports);

        if (shouldShowFloodOverlay) {
            try {
                adminMap.addSource(sourceId, {
                    type: "geojson",
                    data: {
                        type: "Feature",
                        properties: {},
                        geometry: {
                            type: "LineString",
                            coordinates: realFloodedCoords
                        }
                    }
                });

                adminMap.addLayer({
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
            } catch (e) {
                console.warn("Failed to draw flooded street layer: ", e);
            }

            // ═══════════════════════════════════════
            // 2. FLOOD WARNING POPUP (same style as homepage)
            // ═══════════════════════════════════════
            const midIdx = Math.floor(realFloodedCoords.length / 2);
            const midCoord = realFloodedCoords[midIdx] || [106.8008, 10.8782];

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
            .addTo(adminMap);
            popupRef.current = popup;

            // ═══════════════════════════════════════
            // 3. ALERT / DECISION MARKER (warning triangle at junction)
            // ═══════════════════════════════════════

            const alertEl = document.createElement("div");
            alertEl.style.cursor = "pointer";
            alertEl.innerHTML = `
                <div style="width:40px;height:40px;border-radius:50%;background:white;border:3px solid #ef4444;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 6px rgba(239,68,68,0.15), 0 2px 12px rgba(239,68,68,0.3);animation:pulse 2s infinite;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </div>
            `;

            alertEl.addEventListener("click", (e) => {
                e.stopPropagation();
                onViewDecisionDetail({
                    locationName: "Đường William Shakespeare / Marie Curie, Đông Hòa",
                    description: "Severe road flooding detected via sensor fusion. High probability of engine stall. Closure strongly recommended.",
                    category: "FLOODING",
                    riskLevel: "HIGH",
                    wCitizen: hasUserReports ? 30 : 0,
                    wHistory: 20,
                    wCamera: hasHighCameraFlood ? 50 : 15,
                    totalScore: (hasUserReports ? 30 : 0) + 20 + (hasHighCameraFlood ? 50 : 15),
                    cameras: "CAM_01 reports 48cm depth (HIGH severity).",
                    weather: "OpenWeather logs 45.2mm rainfall (Heavy Intensity Rain).",
                    citizen: "2 user feedbacks confirm road is completely blocked."
                });
            });

            // Place alert at the start of the flooded road
            const alertCoord = realFloodedCoords[0] || [106.8020, 10.8795];
            const alertMarker = new goongjs.Marker({ element: alertEl, anchor: "center" })
                .setLngLat(alertCoord)
                .addTo(adminMap);
            markersRef.current.push(alertMarker);
        }

        // ═══════════════════════════════════════
        // 4. CAMERA MARKERS (camera icon — click to show recent frame)
        // ═══════════════════════════════════════
        if (showCamera) {
            cameraStations.forEach(st => {
                const validDets = st.detections?.filter((d: any) => matchesFilterQuery(d.timestamp)) || [];
                const latest = validDets[0];

                let color = "#10b981";
                if (latest?.severity === "HIGH") color = "#ef4444";
                else if (latest?.severity === "MEDIUM") color = "#f97316";

                const el = document.createElement("div");
                el.style.cursor = "pointer";
                el.innerHTML = `
                    <div style="width:36px;height:36px;border-radius:50%;background:white;border:2.5px solid ${color};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,0.15);">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    </div>
                `;

                el.addEventListener("click", (e) => {
                    e.stopPropagation();
                    if (latest) {
                        onViewCameraDetection({ ...latest, station: { name: st.name } });
                    } else {
                        toast.info(`No detection data for ${st.name}`);
                    }
                });

                const m = new goongjs.Marker({ element: el, anchor: "center" })
                    .setLngLat([st.longitude, st.latitude])
                    .addTo(adminMap);
                markersRef.current.push(m);
            });
        }

        // ═══════════════════════════════════════
        // 5. CITIZEN FEEDBACK MARKERS
        // ═══════════════════════════════════════
        if (showFeedback) {
            filteredReports.forEach(rep => {
                let color = "#3b82f6";
                if (rep.category === "ACCIDENT") color = "#ef4444";

                const el = document.createElement("div");
                el.style.cursor = "pointer";
                el.innerHTML = `
                    <div style="width:30px;height:30px;border-radius:50%;background:white;border:2px solid ${color};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.12);">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    </div>
                `;

                el.addEventListener("click", (e) => {
                    e.stopPropagation();
                    if (rep.status === "PENDING") onVerifyReport(rep);
                    else toast.info(`Report: "${rep.description}"`);
                });

                const m = new goongjs.Marker({ element: el, anchor: "center" })
                    .setLngLat([rep.longitude, rep.latitude])
                    .addTo(adminMap);
                markersRef.current.push(m);
            });
        }

        // ═══════════════════════════════════════
        // 6. WEATHER TELEMETRY MARKERS
        // ═══════════════════════════════════════
        if (showWeather) {
            filteredWeather.forEach(w => {
                const isRain = w.rainfall > 0;
                const color = isRain ? "#6366f1" : "#f59e0b";

                const el = document.createElement("div");
                el.style.cursor = "pointer";
                el.innerHTML = `
                    <div style="width:28px;height:28px;border-radius:50%;background:white;border:2px solid ${color};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.1);">
                        ${isRain
                            ? `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5"><path d="M4 14.89c-.58-.33-1-.93-1-1.63a1.72 1.72 0 0 1 1.74-1.74c.08 0 .16 0 .24.02a2.38 2.38 0 0 1 4.54-.58A2.66 2.66 0 0 1 12 11.23c0 .87-.42 1.63-1.07 2.1"/><path d="M8 18v2"/><path d="M12 18v2"/></svg>`
                            : `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/></svg>`
                        }
                    </div>
                `;

                el.addEventListener("click", (e) => {
                    e.stopPropagation();
                    onViewWeatherDetail(w);
                });

                const m = new goongjs.Marker({ element: el, anchor: "center" })
                    .setLngLat([w.longitude, w.latitude])
                    .addTo(adminMap);
                markersRef.current.push(m);
            });
        }

    }, [adminMap, showCamera, showFeedback, showWeather, showDecision, cameraStations, filteredReports, filteredWeather, realFloodedCoords, activeHazards]);

    return (
        <div className="w-full h-[450px] relative border-b border-slate-200 bg-slate-100 shadow-inner">
            <Script
                src="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.js"
                strategy="afterInteractive"
                onLoad={() => setMapLoaded(true)}
            />
            <div id="admin-goong-map-inline" className="w-full h-full" />
        </div>
    );
}
