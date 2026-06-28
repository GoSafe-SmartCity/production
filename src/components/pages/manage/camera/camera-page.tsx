"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RegisterCameraForm } from "./register-camera-form";
import { CameraStreamsGrid } from "./camera-streams-grid";
import { toast } from "sonner";

export function CameraPage() {
    const [cameraStations, setCameraStations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isConnectFormOpen, setIsConnectFormOpen] = useState(false);

    const fetchCameraDetections = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await fetch("/api/camera/detections");
            if (res.ok) {
                const data = await res.json();
                setCameraStations(data);
            }
        } catch (e) {
            console.error("Failed to load camera stations:", e);
            toast.error("Could not fetch camera detections.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCameraDetections();
    }, [fetchCameraDetections]);

    const handleRegisterNewCamera = (newStation: any) => {
        setCameraStations(prev => [newStation, ...prev]);
    };

    return (
        <div className="flex flex-col w-full">
            {/* Header */}
            <div className="px-8 pt-8 pb-4 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Camera Control Center</h1>
                    <p className="text-sm text-slate-500 mt-1">Connect new hardware stations or manage active AI segmentation feeds.</p>
                </div>
                <Button 
                    onClick={() => setIsConnectFormOpen(!isConnectFormOpen)}
                    className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 border-0 shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                    <Plus className="w-4 h-4" /> {isConnectFormOpen ? "Hide Form" : "Connect New Camera"}
                </Button>
            </div>

            <div className="w-full h-px bg-slate-200" />

            <div className="flex flex-col gap-6 px-8 py-6">
                {/* Connect Camera Form */}
                {isConnectFormOpen && (
                    <RegisterCameraForm 
                        onRegister={handleRegisterNewCamera}
                        onClose={() => setIsConnectFormOpen(false)}
                    />
                )}

                {/* Camera Streams Grid */}
                {isLoading && cameraStations.length === 0 ? (
                    <div className="text-center py-20 text-xs font-semibold text-slate-500 flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-primary" /> Loading camera streams...
                    </div>
                ) : (
                    <CameraStreamsGrid 
                        cameraStations={cameraStations}
                        onViewLiveFeed={() => {}}
                    />
                )}
            </div>
        </div>
    );
}
