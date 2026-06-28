"use client";

import { useState, useEffect } from "react";
import { Link2, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Stats {
  totalUrls: number;
  totalVisits: number;
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
}

function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl border bg-card p-4 transition-all hover:shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tracking-tight mt-1">
            {value.toLocaleString("vi-VN")}
          </p>
        </div>
        <div className="rounded-2xl p-2.5 bg-primary/10">
          {icon}
        </div>
      </div>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="rounded-3xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-16 mt-1" />
        </div>
        <Skeleton className="h-10 w-10 rounded-2xl" />
      </div>
    </div>
  );
}

export function GlobalStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 mb-6 max-w-md mx-auto">
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 gap-3 mb-6 max-w-md mx-auto">
      <StatCard
        label="Tổng liên kết"
        value={stats.totalUrls}
        icon={<Link2 className="h-5 w-5 text-primary" />}
      />
      <StatCard
        label="Tổng lượt truy cập"
        value={stats.totalVisits}
        icon={<Eye className="h-5 w-5 text-primary" />}
      />
    </div>
  );
}
