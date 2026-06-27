"use client";

import { useMemo } from "react";
import {
    ResponsiveContainer,
    Area,
    AreaChart,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Cell
} from "recharts";
import { Camera } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const registrationsData = [
    { day: "Mon", registrations: 18 },
    { day: "Tue", registrations: 24 },
    { day: "Wed", registrations: 21 },
    { day: "Thu", registrations: 31 },
    { day: "Fri", registrations: 28 },
    { day: "Sat", registrations: 35 },
    { day: "Sun", registrations: 26 },
];

export function OverviewCharts() {
    const camerasStatusData = useMemo(() => {
        return [
            { name: "Online", value: 3, color: "#10b981" },
            { name: "Offline", value: 0, color: "#f97316" }
        ];
    }, []);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
            <Card className="rounded-3xl border border-slate-200 bg-white lg:col-span-2 shadow-sm">
                <CardHeader className="border-b border-slate-100 px-6 py-5">
                    <CardTitle className="text-base font-bold text-slate-900">Incident Reports History</CardTitle>
                    <CardDescription className="text-xs text-slate-500">Historical count of daily safety report contributions.</CardDescription>
                </CardHeader>
                <CardContent className="px-4 py-6 sm:px-6">
                    <div className="h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={registrationsData} margin={{ top: 10, right: 16, left: -22, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorReg" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="oklch(0.58 0.19 142)" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="oklch(0.58 0.19 142)" stopOpacity={0.01}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.4} />
                                <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                                <Tooltip
                                    cursor={{ stroke: "#e2e8f0", strokeWidth: 1 }}
                                    contentStyle={{
                                        borderRadius: 16,
                                        border: "1px solid #e2e8f0",
                                        background: "#ffffff",
                                        color: "#0f172a",
                                    }}
                                />
                                <Area type="monotone" dataKey="registrations" stroke="oklch(0.58 0.19 142)" strokeWidth={3} fillOpacity={1} fill="url(#colorReg)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                <CardHeader className="border-b border-slate-100 px-6 py-5">
                    <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2"><Camera className="w-4.5 h-4.5 text-primary" /> Camera Station Status</CardTitle>
                    <CardDescription className="text-xs text-slate-500 font-medium">Telemetry status breakdown for all operational cameras.</CardDescription>
                </CardHeader>
                <CardContent className="px-6 py-6 flex flex-col justify-between h-[340px]">
                    <div className="h-[180px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={camerasStatusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.3} />
                                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid #e2e8f0", background: "#ffffff", color: "#0f172a" }} />
                                <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                                    {camerasStatusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs mt-2">
                        <span className="text-slate-500 font-semibold">Active Stations</span>
                        <span className="font-bold text-emerald-600">100% (3/3 Online)</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
