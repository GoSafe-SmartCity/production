"use client";

import React from "react";
import { SlidersHorizontal, ShieldAlert, Camera, Users, CloudRain, Brain } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface FilterControlsProps {
    filterCategory: string;
    setFilterCategory: (cat: string) => void;
    filterRiskLevel: string;
    setFilterRiskLevel: (level: string) => void;
    showCamera: boolean;
    setShowCamera: (val: boolean) => void;
    showFeedback: boolean;
    setShowFeedback: (val: boolean) => void;
    showWeather: boolean;
    setShowWeather: (val: boolean) => void;
    showDecision: boolean;
    setShowDecision: (val: boolean) => void;
}

export function FilterControls({
    filterCategory,
    setFilterCategory,
    filterRiskLevel,
    setFilterRiskLevel,
    showCamera,
    setShowCamera,
    showFeedback,
    setShowFeedback,
    showWeather,
    setShowWeather,
    showDecision,
    setShowDecision
}: FilterControlsProps) {
    return (
        <div className="flex flex-wrap items-center gap-4 justify-between">
            {/* Dropdowns */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" /> Category
                    </span>
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger className="w-[140px] h-10 rounded-xl bg-slate-50 border-slate-200 text-xs font-bold text-slate-800">
                            <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-slate-200 rounded-xl font-bold text-xs">
                            <SelectItem value="ALL">All Incidents</SelectItem>
                            <SelectItem value="FLOODING">Flooding</SelectItem>
                            <SelectItem value="ACCIDENT">Accident</SelectItem>
                            <SelectItem value="DEBRIS">Debris</SelectItem>
                            <SelectItem value="POTHOLES">Potholes</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5 text-slate-400" /> Risk Level
                    </span>
                    <Select value={filterRiskLevel} onValueChange={setFilterRiskLevel}>
                        <SelectTrigger className="w-[140px] h-10 rounded-xl bg-slate-50 border-slate-200 text-xs font-bold text-slate-800">
                            <SelectValue placeholder="Risk Level" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-slate-200 rounded-xl font-bold text-xs">
                            <SelectItem value="ALL">All Risk Levels</SelectItem>
                            <SelectItem value="HIGH">High Risk</SelectItem>
                            <SelectItem value="MEDIUM">Medium Risk</SelectItem>
                            <SelectItem value="LOW">Low Risk</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Switcher Badges (OUTSIDE AND ABOVE THE MAP) */}
            <div className="flex flex-wrap items-center gap-2">
                <button 
                    onClick={() => setShowCamera(!showCamera)} 
                    className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold cursor-pointer transition-all",
                        showCamera ? "bg-emerald-50 border-emerald-500 text-emerald-700 font-extrabold" : "bg-slate-50 border-slate-200 text-slate-500"
                    )}
                >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Camera Telemetry</span>
                </button>

                <button 
                    onClick={() => setShowFeedback(!showFeedback)} 
                    className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold cursor-pointer transition-all",
                        showFeedback ? "bg-blue-50 border-blue-500 text-blue-700 font-extrabold" : "bg-slate-50 border-slate-200 text-slate-500"
                    )}
                >
                    <Users className="w-3.5 h-3.5" />
                    <span>Citizen Feedback</span>
                </button>

                <button 
                    onClick={() => setShowWeather(!showWeather)} 
                    className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold cursor-pointer transition-all",
                        showWeather ? "bg-indigo-50 border-indigo-500 text-indigo-700 font-extrabold" : "bg-slate-50 border-slate-200 text-slate-500"
                    )}
                >
                    <CloudRain className="w-3.5 h-3.5" />
                    <span>Weather Telemetry</span>
                </button>

                <button 
                    onClick={() => setShowDecision(!showDecision)} 
                    className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold cursor-pointer transition-all",
                        showDecision ? "bg-red-50 border-red-500 text-red-700 font-extrabold" : "bg-slate-50 border-slate-200 text-slate-500"
                    )}
                >
                    <Brain className="w-3.5 h-3.5 animate-pulse" />
                    <span>AI Decision Overlay</span>
                </button>
            </div>
        </div>
    );
}
