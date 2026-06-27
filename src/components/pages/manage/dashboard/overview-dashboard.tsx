"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Users, ShieldAlert, Award } from "lucide-react";
import { StatCard } from "../shared/stat-card";
import { OverviewCharts } from "./overview-charts";

export function OverviewDashboard() {
    const [pendingCount, setPendingCount] = useState(0);
    const [approvedCount, setApprovedCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setIsLoading(true);
                const [pendingRes, approvedRes] = await Promise.all([
                    fetch("/api/incidents?mode=reports&status=PENDING"),
                    fetch("/api/incidents?mode=reports&status=APPROVED")
                ]);

                if (pendingRes.ok) {
                    const data = await pendingRes.json();
                    setPendingCount(data.length);
                }
                if (approvedRes.ok) {
                    const data = await approvedRes.json();
                    setApprovedCount(data.length);
                }
            } catch (e) {
                console.error("Failed to load dashboard metrics", e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, []);

    const totalReports = pendingCount + approvedCount;

    return (
        <div className="flex flex-col w-full">
            {/* Header */}
            <div className="px-8 pt-8 pb-4">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Analytics &amp; Cities Status</h1>
                <p className="text-sm text-slate-500 mt-1">Real-time stats of citizen reports, flood telemetry, and community rewards voucher claims.</p>
            </div>

            <div className="w-full h-px bg-slate-200" />

            <div className="flex flex-col gap-6 px-8 py-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard 
                        title="Total Safety Wallet" 
                        value="1,240 pts" 
                        description="+180 pts earned this week by citizens" 
                        icon={<TrendingUp className="w-6 h-6" />} 
                    />
                    <StatCard 
                        title="Citizen Reports" 
                        value={isLoading ? "..." : String(totalReports)} 
                        description="Total reports logged in database" 
                        icon={<Users className="w-6 h-6" />} 
                    />
                    <StatCard 
                        title="Max Flood Depth" 
                        value="48.0 cm" 
                        description="Peak flood depth recorded on CAM_01" 
                        icon={<ShieldAlert className="w-6 h-6 text-red-650" />} 
                    />
                    <StatCard 
                        title="Vouchers Issued" 
                        value="38 claimed" 
                        description="Rewards exchanged during flooding" 
                        icon={<Award className="w-6 h-6" />} 
                    />
                </div>

                <OverviewCharts />
            </div>
        </div>
    );
}
