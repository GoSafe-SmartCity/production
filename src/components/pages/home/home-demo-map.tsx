"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Script from "next/script";

export function HomeDemoMap() {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [map, setMap] = useState<any>(null);
  const [showRoute, setShowRoute] = useState(false);
  const [incidents, setIncidents] = useState<any[]>([]);

  // Fetch active database incidents on mount
  useEffect(() => {
    fetch("/api/incidents")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setIncidents(data);
        }
      })
      .catch(err => console.error(err));
  }, []);

  // Draw all active database incidents' blocked road segments in red initially on Home map
  useEffect(() => {
    if (!map) return;
    incidents.forEach(inc => {
      if ((inc.status === "ACTIVE" || inc.status === "APPROVED") && inc.streetCoords) {
        try {
          const coords = JSON.parse(inc.streetCoords);
          const srcId = `home-db-blocked-src-${inc.id}`;
          const lyrId = `home-db-blocked-lyr-${inc.id}`;
          
          if (map.getSource(srcId)) return;

          map.addSource(srcId, {
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

          map.addLayer({
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
        } catch (e) {}
      }
    });
  }, [map, incidents]);

  const floodPopupRef = useRef<any>(null);
  const bikeMarkerRef = useRef<any>(null);
  const endMarkerRef = useRef<any>(null);
  const animatedDotRef = useRef<any>(null);
  const animationIntervalRef = useRef<any>(null);
  const moveStartHandlerRef = useRef<any>(null);
  const moveEndHandlerRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);

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

  // Check if goong-js script is already loaded
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ((window as any).goongjs) {
      setMapLoaded(true);
      return;
    }
    const interval = setInterval(() => {
      if ((window as any).goongjs) {
        setMapLoaded(true);
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Initialize Goong Map
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
        const el = document.getElementById("goong-map-home-demo");
        if (!el) return;

        mapInstance = new goongjs.Map({
          container: "goong-map-home-demo",
          style: "https://tiles.goong.io/assets/goong_map_web.json",
          center: [106.8008, 10.8782],
          zoom: 16.03,
          pitch: 55,
          bearing: -15,
        });

        mapInstance.on("load", () => {
          setMap(mapInstance);
        });
      }, 200);
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (mapInstance) {
        mapInstance.remove();
      }
      setMap(null);
    };
  }, [mapLoaded]);

  // Fetch Marie Curie detour path and start animation
  useEffect(() => {
    if (!map) return;

    mapInstanceRef.current = map;
    let active = true;

    const runDemoAnimation = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GOONG_API_KEY || "2X3t5rZDLQiFHgLAdeGC8tkz2RZdTwfwMDtyFYSm";
        const res = await fetch(
          `https://rsapi.goong.io/direction?origin=10.8795,106.8020&destination=10.8778,106.8005&vehicle=bike&alternatives=true&api_key=${apiKey}`
        );

        if (!active) return;

        if (res.ok) {
          const data = await res.json();
          const polyline0 = data.routes?.[0]?.overview_polyline?.points;
          const polyline1 = data.routes?.[1]?.overview_polyline?.points;

          if (polyline0 && polyline1) {
            const primaryCoords = decodePolyline(polyline0);
            const altCoords = decodePolyline(polyline1);

            // Draw layers
            const sourceId = "home-flooded-source";
            const layerId = "home-flooded-layer";
            const altSourceId = "home-alt-source";
            const altLayerId = "home-alt-layer";
            const traveledSourceId = "home-traveled-source";
            const traveledLayerId = "home-traveled-layer";

            // Cleanup previous layers/sources if any exist
            try {
              if (map.getLayer(layerId)) map.removeLayer(layerId);
              if (map.getSource(sourceId)) map.removeSource(sourceId);
              if (map.getLayer(altLayerId)) map.removeLayer(altLayerId);
              if (map.getSource(altSourceId)) map.removeSource(altSourceId);
              if (map.getLayer(traveledLayerId)) map.removeLayer(traveledLayerId);
              if (map.getSource(traveledSourceId)) map.removeSource(traveledSourceId);
            } catch (e) {}

            // Add Primary Flooded Route (Red line)
            map.addSource(sourceId, {
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

            map.addLayer({
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

            // Warn popup on the primary route
            // @ts-ignore
            const goongjs = window.goongjs;
            const midIdx = Math.floor(primaryCoords.length / 2);
            const midCoord = primaryCoords[midIdx] || [106.8005, 10.8778];

            const popup = new goongjs.Popup({
              closeButton: false,
              closeOnClick: false,
              className: "custom-popup"
            })
              .setLngLat(midCoord)
              .setHTML(`
                <div class="flex items-center p-1.5 font-bold">
                  <span class="font-extrabold text-sm sm:text-base md:text-lg text-neutral-900 dark:text-neutral-100 tracking-normal leading-relaxed font-Outfit">
                    The road <span class="text-red-500 font-black">Marie Curie</span> is flooded in <span class="text-yellow-600 dark:text-yellow-400 font-black font-semibold">10 minutes</span>
                  </span>
                </div>
              `)
              .addTo(map);

            floodPopupRef.current = popup;

            // Add Alternative Safe Route (Blue line)
            map.addSource(altSourceId, {
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

            map.addLayer({
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

            // Add Traveled Gray Segment (Placeholder source)
            map.addSource(traveledSourceId, {
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

            map.addLayer({
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

            // Pin markers
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
              .addTo(map);
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
              .addTo(map);
            endMarkerRef.current = endMarker;

            // Interpolate coordinates
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
              .addTo(map);
            animatedDotRef.current = travelerMarker;

            const handleMoveStart = () => {};
            const handleMoveEnd = () => {};

            map.on("movestart", handleMoveStart);
            map.on("moveend", handleMoveEnd);

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
                activeIdx = 0;
                // Clean traveled track grey line
                const src = map.getSource(traveledSourceId);
                if (src) {
                  src.setData({
                    type: "Feature",
                    properties: {},
                    geometry: {
                      type: "LineString",
                      coordinates: []
                    }
                  });
                }
              }

              const currentPos = sparseAltCoords[activeIdx];
              const prevPos = sparseAltCoords[prevIdx];

              if (!currentPos) return;

              // Update Position
              travelerMarker.setLngLat(currentPos);

              // Update Rotation (Bearing)
              const innerEl = arrowEl.querySelector(".arrow-inner") as HTMLElement;
              let heading = 0;
              if (innerEl && prevPos && currentPos) {
                heading = getBearing(prevPos, currentPos);
                innerEl.style.transform = `rotate(${heading - 45}deg)`;
              }

              // Update Traveled Gray Segment
              const traveledSegment = sparseAltCoords.slice(0, activeIdx + 1);
              if (traveledSegment.length >= 2) {
                const src = map.getSource(traveledSourceId);
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
          }
        }
      } catch (e) {
        console.error("Failed to run home demo animation:", e);
      }
    };

    runDemoAnimation();

    return () => {
      active = false;
      if (floodPopupRef.current) { floodPopupRef.current.remove(); floodPopupRef.current = null; }
      if (bikeMarkerRef.current) { bikeMarkerRef.current.remove(); bikeMarkerRef.current = null; }
      if (endMarkerRef.current) { endMarkerRef.current.remove(); endMarkerRef.current = null; }
      if (animatedDotRef.current) { animatedDotRef.current.remove(); animatedDotRef.current = null; }
      if (animationIntervalRef.current) { clearInterval(animationIntervalRef.current); animationIntervalRef.current = null; }
      if (moveStartHandlerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.off("movestart", moveStartHandlerRef.current);
      }
      if (moveEndHandlerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.off("moveend", moveEndHandlerRef.current);
      }
    };
  }, [map, decodePolyline]);

  return (
    <div className="w-full h-full relative">
      <Script
        src="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.js"
        strategy="afterInteractive"
        onLoad={() => setMapLoaded(true)}
      />
      <div id="goong-map-home-demo" className="w-full h-full bg-transparent" />
    </div>
  );
}
