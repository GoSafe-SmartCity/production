"use client";

import React, { useState, useEffect } from "react";
import { Camera, XCircle, SlidersHorizontal, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CompareSliderModalProps {
    selectedDetection: any;
    onClose: () => void;
    initialTab?: "slider" | "video";
}

export function CompareSliderModal({
    selectedDetection,
    onClose,
    initialTab = "slider"
}: CompareSliderModalProps) {
    const [compareSliderVal, setCompareSliderVal] = useState(50);
    const [isSliderMoving, setIsSliderMoving] = useState(false);
    const [cameraDialogTab, setCameraDialogTab] = useState<"slider" | "video">(initialTab);

    // Split Compare frame slider mouse drag events
    const handleSliderMouseDown = () => {
        setIsSliderMoving(true);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isSliderMoving) return;
            const container = document.getElementById("compare-slider-container");
            if (!container) return;
            const rect = container.getBoundingClientRect();
            const posX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
            const pct = (posX / rect.width) * 100;
            setCompareSliderVal(pct);
        };
        const handleMouseUp = () => {
            setIsSliderMoving(false);
        };
        if (isSliderMoving) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
        }
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isSliderMoving]);

    return (
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white border border-slate-250 rounded-3xl w-full max-w-6xl p-6 flex flex-col gap-4 text-xs shadow-2xl relative animate-fade-in">
                <div className="flex items-center justify-between border-b pb-3 border-slate-150">
                    <div>
                        <h3 className="font-bold text-sm flex items-center gap-2 text-primary">
                            <Camera className="w-5 h-5 text-primary" /> CCTV Video &amp; AI Segmentation Dashboard
                        </h3>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">Scrub original vs AI segmentation overlays or play the real-time cctv camera video feed.</p>
                    </div>
                    <button onClick={onClose} className="h-7 w-7 rounded-full border-0 bg-transparent text-slate-450 hover:text-slate-650 cursor-pointer flex items-center justify-center">
                        <XCircle className="w-6 h-6" />
                    </button>
                </div>

                {/* Dialog Subtabs */}
                <div className="flex gap-2 border-b pb-2">
                    <button 
                        onClick={() => setCameraDialogTab("slider")}
                        className={cn(
                            "px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer transition-all border-0",
                            cameraDialogTab === "slider" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        )}
                    >
                        AI Segmented Comparison
                    </button>
                    <button 
                        onClick={() => setCameraDialogTab("video")}
                        className={cn(
                            "px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer transition-all border-0",
                            cameraDialogTab === "video" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        )}
                    >
                        CCTV Live Video Feed (Original)
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                    {/* Left Pane - CCTV Telemetry */}
                    <div className="lg:col-span-1 bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between font-semibold">
                        <div className="flex flex-col gap-3">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">CCTV Measurement Specs</span>
                            <h4 className="text-sm font-black text-slate-900">{selectedDetection.station?.name || "CCTV Station"}</h4>
                            
                            <div className="h-px bg-slate-200 my-1" />

                            <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                                <span className="text-slate-500">Camera ID:</span>
                                <span className="text-slate-800">{selectedDetection.stationId}</span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                                <span className="text-slate-500">Captured At:</span>
                                <span className="text-slate-800">{new Date(selectedDetection.timestamp).toLocaleString('vi-VN')}</span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-slate-200/60 items-center">
                                <span className="text-slate-500">Flooded Section %:</span>
                                <div className="flex flex-col items-end gap-0.5">
                                    <span className="text-orange-650 font-black text-sm">{selectedDetection.floodedAreaPct}%</span>
                                </div>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                                <span className="text-slate-500">Water Depth (Est.):</span>
                                <span className="text-primary font-black">{selectedDetection.waterDepthCm} cm</span>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                                <span className="text-slate-500">Severity Tier:</span>
                                <span className={cn(
                                    "px-2.5 py-0.5 rounded text-[9px] font-black border",
                                    selectedDetection.severity === "HIGH" ? "bg-red-50 text-red-700 border-red-200" :
                                    selectedDetection.severity === "MEDIUM" ? "bg-orange-50 text-orange-700 border-orange-200" :
                                    "bg-blue-50 text-blue-700 border-blue-200"
                                )}>{selectedDetection.severity}</span>
                            </div>
                        </div>
                        <div className="text-[9px] text-slate-400 pt-3 border-t border-slate-200 leading-normal mt-4 font-normal">
                            {cameraDialogTab === "slider" 
                                ? ""
                                : "Displaying the direct live video capture stream with active resolution and playback overlay."
                            }
                        </div>
                    </div>

                    {/* Right Pane - Drag slider or Video player */}
                    <div className="lg:col-span-2 flex flex-col gap-4 items-center w-full">
                        {cameraDialogTab === "slider" ? (
                            <>
                                <div 
                                    id="compare-slider-container"
                                    className="w-full h-[320px] md:h-[380px] bg-slate-900 rounded-2xl border border-slate-250 relative overflow-hidden select-none cursor-ew-resize"
                                    onMouseDown={handleSliderMouseDown}
                                >
                                    {/* Raw Frame (Bottom Layer) */}
                                    <img 
                                        src={selectedDetection.rawFramePath} 
                                        alt="CCTV Raw Feed" 
                                        className="w-full h-full object-cover pointer-events-none"
                                    />
                                    
                                    {/* Segmented Frame (Top Layer with Clip-path) */}
                                    <div 
                                        className="absolute inset-0 w-full h-full pointer-events-none"
                                        style={{
                                            clipPath: `polygon(0 0, ${compareSliderVal}% 0, ${compareSliderVal}% 100%, 0 100%)`
                                        }}
                                    >
                                        <img 
                                            src={selectedDetection.segmentPath} 
                                            alt="CCTV segmented output" 
                                            className="w-full h-full object-cover"
                                        />
                                    </div>

                                    {/* Sliding Split Bar */}
                                    <div 
                                        className="absolute top-0 bottom-0 w-1 bg-white shadow-2xl pointer-events-none z-10 flex items-center justify-center"
                                        style={{ left: `${compareSliderVal}%` }}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-white border border-slate-250 flex items-center justify-center shadow-xl text-slate-700 text-xs font-bold shrink-0 -ml-3.5 select-none pointer-events-none">
                                            ↔
                                        </div>
                                    </div>

                                    {/* Labels */}
                                    <span className="absolute bottom-2 left-2 z-10 bg-black/60 text-white font-bold text-[9px] px-2.5 py-1 rounded-lg backdrop-blur-sm">AI SEGMENTED MASK</span>
                                    <span className="absolute bottom-2 right-2 z-10 bg-black/60 text-white font-bold text-[9px] px-2.5 py-1 rounded-lg backdrop-blur-sm">RAW CCTV FRAME</span>
                                </div>

                                <div className="w-full flex items-center gap-3 font-semibold text-slate-650">
                                    <span>Raw Frame</span>
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="100" 
                                        value={compareSliderVal} 
                                        onChange={(e) => setCompareSliderVal(parseInt(e.target.value))}
                                        className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                    <span>CV Segmented Overlay</span>
                                </div>
                            </>
                        ) : (
                            <div className="w-full bg-black rounded-2xl border border-slate-250 overflow-hidden relative h-[380px] md:h-[410px] flex items-center justify-center">
                                <video 
                                    src="http://localhost:8000/assets/vietnam_flood_cctv.mp4" 
                                    autoPlay 
                                    loop 
                                    muted 
                                    playsInline
                                    controls 
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute top-2 left-2 z-10 bg-black/60 text-white font-bold text-[9px] px-2.5 py-1 rounded-lg backdrop-blur-sm tracking-wider uppercase">
                                    LIVE CCTV FEED - {selectedDetection.station?.name || "CAM_01"}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end border-t pt-3.5 border-slate-150">
                    <Button onClick={onClose} className="h-9.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 border-0">Close Comparison Panel</Button>
                </div>
            </div>
        </div>
    );
}
