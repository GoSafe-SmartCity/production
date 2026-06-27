"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import { Share2, Monitor, Smartphone, Clock, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, subDays, differenceInDays } from "date-fns";
import { vi } from "date-fns/locale";
import { DateRange } from "react-day-picker";

interface AnalyticsData {
  stats: {
    total: number;
    last24h: number;
    last7d: number;
    last30d: number;
  };
  byPlatform: { name: string; value: number }[];
  byBrowser: { name: string; value: number }[];
  byDevice: { name: string; value: number }[];
  byDate: { date: string; visits: number }[];
  recentVisits: {
    id: string;
    createdAt: string;
    country: string;
    referer: string;
    userAgent: string;
  }[];
}

interface LinkAnalyticsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  urlId: string;
  shortCode: string;
}

const COLORS = ["#6366f1", "#22c55e", "#f97316", "#ef4444", "#a855f7", "#ec4899", "#14b8a6", "#eab308"];

export function LinkAnalyticsDialog({
  open,
  onOpenChange,
  urlId,
  shortCode,
}: LinkAnalyticsDialogProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedRange, setAppliedRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [tempRange, setTempRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const days = appliedRange?.from && appliedRange?.to 
    ? differenceInDays(appliedRange.to, appliedRange.from) + 1 
    : 30;

  useEffect(() => {
    if (open && urlId) {
      fetchAnalytics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, urlId, appliedRange]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Set start of day (00:00:00) for fromDate
      const fromDateObj = appliedRange?.from || subDays(new Date(), 30);
      const fromDate = new Date(fromDateObj);
      fromDate.setHours(0, 0, 0, 0);
      
      // Set end of day (23:59:59) for toDate
      const toDateObj = appliedRange?.to || new Date();
      const toDate = new Date(toDateObj);
      toDate.setHours(23, 59, 59, 999);
      
      const res = await fetch(`/api/urls/${urlId}/analytics?from=${fromDate.toISOString()}&to=${toDate.toISOString()}`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      const json = await res.json();
      setData(json);
    } catch {
      setError("Không thể tải dữ liệu thống kê");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="mb-8 flex h-[calc(100vh-2rem)] min-w-[calc(100vw-2rem)] flex-col gap-0 p-0 rounded-3xl overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>
            Thống kê truy cập
          </DialogTitle>
          <DialogDescription>
            Phân tích chi tiết cho liên kết <Badge variant="secondary" className="rounded-xl">/{shortCode}</Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6">
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-64 rounded-2xl bg-muted/50 animate-pulse" />
            <div className="grid grid-cols-3 gap-4">
              <div className="h-48 rounded-2xl bg-muted/50 animate-pulse" />
              <div className="h-48 rounded-2xl bg-muted/50 animate-pulse" />
              <div className="h-48 rounded-2xl bg-muted/50 animate-pulse" />
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">{error}</div>
        ) : data ? (
          <div className="space-y-6">
            {/* Line Chart - Visits over time */}
            <div className="p-4 rounded-2xl bg-card border">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h3 className="font-semibold">
                  Lượt truy cập ({days} ngày)
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Quick Filters */}
                  <div className="flex gap-1">
                    <Button
                      variant={days === 7 ? "default" : "outline"}
                      size="sm"
                      className="h-8 px-3 rounded-full"
                      onClick={() => {
                        const newRange = { from: subDays(new Date(), 6), to: new Date() };
                        setAppliedRange(newRange);
                        setTempRange(newRange);
                      }}
                    >
                      7 ngày
                    </Button>
                    <Button
                      variant={days === 14 ? "default" : "outline"}
                      size="sm"
                      className="h-8 px-3 rounded-full"
                      onClick={() => {
                        const newRange = { from: subDays(new Date(), 13), to: new Date() };
                        setAppliedRange(newRange);
                        setTempRange(newRange);
                      }}
                    >
                      14 ngày
                    </Button>
                    <Button
                      variant={days === 30 ? "default" : "outline"}
                      size="sm"
                      className="h-8 px-3 rounded-full"
                      onClick={() => {
                        const newRange = { from: subDays(new Date(), 29), to: new Date() };
                        setAppliedRange(newRange);
                        setTempRange(newRange);
                      }}
                    >
                      30 ngày
                    </Button>
                  </div>
                  
                  {/* Date Range Picker */}
                  <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 rounded-full gap-2"
                      >
                        <CalendarIcon className="w-4 h-4" />
                        {appliedRange?.from ? (
                          appliedRange.to ? (
                            <>
                              {format(appliedRange.from, "dd/MM/yy", { locale: vi })} -{" "}
                              {format(appliedRange.to, "dd/MM/yy", { locale: vi })}
                            </>
                          ) : (
                            format(appliedRange.from, "dd/MM/yyyy", { locale: vi })
                          )
                        ) : (
                          "Chọn ngày"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-2xl" align="end">
                      <Calendar
                        mode="range"
                        defaultMonth={tempRange?.from}
                        selected={tempRange}
                        onSelect={setTempRange}
                        numberOfMonths={2}
                        locale={vi}
                        disabled={(date) =>
                          date > new Date() || date < subDays(new Date(), 365)
                        }
                      />
                      <div className="p-3 border-t flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          onClick={() => {
                            setTempRange(appliedRange);
                            setIsPopoverOpen(false);
                          }}
                        >
                          Hủy
                        </Button>
                        <Button
                          size="sm"
                          className="rounded-full"
                          onClick={() => {
                            if (tempRange?.from && tempRange?.to) {
                              setAppliedRange(tempRange);
                            }
                            setIsPopoverOpen(false);
                          }}
                          disabled={!tempRange?.from || !tempRange?.to}
                        >
                          Áp dụng
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={data.byDate}>
                  <defs>
                    <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4}/>
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }} 
                    tickFormatter={(v) => v.slice(5)}
                    stroke="var(--muted-foreground)"
                  />
                  <YAxis stroke="var(--muted-foreground)" tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "var(--card)", 
                      border: "1px solid var(--border)",
                      borderRadius: "12px"
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="visits" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorVisits)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* By Platform */}
              <div className="p-4 rounded-2xl bg-card border">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-primary" />
                  Nguồn truy cập
                </h3>
                {data.byPlatform.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={150}>
                      <PieChart>
                        <Pie
                          data={data.byPlatform}
                          cx="50%"
                          cy="50%"
                          outerRadius={60}
                          dataKey="value"
                          label={false}
                        >
                          {data.byPlatform.map((_, index) => (
                            <Cell key={index} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1 mt-2">
                      {data.byPlatform.slice(0, 5).map((item, i) => (
                        <div key={item.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-2 h-2 rounded-full" 
                              style={{ backgroundColor: COLORS[i % COLORS.length] }}
                            />
                            <span className="text-muted-foreground truncate max-w-[100px]">
                              {item.name}
                            </span>
                          </div>
                          <span className="font-medium">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Chưa có dữ liệu
                  </p>
                )}
              </div>

              {/* By Browser */}
              <div className="p-4 rounded-2xl bg-card border">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-primary" />
                  Trình duyệt
                </h3>
                {data.byBrowser.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={150}>
                      <PieChart>
                        <Pie
                          data={data.byBrowser}
                          cx="50%"
                          cy="50%"
                          outerRadius={60}
                          dataKey="value"
                          label={false}
                        >
                          {data.byBrowser.map((_, index) => (
                            <Cell key={index} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1 mt-2">
                      {data.byBrowser.map((item, i) => (
                        <div key={item.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-2 h-2 rounded-full" 
                              style={{ backgroundColor: COLORS[i % COLORS.length] }}
                            />
                            <span className="text-muted-foreground">{item.name}</span>
                          </div>
                          <span className="font-medium">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Chưa có dữ liệu
                  </p>
                )}
              </div>

              {/* By Device */}
              <div className="p-4 rounded-2xl bg-card border">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-primary" />
                  Thiết bị
                </h3>
                {data.byDevice.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={150}>
                      <PieChart>
                        <Pie
                          data={data.byDevice}
                          cx="50%"
                          cy="50%"
                          outerRadius={60}
                          dataKey="value"
                          label={false}
                        >
                          {data.byDevice.map((_, index) => (
                            <Cell key={index} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1 mt-2">
                      {data.byDevice.map((item, i) => (
                        <div key={item.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-2 h-2 rounded-full" 
                              style={{ backgroundColor: COLORS[i % COLORS.length] }}
                            />
                            <span className="text-muted-foreground">{item.name}</span>
                          </div>
                          <span className="font-medium">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Chưa có dữ liệu
                  </p>
                )}
              </div>
            </div>

            {/* Recent Visits */}
            <div className="p-4 rounded-2xl bg-card border">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Lượt truy cập gần đây
              </h3>
              {data.recentVisits.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {data.recentVisits.map((visit) => (
                    <div
                      key={visit.id}
                      className="flex items-center justify-between text-sm p-2 rounded-xl bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="rounded-lg text-xs">
                          {visit.country}
                        </Badge>
                        <span className="text-muted-foreground truncate max-w-[200px]">
                          {visit.referer}
                        </span>
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {new Date(visit.createdAt).toLocaleString("vi-VN")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Chưa có lượt truy cập
                </p>
              )}
            </div>
          </div>
        ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
