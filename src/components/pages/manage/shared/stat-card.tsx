import React from "react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
    title: string;
    value: string;
    description: string;
    icon: React.ReactNode;
}

export function StatCard({ title, value, description, icon }: StatCardProps) {
    return (
        <Card className="rounded-3xl border border-slate-200 bg-white transition-transform hover:scale-[1.02] duration-300">
            <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-sm text-slate-500 font-semibold">{title}</p>
                        <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                            {value}
                        </p>
                        <p className="mt-2 text-xs text-slate-600 leading-normal">{description}</p>
                    </div>
                    <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                        {icon}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
