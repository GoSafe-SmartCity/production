"use client";

import React from "react";
import { Clock, Calendar } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface TimelineScrubberProps {
    selectedDate: string;
    setSelectedDate: (date: string) => void;
    selectedHour: number;
    setSelectedHour: (hour: number) => void;
}

export function TimelineScrubber({
    selectedDate,
    setSelectedDate,
    selectedHour,
    setSelectedHour
}: TimelineScrubberProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center border-t pt-4 border-slate-100">
            {/* Date Select Dropdown */}
            <div className="lg:col-span-3 flex flex-col gap-1 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date Scrubber
                </span>
                <Select value={selectedDate} onValueChange={setSelectedDate}>
                    <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50 border-slate-200 text-xs font-bold text-slate-800">
                        <SelectValue placeholder="Select date" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-slate-200 rounded-xl font-bold text-xs">
                        <SelectItem value="2026-06-20">June 20, 2026</SelectItem>
                        <SelectItem value="2026-06-21">June 21, 2026</SelectItem>
                        <SelectItem value="2026-06-22">June 22, 2026</SelectItem>
                        <SelectItem value="2026-06-23">June 23, 2026 (Peak Flooding)</SelectItem>
                        <SelectItem value="2026-06-24">June 24, 2026</SelectItem>
                        <SelectItem value="2026-06-25">June 25, 2026</SelectItem>
                        <SelectItem value="2026-06-26">June 26, 2026 (Moderate Flooding)</SelectItem>
                        <SelectItem value="2026-06-27">June 27, 2026</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Time Range Slider (0 - 24 hours) */}
            <div className="lg:col-span-9 flex flex-col gap-1.5 text-xs">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                    <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" /> Time Slider (Scrub to Replay)
                    </span>
                    <span className="text-primary text-xs font-extrabold normal-case bg-primary/10 px-2 py-0.5 rounded-lg">
                        {selectedDate} at {selectedHour < 10 ? `0${selectedHour}` : selectedHour}:00 ({selectedHour >= 12 ? `${selectedHour === 12 ? 12 : selectedHour - 12} PM` : `${selectedHour} AM`})
                    </span>
                </div>
                
                <div className="flex items-center gap-4 w-full bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <span className="text-[9px] font-bold text-slate-500">00:00</span>
                    <input 
                        type="range" 
                        min="0" 
                        max="24" 
                        value={selectedHour} 
                        onChange={(e) => setSelectedHour(parseInt(e.target.value))}
                        className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <span className="text-[9px] font-bold text-slate-500">24:00</span>
                </div>
                
                {/* Tick Labels */}
                <div className="flex justify-between px-7 text-[8px] font-bold text-slate-400 -mt-1 select-none">
                    <span>04:00</span>
                    <span>08:00</span>
                    <span>12:00 (Noon)</span>
                    <span>16:00</span>
                    <span>20:00</span>
                </div>
            </div>
        </div>
    );
}
