"use client";

import React from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface CameraStation {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    detections?: any[];
}

interface CameraStreamsGridProps {
    cameraStations: CameraStation[];
    onViewLiveFeed: (detection: any) => void;
}

export function CameraStreamsGrid({ cameraStations, onViewLiveFeed }: CameraStreamsGridProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4 font-inter">
            {cameraStations.map(st => {
                const latest = st.detections?.[0];
                return (
                    <div key={st.id} className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4 p-5">
                        {/* Thumbnail Header with padding and rounded corners all around */}
                        <div className="relative h-44 bg-slate-900 rounded-2xl overflow-hidden shadow-inner">
                            <img 
                                src={latest?.rawFramePath || "/detections/cam1_raw_day_3.jpg"} 
                                alt={st.name} 
                                className="w-full h-full object-cover opacity-85 pointer-events-none rounded-2xl"
                            />
                            <div className="absolute top-3 left-3 bg-black/60 text-white font-bold text-[9px] px-2.5 py-1 rounded-lg backdrop-blur-sm tracking-wider uppercase flex items-center gap-1.5 select-none">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span> ONLINE FEED
                            </div>
                            <span className="absolute bottom-3 right-3 bg-slate-900/80 text-white font-bold text-[9px] px-2 py-0.5 rounded border border-slate-700 select-none">
                                {st.id}
                            </span>
                        </div>

                        {/* Padded camera header info without specs */}
                        <div className="flex flex-col gap-1 font-semibold text-slate-900">
                            <h4 className="font-black text-sm text-slate-900 leading-tight">Station Control {st.id}</h4>
                            <p className="text-[10px] text-slate-400 font-medium">Active streaming channel</p>
                        </div>

                        {/* Footer action button */}
                        <div className="flex gap-2">
                            <Link href={`/manage/camera/${st.id}`} className="w-full">
                                <Button 
                                    className="w-full h-9.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs border-0 flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                                >
                                    <Play className="w-3.5 h-3.5" /> View Live Feed
                                </Button>
                            </Link>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
