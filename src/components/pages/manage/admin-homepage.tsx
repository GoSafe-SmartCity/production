"use client";

import { useMemo } from "react";
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Area,
    AreaChart,
} from "recharts";
import {
    BarChart3,
    Camera,
    Users,
    ShieldCheck,
    TrendingUp,
} from "lucide-react";
import { AuroraText } from "@/components/ui/aurora-text";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

const registrationsData = [
    { day: "Mon", registrations: 18 },
    { day: "Tue", registrations: 24 },
    { day: "Wed", registrations: 21 },
    { day: "Thu", registrations: 31 },
    { day: "Fri", registrations: 28 },
    { day: "Sat", registrations: 35 },
    { day: "Sun", registrations: 26 },
];

const controlData = [
    { name: "Active cameras", value: 18 },
    { name: "Offline cameras", value: 3 },
];

function StatCard({
    title,
    value,
    description,
    icon,
}: {
    title: string;
    value: string;
    description: string;
    icon: React.ReactNode;
}) {
    return (
        <Card className="rounded-3xl border-border/60 bg-card/90 shadow-sm backdrop-blur">
            <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-sm text-muted-foreground">{title}</p>
                        <p className="mt-2 text-3xl font-semibold tracking-tight">
                            {value}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
                    </div>
                    <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                        {icon}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export function AdminHomePage() {
    const weeklyTotal = useMemo(
        () => registrationsData.reduce((sum, item) => sum + item.registrations, 0),
        [],
    );

    return (
        <main className="min-h-screen bg-background text-foreground">
            <section className="relative overflow-hidden border-b border-border/60">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_24%),linear-gradient(to_bottom,rgba(255,255,255,0.06),transparent)]" />
                <div className="container relative mx-auto px-4 py-12 md:py-16">
                    <div className="max-w-3xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary/80">
                            Admin Dashboard
                        </p>
                        <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
                            <AuroraText>GoSafe</AuroraText> control center
                        </h1>
                        <p className="mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
                            Monitor platform health, review registration momentum, and keep
                            camera coverage under control from a single modular admin home.
                        </p>
                    </div>

                    <div className="mt-8 flex flex-wrap gap-3">
                        <Button
                            className="rounded-full px-5 font-semibold shadow-sm"
                            size="lg"
                        >
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            Review reports
                        </Button>
                        <Button
                            variant="outline"
                            className="rounded-full px-5 font-semibold"
                            size="lg"
                        >
                            <Camera className="mr-2 h-4 w-4" />
                            Camera control
                        </Button>
                    </div>
                </div>
            </section>

            <section className="container mx-auto px-4 py-10 md:py-14">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        title="Total users"
                        value="12,480"
                        description="Mock platform user base for the admin overview."
                        icon={<Users className="h-5 w-5" />}
                    />
                    <StatCard
                        title="Weekly registrations"
                        value={weeklyTotal.toString()}
                        description="Total signups across the last 7 days."
                        icon={<TrendingUp className="h-5 w-5" />}
                    />
                    <StatCard
                        title="Cameras in control"
                        value="18"
                        description="Live cameras currently managed by the operations team."
                        icon={<Camera className="h-5 w-5" />}
                    />
                    <StatCard
                        title="Active coverage"
                        value="94%"
                        description="Monitoring coverage across critical flood zones."
                        icon={<BarChart3 className="h-5 w-5" />}
                    />
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
                    <Card className="rounded-3xl border-border/60 bg-card/90 shadow-sm backdrop-blur">
                        <CardHeader className="border-b border-border/50 px-6 py-5">
                            <CardTitle className="text-xl font-semibold">
                                Weekly registrations
                            </CardTitle>
                            <CardDescription>
                                Mock line chart showing how registrations moved during the last
                                week.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="px-4 py-6 sm:px-6">
                            <div className="h-[320px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart
                                        data={registrationsData}
                                        margin={{ top: 10, right: 16, left: -16, bottom: 0 }}
                                    >
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke="hsl(var(--border))"
                                            opacity={0.35}
                                        />
                                        <XAxis
                                            dataKey="day"
                                            stroke="hsl(var(--muted-foreground))"
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            stroke="hsl(var(--muted-foreground))"
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <Tooltip
                                            cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                                            contentStyle={{
                                                borderRadius: 16,
                                                border: "1px solid hsl(var(--border))",
                                                background: "hsl(var(--background))",
                                                boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
                                            }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="registrations"
                                            stroke="hsl(var(--primary))"
                                            strokeWidth={3}
                                            dot={{
                                                r: 4,
                                                strokeWidth: 2,
                                                fill: "hsl(var(--background))",
                                            }}
                                            activeDot={{ r: 6 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-3xl border-border/60 bg-card/90 shadow-sm backdrop-blur">
                        <CardHeader className="border-b border-border/50 px-6 py-5">
                            <CardTitle className="text-xl font-semibold">
                                Camera control
                            </CardTitle>
                            <CardDescription>
                                Current operational split between active and offline cameras.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="px-6 py-6">
                            <div className="h-[220px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart
                                        data={controlData}
                                        layout="vertical"
                                        margin={{ top: 0, right: 8, left: 8, bottom: 0 }}
                                    >
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            horizontal={false}
                                            stroke="hsl(var(--border))"
                                            opacity={0.3}
                                        />
                                        <XAxis type="number" hide />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            width={120}
                                            stroke="hsl(var(--muted-foreground))"
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: 16,
                                                border: "1px solid hsl(var(--border))",
                                                background: "hsl(var(--background))",
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="value"
                                            stroke="hsl(var(--primary))"
                                            fill="hsl(var(--primary) / 0.18)"
                                            strokeWidth={3}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-4 flex items-center justify-between rounded-2xl border border-border/60 bg-background/60 px-4 py-3 text-sm">
                                <span className="text-muted-foreground">
                                    Cameras under control
                                </span>
                                <span className="font-semibold text-foreground">
                                    18 online, 3 attention needed
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </section>
        </main>
    );
}