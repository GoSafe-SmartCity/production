"use client";

import React, { useState } from "react";
import { Camera, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface RegisterCameraFormProps {
    onRegister: (newStation: any) => void;
    onClose: () => void;
}

export function RegisterCameraForm({ onRegister, onClose }: RegisterCameraFormProps) {
    const [newCamId, setNewCamId] = useState("");
    const [newCamName, setNewCamName] = useState("");
    const [newCamLat, setNewCamLat] = useState("");
    const [newCamLng, setNewCamLng] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCamId || !newCamName) {
            toast.error("Please enter a valid Camera ID and Name.");
            return;
        }

        const latVal = parseFloat(newCamLat) || 10.8785;
        const lngVal = parseFloat(newCamLng) || 106.8016;

        const newStation = {
            id: newCamId,
            name: newCamName,
            latitude: latVal,
            longitude: lngVal,
            detections: [
                {
                    id: `det_${Date.now()}`,
                    stationId: newCamId,
                    timestamp: new Date().toISOString(),
                    waterDepthCm: 15,
                    floodedAreaPct: 20,
                    vehiclesCount: 0,
                    severity: "LOW",
                    rawFramePath: "/detections/cam1_raw_day_3.jpg",
                    segmentPath: "/detections/cam1_segment_day_3.jpg"
                }
            ]
        };

        onRegister(newStation);
        toast.success(`Successfully connected stream for ${newCamName}!`);
        onClose();
    };

    return (
        <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 flex flex-col gap-4 animate-fade-in font-inter text-xs">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Camera className="w-5 h-5 text-primary" /> Register New Camera Stream
            </h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Camera ID</label>
                        <input 
                            type="text" 
                            value={newCamId}
                            onChange={(e) => setNewCamId(e.target.value)}
                            placeholder="e.g. CAM_04"
                            className="p-3 border rounded-2xl bg-white border-slate-200 text-xs font-bold text-slate-950 outline-none focus:border-primary"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Camera Name / Location</label>
                        <input 
                            type="text" 
                            value={newCamName}
                            onChange={(e) => setNewCamName(e.target.value)}
                            placeholder="e.g. Camera #4 - Marie Curie West Gate"
                            className="p-3 border rounded-2xl bg-white border-slate-200 text-xs font-bold text-slate-955 outline-none focus:border-primary"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Latitude</label>
                        <input 
                            type="text" 
                            value={newCamLat}
                            onChange={(e) => setNewCamLat(e.target.value)}
                            placeholder="10.8785"
                            className="p-3 border rounded-2xl bg-white border-slate-200 text-xs font-bold text-slate-955 outline-none focus:border-primary"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Longitude</label>
                        <input 
                            type="text" 
                            value={newCamLng}
                            onChange={(e) => setNewCamLng(e.target.value)}
                            placeholder="106.8016"
                            className="p-3 border rounded-2xl bg-white border-slate-200 text-xs font-bold text-slate-955 outline-none focus:border-primary"
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-2">
                    <Button type="button" variant="outline" onClick={onClose} className="h-9.5 rounded-xl border-slate-200 bg-white">Cancel</Button>
                    <Button 
                        type="submit"
                        className="h-9.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold border-0 cursor-pointer"
                    >
                        Establish Stream Connection
                    </Button>
                </div>
            </form>
        </div>
    );
}
