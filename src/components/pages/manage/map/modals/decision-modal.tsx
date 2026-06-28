"use client";

import React, { useState } from "react";
import { Brain, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface DecisionModalProps {
    selectedDecisionDetail: any;
    onClose: () => void;
}

export function DecisionModal({ selectedDecisionDetail, onClose }: DecisionModalProps) {
    const [isSending, setIsSending] = useState(false);

    const handleDispatchClosure = async () => {
        setIsSending(true);
        try {
            const res = await fetch("/api/notifications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "broadcast",
                    title: `Road Closed: ${selectedDecisionDetail.locationName}`,
                    message: `Road closed due to severe flooding detected by sensor fusion.`,
                }),
            });
            if (res.ok) {
                toast.success("Emergency closure alert broadcasted!");
                onClose();
            } else {
                toast.error("Failed to broadcast alert.");
            }
        } catch (e) {
            toast.error("Communication failure");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in text-xs">
            <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 flex flex-col gap-4 shadow-2xl">
                <div className="flex items-center justify-between border-b pb-3 border-slate-150">
                    <h3 className="font-bold text-sm flex items-center gap-1.5 text-primary">
                        <Brain className="w-5 h-5 text-primary animate-pulse" /> Sensor Fusion Decision Scorecard
                    </h3>
                    <button onClick={onClose} className="h-6 w-6 rounded-full border-0 bg-transparent text-slate-400 hover:text-slate-650 cursor-pointer flex items-center justify-center">
                        <XCircle className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex flex-col gap-2 font-semibold text-slate-900">
                    <h4 className="font-bold text-sm text-slate-900">{selectedDecisionDetail.locationName}</h4>
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider block mt-0.5">Consolidated sensor analysis reports</span>
                    <p className="text-slate-600 leading-normal font-normal border-t pt-2 mt-1 border-slate-100">{selectedDecisionDetail.description}</p>
                </div>

                <div className="flex flex-col gap-3 p-4 rounded-2xl bg-red-500/5 border border-red-500/15 font-semibold text-slate-750">
                    <div className="flex justify-between items-center border-b pb-2 border-red-500/10 font-bold text-slate-900">
                        <span>Risk Rating:</span>
                        <span className="text-red-600 text-sm font-black">{selectedDecisionDetail.totalScore}%</span>
                    </div>
                    <div className="flex flex-col gap-2 text-[11px] text-slate-700">
                        <p><strong>CCTV:</strong> {selectedDecisionDetail.cameras}</p>
                        <p><strong>Weather:</strong> {selectedDecisionDetail.weather}</p>
                        <p><strong>Citizen reports:</strong> {selectedDecisionDetail.citizen}</p>
                    </div>
                    <div className="border-t pt-2 border-red-500/15 flex items-center justify-between font-bold">
                        <span>Action:</span>
                        <span className="text-xs px-2.5 py-0.5 rounded bg-red-650 text-white font-bold uppercase">
                            ROAD CLOSED
                        </span>
                    </div>
                </div>

                <div className="flex justify-end gap-2 border-t pt-4 border-slate-100">
                    <Button variant="outline" onClick={onClose} className="h-9 rounded-xl text-[10px] font-bold border-slate-200 bg-white">Close</Button>
                    <Button
                        disabled={isSending}
                        onClick={handleDispatchClosure}
                        className="h-9 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] border-0 shadow-md"
                    >
                        {isSending ? "Dispatching..." : "Dispatch Closure Notice"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
