"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ApproveModalProps {
    activeApproveReport: any;
    onClose: () => void;
    onApprove: (reportId: string, locationName: string) => Promise<void>;
}

export function ApproveModal({
    activeApproveReport,
    onClose,
    onApprove
}: ApproveModalProps) {
    const [approveLocationName, setApproveLocationName] = useState("");
    const [approveAiResult, setApproveAiResult] = useState<any | null>(null);
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const runAiEvaluation = async () => {
            if (!activeApproveReport) return;
            setIsEvaluating(true);
            setApproveAiResult(null);
            try {
                const res = await fetch("/api/incidents/ai-evaluate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        category: activeApproveReport.category,
                        latitude: activeApproveReport.latitude,
                        longitude: activeApproveReport.longitude,
                        description: activeApproveReport.description,
                        confidence: activeApproveReport.confidence,
                    }),
                });

                if (res.ok) {
                    const data = await res.json();
                    setApproveAiResult(data);
                } else {
                    toast.error("Failed to run AI evaluation");
                }
            } catch (e) {
                console.error(e);
                toast.error("AI Evaluation error");
            } finally {
                setIsEvaluating(false);
            }
        };

        runAiEvaluation();
    }, [activeApproveReport]);

    const handleSubmit = async () => {
        if (!approveLocationName) {
            toast.error("Please specify location name");
            return;
        }
        setIsSubmitting(true);
        try {
            await onApprove(activeApproveReport.id, approveLocationName);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in text-xs">
            <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                    <h3 className="font-bold text-sm flex items-center gap-1.5 text-primary">
                        <ShieldCheck className="w-5 h-5" /> Approve Citizen Hazard Report
                    </h3>
                    <button onClick={onClose} className="h-6 w-6 rounded-full border-0 bg-transparent text-slate-450 hover:text-slate-650 cursor-pointer flex items-center justify-center">
                        <XCircle className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex flex-col gap-2 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 font-semibold text-slate-900">
                    <span className="text-[10px] font-bold text-slate-500 uppercase leading-none">Report Content</span>
                    <span className="font-bold text-sm text-slate-900 leading-normal capitalize">{activeApproveReport.category.toLowerCase()} report</span>
                    <p className="text-slate-650 leading-normal mt-0.5 font-normal">{activeApproveReport.description}</p>
                    
                    {activeApproveReport.imageUrl && (
                        <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 max-h-[160px] bg-slate-100 flex items-center justify-center">
                            <img 
                                src={activeApproveReport.imageUrl} 
                                alt="Citizen reported evidence" 
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}

                    <span className="text-[9px] text-slate-400 font-bold mt-1">Coords: {activeApproveReport.latitude.toFixed(5)}, {activeApproveReport.longitude.toFixed(5)}</span>
                </div>

                <div className="flex flex-col gap-2 p-4 rounded-2xl bg-primary/5 border border-primary/20">
                    <span className="text-[10px] font-bold text-primary uppercase flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-primary animate-pulse" /> AI Hazard Analysis
                    </span>
                    {isEvaluating ? (
                        <p className="text-primary/80 animate-pulse font-semibold mt-1 flex items-center gap-1.5">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Querying GoSafe neural evaluator...
                        </p>
                    ) : approveAiResult ? (
                        <div className="flex flex-col gap-2 mt-1 font-semibold text-slate-900">
                            <div className="flex justify-between border-b pb-1.5 border-primary/10">
                                <span>Risk Level:</span>
                                <span className="text-primary font-bold">{approveAiResult.riskLevel} ({approveAiResult.riskScore}%)</span>
                            </div>
                            <div>
                                <span className="text-primary font-bold block mb-1">AI Recommendation routing:</span>
                                <p className="text-xs leading-normal text-slate-700 font-normal">{approveAiResult.recommendation}</p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-slate-500 font-semibold mt-1">AI assessment unavailable.</p>
                    )}
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Road Location Name</label>
                    <input
                        type="text"
                        value={approveLocationName}
                        onChange={(e) => setApproveLocationName(e.target.value)}
                        placeholder="e.g. Vo Truong Toan St Intersection"
                        className="p-3 border rounded-2xl bg-slate-50 border-slate-200 text-xs font-bold text-slate-900 outline-none focus:border-primary transition-colors"
                    />
                </div>

                <div className="flex justify-end gap-2 border-t pt-4 border-slate-100">
                    <Button variant="outline" onClick={onClose} className="h-9 rounded-xl text-[10px] font-bold border-slate-200 bg-white">Cancel</Button>
                    <Button
                        disabled={isEvaluating || !approveAiResult || !approveLocationName || isSubmitting}
                        onClick={handleSubmit}
                        className="h-9 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[10px] border-0"
                    >
                        {isSubmitting ? "Approving..." : "Approve & Map Overlay (+10 pts)"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
