"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { 
  BookOpen, 
  Key, 
  Database, 
  Camera, 
  Gift, 
  Terminal, 
  ChevronRight, 
  ExternalLink,
  Check,
  Info,
  Play,
  Wifi,
  RefreshCw,
  Server,
  DollarSign,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { AuroraText } from "@/components/ui/aurora-text";
import { DotPattern } from "@/components/ui/dot-pattern";
import { cn } from "@/lib/utils";

type DocSection = "overview" | "pricing" | "incidents" | "camera" | "socket" | "vouchers" | "sdk";

interface LogMessage {
  time: string;
  type: "INFO" | "RECV" | "ERR";
  message: string;
}

export default function WikiPage() {
  const { data: session } = useSession();
  const [activeSection, setActiveSection] = useState<DocSection>("overview");

  // API Tester States
  const [incidentsOutput, setIncidentsOutput] = useState<any>(null);
  const [loadingIncidents, setLoadingIncidents] = useState(false);

  const [cameraOutput, setCameraOutput] = useState<any>(null);
  const [loadingCamera, setLoadingCamera] = useState(false);

  const [voucherOutput, setVoucherOutput] = useState<any>(null);
  const [loadingVoucher, setLoadingVoucher] = useState(false);

  // API Parameter States
  const [incidentCategoryParam, setIncidentCategoryParam] = useState("ALL");
  const [incidentRiskParam, setIncidentRiskParam] = useState("ALL");
  const [cameraIdParam, setCameraIdParam] = useState("CAM_01");
  const [voucherIdParam, setVoucherIdParam] = useState("vch_01");

  // Socket Simulator States
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [socketLogs, setSocketLogs] = useState<LogMessage[]>([]);
  const logTimerRef = useRef<NodeJS.Timeout | null>(null);
  const logScrollRef = useRef<HTMLDivElement | null>(null);

  // Sidebar items definition
  const menuItems = [
    { id: "overview", label: "Tổng quan", icon: BookOpen },
    { id: "pricing", label: "Bảng giá dịch vụ", icon: DollarSign },
    { id: "incidents", label: "GET /api/incidents (Bản đồ)", icon: Database },
    { id: "camera", label: "POST /api/camera/detections (Camera AI)", icon: Camera },
    { id: "socket", label: "Real-time Socket (Websocket)", icon: Wifi },
    { id: "vouchers", label: "POST /api/vouchers/exchange", icon: Gift },
    { id: "sdk", label: "SDK & Code Samples", icon: Terminal },
  ];

  // API executing simulation handlers
  const runIncidentsTest = async () => {
    setLoadingIncidents(true);
    setIncidentsOutput(null);
    try {
      let query = "/api/incidents";
      const params = [];
      if (incidentCategoryParam !== "ALL") params.push(`category=${incidentCategoryParam}`);
      if (incidentRiskParam !== "ALL") params.push(`riskLevel=${incidentRiskParam}`);
      if (params.length > 0) query += "?" + params.join("&");

      const res = await fetch(query);
      if (res.ok) {
        const data = await res.json();
        setIncidentsOutput(data);
      } else {
        setIncidentsOutput({ error: "Failed to fetch incidents from endpoint" });
      }
    } catch (e) {
      setIncidentsOutput({ error: "Failed to connect to API endpoint" });
    } finally {
      setLoadingIncidents(false);
    }
  };

  const runCameraTest = async () => {
    setLoadingCamera(true);
    setCameraOutput(null);
    try {
      const res = await fetch("/api/camera/detections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cameraId: cameraIdParam })
      });
      if (res.ok) {
        const data = await res.json();
        setCameraOutput(data);
      } else {
        setCameraOutput({ error: "Failed to run camera AI analytics" });
      }
    } catch (e) {
      setCameraOutput({ error: "Connection to python backend failed" });
    } finally {
      setLoadingCamera(false);
    }
  };

  const runVoucherTest = async () => {
    setLoadingVoucher(true);
    setVoucherOutput(null);
    try {
      const res = await fetch("/api/vouchers/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voucherId: voucherIdParam, dryRun: true })
      });
      const data = await res.json();
      setVoucherOutput(data);
    } catch (e) {
      setVoucherOutput({ error: "Voucher exchange demo failed" });
    } finally {
      setLoadingVoucher(false);
    }
  };

  // Socket Simulator logic
  const toggleSocketConnection = () => {
    if (isSocketConnected) {
      // Disconnect
      setIsSocketConnected(false);
      if (logTimerRef.current) clearInterval(logTimerRef.current);
      setSocketLogs(prev => [
        ...prev,
        {
          time: new Date().toLocaleTimeString(),
          type: "INFO",
          message: "Đã ngắt kết nối khỏi wss://gosafe.vn/ws/traffic"
        }
      ]);
    } else {
      // Connect
      setIsSocketConnected(true);
      const startTime = new Date().toLocaleTimeString();
      setSocketLogs([
        {
          time: startTime,
          type: "INFO",
          message: "Đang mở kết nối WebSocket tới wss://gosafe.vn/ws/traffic..."
        },
        {
          time: startTime,
          type: "INFO",
          message: "Đã xác thực thành công client. Bắt đầu nhận tin stream..."
        }
      ]);

      const mockEvents = [
        "Cập nhật tọa độ CAM_01 (Võ Trường Toản): Nước dâng lên 45cm",
        "Có báo cáo mới từ người dân: Phát hiện ngập cục bộ tại Cổng sau Đại học Quốc tế",
        "Hệ thống tự động đề xuất lộ trình thay thế: Đi qua đường nội bộ ĐHQG thay thế cho Võ Trường Toản",
        "Cập nhật trạng thái sự cố ID 'inc_01': Đã gỡ phong tỏa, đường thông thoáng",
        "CAM_02 phát hiện xe cộ di chuyển bình thường trở lại",
      ];

      let idx = 0;
      logTimerRef.current = setInterval(() => {
        const time = new Date().toLocaleTimeString();
        const message = mockEvents[idx % mockEvents.length];
        setSocketLogs(prev => [
          ...prev,
          {
            time,
            type: "RECV",
            message
          }
        ]);
        idx++;
      }, 3000);
    }
  };

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (logTimerRef.current) clearInterval(logTimerRef.current);
    };
  }, []);

  // Scroll socket terminal to bottom
  useEffect(() => {
    if (logScrollRef.current) {
      logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight;
    }
  }, [socketLogs]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      <Navbar />

      {/* Hero Header Space */}
      <div className="relative pt-24 pb-8 bg-white border-b border-slate-200 overflow-hidden">
        {/* Dot Pattern Background at top left */}
        <DotPattern
          className={cn(
            "absolute inset-y-0 left-0 w-[600px] h-full opacity-60 z-0",
            "stroke-slate-200 dark:stroke-zinc-800"
          )}
          style={{
            maskImage: "radial-gradient(350px circle at top left, white, transparent)",
            WebkitMaskImage: "radial-gradient(350px circle at top left, white, transparent)"
          }}
        />

        <div className="container mx-auto relative z-10">
          <div className="text-left w-full">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
              <AuroraText className="text-3xl sm:text-4xl font-bold tracking-tight inline-block mr-2">GoSafe</AuroraText> - Tài liệu OpenAPI &amp; Hub Nhà phát triển
            </h1>
            <p className="text-sm sm:text-base font-medium text-slate-500 mt-2 leading-relaxed max-w-2xl">
              Cung cấp giải pháp lập trình toàn diện, thời gian thực cho hạ tầng giao thông và chỉ đường tránh ngập úng đô thị thông minh.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="flex-1 w-full container mx-auto flex flex-col md:flex-row items-stretch gap-8 py-8">
        
        {/* Left Navigation Sidebar */}
        <aside className="w-full md:w-64 shrink-0 flex flex-col gap-1.5 self-start">
          <span className="text-[10px] font-bold text-slate-400 uppercase px-4 mb-2 block">Mục tài liệu</span>
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id as DocSection)}
                className={`w-full text-left px-4 py-3 rounded-2xl flex items-center gap-3 transition-colors border-0 cursor-pointer font-bold text-xs ${
                  activeSection === item.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Content Section */}
        <main className="flex-1 bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 text-xs leading-relaxed w-full">
          
          {/* OVERVIEW */}
          {activeSection === "overview" && (
            <div className="flex flex-col gap-6">
              <div className="border-b pb-4 border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900">Giới thiệu GoSafe OpenAPI</h2>
                <p className="text-slate-500 mt-1">Cấu hình kết nối dữ liệu đô thị thông minh.</p>
              </div>
              <p className="text-slate-600 font-semibold text-sm leading-relaxed">
                Nền tảng GoSafe được thiết kế để mở khóa dữ liệu ngập lụt, tắc nghẽn, và phản hồi khẩn cấp cho các cơ quan quản lý đô thị và nhà phát triển ứng dụng di động. Toàn bộ API sử dụng chuẩn REST truyền thống kết hợp kênh WebSockets để phát dữ liệu trực tiếp từ các cảm biến camera OpenCV.
              </p>
              
              <div className="p-4 border border-blue-200 bg-blue-50/50 rounded-2xl flex flex-col gap-1.5 mt-2">
                <span className="text-[10px] font-bold text-blue-800 uppercase">Base API URL</span>
                <code className="text-xs font-bold text-slate-900 font-mono">https://gosafe.vn/api</code>
              </div>

              <h3 className="font-bold text-slate-900 text-sm mt-4">Xác thực Yêu cầu</h3>
              <p className="text-slate-600 font-semibold">
                Đính kèm Bearer Token của bạn vào header của mọi yêu cầu HTTP để xác thực:
              </p>
              <div className="border border-slate-200 rounded-2xl overflow-hidden font-mono bg-slate-50 p-4 text-[11px] leading-snug">
                Authorization: Bearer secret_gosafe_api_key_here
              </div>
            </div>
          )}

          {/* PRICING SECTION */}
          {activeSection === "pricing" && (
            <div className="flex flex-col gap-6">
              <div className="border-b pb-4 border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900">Bảng giá dịch vụ OpenAPI</h2>
                <p className="text-slate-500 mt-1">Lựa chọn gói dữ liệu phù hợp với nhu cầu phát triển dự án của bạn.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch mt-2">
                {/* Free Card */}
                <div className="border border-slate-200 rounded-3xl p-5 flex flex-col justify-between bg-white text-xs">
                  <div className="flex flex-col gap-2">
                    <span className="font-bold text-slate-500 uppercase text-[10px]">Cơ bản (Free)</span>
                    <h3 className="text-xl font-bold text-slate-900">0 VNĐ <span className="text-xs font-normal text-slate-500">/ tháng</span></h3>
                    <p className="text-slate-500 mt-1 font-semibold leading-relaxed">Dành cho sinh viên nghiên cứu khoa học và phát triển thử nghiệm.</p>
                    <div className="h-px bg-slate-100 my-2" />
                    <ul className="flex flex-col gap-2 font-semibold text-slate-600">
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary shrink-0" /> Giới hạn 60 req/phút</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary shrink-0" /> Dữ liệu map trễ 5 phút</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary shrink-0" /> Hỗ trợ qua email</li>
                    </ul>
                  </div>
                  <Button variant="outline" className="w-full h-8 rounded-xl font-bold border-slate-200 bg-white mt-5 text-[10px]">Đăng ký ngay</Button>
                </div>

                {/* Developer Card */}
                <div className="border-2 border-primary rounded-3xl p-5 flex flex-col justify-between bg-primary/5 text-xs relative">
                  <span className="absolute -top-3 right-4 bg-primary text-primary-foreground font-bold text-[8px] px-2 py-0.5 rounded uppercase">Phổ biến</span>
                  <div className="flex flex-col gap-2">
                    <span className="font-bold text-primary uppercase text-[10px]">Nhà phát triển (Developer)</span>
                    <h3 className="text-xl font-bold text-slate-900">499.000 VNĐ <span className="text-xs font-normal text-slate-500">/ tháng</span></h3>
                    <p className="text-slate-500 mt-1 font-semibold leading-relaxed">Truy cập dữ liệu bản đồ không trễ và AI telemetry camera.</p>
                    <div className="h-px bg-slate-200/60 my-2" />
                    <ul className="flex flex-col gap-2 font-semibold text-slate-600">
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary shrink-0" /> Giới hạn 500 req/phút</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary shrink-0" /> Live Map thời gian thực</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary shrink-0" /> Đầy đủ camera CV overlays</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary shrink-0" /> Trợ giúp nhanh 24/7</li>
                    </ul>
                  </div>
                  <Button className="w-full h-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold border-0 mt-5 text-[10px]">Nâng cấp ngay</Button>
                </div>

                {/* Enterprise Card */}
                <div className="border border-slate-200 rounded-3xl p-5 flex flex-col justify-between bg-white text-xs">
                  <div className="flex flex-col gap-2">
                    <span className="font-bold text-slate-500 uppercase text-[10px]">Doanh nghiệp (Enterprise)</span>
                    <h3 className="text-xl font-bold text-slate-900">Liên hệ</h3>
                    <p className="text-slate-500 mt-1 font-semibold leading-relaxed">Dành cho các cơ quan nhà nước, tập đoàn vận tải Logistics.</p>
                    <div className="h-px bg-slate-100 my-2" />
                    <ul className="flex flex-col gap-2 font-semibold text-slate-600">
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary shrink-0" /> Không giới hạn băng thông</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary shrink-0" /> Tích hợp Live WebSockets</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary shrink-0" /> SLA cam kết 99.9% uptime</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary shrink-0" /> Hỗ trợ tích hợp hệ thống riêng</li>
                    </ul>
                  </div>
                  <Button variant="outline" className="w-full h-8 rounded-xl font-bold border-slate-200 bg-white mt-5 text-[10px]">Liên hệ chúng tôi</Button>
                </div>
              </div>
            </div>
          )}

          {/* GET /API/INCIDENTS */}
          {activeSection === "incidents" && (
            <div className="flex flex-col gap-6">
              <div className="border-b pb-4 border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900">GET /api/incidents</h2>
                <p className="text-slate-500 mt-1">Lấy thông tin danh sách điểm sự cố ngập lụt, tắc nghẽn hiện hoạt.</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-blue-600 text-white font-bold rounded text-[9px] uppercase">GET</span>
                <code className="text-xs font-bold text-slate-800 font-mono">/api/incidents</code>
              </div>

              <p className="text-slate-600 font-semibold text-sm">
                API trả về thông tin chi tiết bao gồm tọa độ địa lý, độ rủi ro, và đề xuất điều hướng tự động từ AI.
              </p>

              {/* API Runner Interactive Console */}
              <div className="border border-slate-200 rounded-3xl p-5 bg-slate-50 flex flex-col gap-3">
                {/* Parameters Selector Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-white border border-slate-200 rounded-2xl">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Phân loại sự cố (category)</label>
                    <select
                      value={incidentCategoryParam}
                      onChange={(e) => setIncidentCategoryParam(e.target.value)}
                      className="p-2 border rounded-xl bg-slate-50 border-slate-200 text-xs font-bold text-slate-800 cursor-pointer outline-none"
                    >
                      <option value="ALL">Tất cả loại sự cố</option>
                      <option value="FLOODING">Flooding</option>
                      <option value="ACCIDENT">Accident</option>
                      <option value="DEBRIS">Debris</option>
                      <option value="POTHOLES">Potholes</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Mức độ rủi ro (riskLevel)</label>
                    <select
                      value={incidentRiskParam}
                      onChange={(e) => setIncidentRiskParam(e.target.value)}
                      className="p-2 border rounded-xl bg-slate-50 border-slate-200 text-xs font-bold text-slate-800 cursor-pointer outline-none"
                    >
                      <option value="ALL">Tất cả mức độ</option>
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-bold text-[10px] text-slate-400 uppercase">Trình chạy thử API Live</span>
                  <Button 
                    onClick={runIncidentsTest} 
                    disabled={loadingIncidents} 
                    className="h-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold border-0 text-[10px] px-4 flex items-center gap-1.5"
                  >
                    {loadingIncidents ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    <span>Chạy thử API</span>
                  </Button>
                </div>

                <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 font-mono text-[11px] leading-relaxed max-h-[300px] overflow-y-auto">
                  {loadingIncidents ? (
                    <span className="text-slate-400 animate-pulse">Đang kết xuất dữ liệu trực tiếp từ GoSafe database...</span>
                  ) : incidentsOutput ? (
                    <pre>{JSON.stringify(incidentsOutput, null, 2)}</pre>
                  ) : (
                    <span className="text-slate-500">Bấm nút "Chạy thử API" ở trên để kiểm tra kết quả thực tế.</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* POST /API/CAMERA/DETECTIONS */}
          {activeSection === "camera" && (
            <div className="flex flex-col gap-6">
              <div className="border-b pb-4 border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900">POST /api/camera/detections</h2>
                <p className="text-slate-500 mt-1">Truy vấn kết quả nhận diện camera OpenCV thời gian thực.</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-emerald-600 text-white font-bold rounded text-[9px] uppercase">POST</span>
                <code className="text-xs font-bold text-slate-800 font-mono">/api/camera/detections</code>
              </div>

              <p className="text-slate-600 font-semibold text-sm">
                Thực hiện phân tích hình ảnh và trả về dữ liệu độ sâu ngập (cm), phạm vi ảnh hưởng (m), và số lượng phương tiện mắc kẹt.
              </p>

              {/* API Runner Interactive Console */}
              <div className="border border-slate-200 rounded-3xl p-5 bg-slate-50 flex flex-col gap-3">
                {/* Parameters Selector Row */}
                <div className="flex flex-col gap-1.5 p-3.5 bg-white border border-slate-200 rounded-2xl">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Mã trạm Camera (cameraId)</label>
                  <select
                    value={cameraIdParam}
                    onChange={(e) => setCameraIdParam(e.target.value)}
                    className="p-2 border rounded-xl bg-slate-50 border-slate-200 text-xs font-bold text-slate-800 cursor-pointer outline-none w-full"
                  >
                    <option value="CAM_01">Camera #1 - Giao lộ Võ Trường Toản (CAM_01)</option>
                    <option value="CAM_02">Camera #2 - Cổng sau Đại học Quốc tế (CAM_02)</option>
                    <option value="CAM_03">Camera #3 - Đường chính VNU Khu A (CAM_03)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-bold text-[10px] text-slate-400 uppercase">Trình chạy thử API Live</span>
                  <Button 
                    onClick={runCameraTest} 
                    disabled={loadingCamera} 
                    className="h-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold border-0 text-[10px] px-4 flex items-center gap-1.5"
                  >
                    {loadingCamera ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    <span>Chạy thử API</span>
                  </Button>
                </div>

                <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 font-mono text-[11px] leading-relaxed max-h-[300px] overflow-y-auto">
                  {loadingCamera ? (
                    <span className="text-slate-400 animate-pulse">Đang truy vấn mô-đun Python OpenCV FastAPI...</span>
                  ) : cameraOutput ? (
                    <pre>{JSON.stringify(cameraOutput, null, 2)}</pre>
                  ) : (
                    <span className="text-slate-500">Bấm nút "Chạy thử API" ở trên để kiểm tra kết quả phân tích camera.</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* REALTIME WEBSOCKET SECTION */}
          {activeSection === "socket" && (
            <div className="flex flex-col gap-6">
              <div className="border-b pb-4 border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900">Real-Time Socket (WebSocket API)</h2>
                <p className="text-slate-500 mt-1">Lắng nghe thay đổi dữ liệu ngập nước trực tiếp qua WebSocket.</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-orange-600 text-white font-bold rounded text-[9px] uppercase">WSS</span>
                <code className="text-xs font-bold text-slate-800 font-mono">wss://gosafe.vn/ws/traffic</code>
              </div>

              <p className="text-slate-600 font-semibold text-sm">
                Sử dụng WebSockets để nhận luồng cập nhật trạng thái ngập thời gian thực mà không cần liên tục gửi request thăm dò (polling).
              </p>

              {/* WebSocket Simulation Console */}
              <div className="border border-slate-200 rounded-3xl p-5 bg-slate-50 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[10px] text-slate-400 uppercase">Live Socket Simulator</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                      isSocketConnected ? "bg-green-100 text-green-700 animate-pulse" : "bg-slate-200 text-slate-500"
                    }`}>
                      {isSocketConnected ? "Connected" : "Disconnected"}
                    </span>
                  </div>
                  <Button 
                    onClick={toggleSocketConnection} 
                    className={`h-8 rounded-xl font-bold text-[10px] px-4 border-0 ${
                      isSocketConnected ? "bg-red-600 hover:bg-red-700 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white"
                    }`}
                  >
                    {isSocketConnected ? "Ngắt kết nối" : "Kết nối Live Socket"}
                  </Button>
                </div>

                <div 
                  ref={logScrollRef}
                  className="bg-slate-950 text-emerald-400 rounded-2xl p-4 font-mono text-[10px] leading-relaxed h-[220px] overflow-y-auto flex flex-col gap-1 border border-slate-800"
                >
                  {socketLogs.length === 0 ? (
                    <span className="text-slate-500">Ấn nút "Kết nối Live Socket" ở trên để thiết lập cổng nghe sự kiện thời gian thực.</span>
                  ) : (
                    socketLogs.map((log, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-slate-500 shrink-0">[{log.time}]</span>
                        <span className={`shrink-0 ${
                          log.type === "INFO" ? "text-blue-400" : log.type === "ERR" ? "text-red-400" : "text-emerald-400"
                        }`}>
                          {log.type === "INFO" ? "[INFO]" : log.type === "ERR" ? "[ERR]" : "[RECV]"}
                        </span>
                        <span className="text-slate-200">{log.message}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* POST /API/VOUCHERS/EXCHANGE */}
          {activeSection === "vouchers" && (
            <div className="flex flex-col gap-6">
              <div className="border-b pb-4 border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900">POST /api/vouchers/exchange</h2>
                <p className="text-slate-500 mt-1">Đổi điểm thưởng tích lũy lấy mã voucher của các đối tác GoSafe.</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-emerald-600 text-white font-bold rounded text-[9px] uppercase">POST</span>
                <code className="text-xs font-bold text-slate-800 font-mono">/api/vouchers/exchange</code>
              </div>

              <p className="text-slate-600 font-semibold text-sm">
                Yêu cầu đổi voucher của tài khoản hiện tại, thực hiện trừ điểm tương ứng và trả về mã code đổi thưởng.
              </p>

              {/* API Runner Interactive Console */}
              <div className="border border-slate-200 rounded-3xl p-5 bg-slate-50 flex flex-col gap-3">
                {/* Parameters Selector Row */}
                <div className="flex flex-col gap-1.5 p-3.5 bg-white border border-slate-200 rounded-2xl">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Mã quà tặng (voucherId)</label>
                  <select
                    value={voucherIdParam}
                    onChange={(e) => setVoucherIdParam(e.target.value)}
                    className="p-2 border rounded-xl bg-slate-50 border-slate-200 text-xs font-bold text-slate-800 cursor-pointer outline-none w-full"
                  >
                    <option value="vch_01">Highlands Coffee 50k - 100 Điểm (vch_01)</option>
                    <option value="vch_02">Phúc Long Tea 30k - 60 Điểm (vch_02)</option>
                    <option value="vch_03">CGV Movie Ticket 100k - 200 Điểm (vch_03)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-bold text-[10px] text-slate-400 uppercase">Trình chạy thử API Live</span>
                  <Button 
                    onClick={runVoucherTest} 
                    disabled={loadingVoucher} 
                    className="h-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold border-0 text-[10px] px-4 flex items-center gap-1.5"
                  >
                    {loadingVoucher ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    <span>Chạy thử API</span>
                  </Button>
                </div>

                <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 font-mono text-[11px] leading-relaxed max-h-[300px] overflow-y-auto">
                  {loadingVoucher ? (
                    <span className="text-slate-400 animate-pulse">Đang gửi yêu cầu xác thực điểm giao dịch...</span>
                  ) : voucherOutput ? (
                    <pre>{JSON.stringify(voucherOutput, null, 2)}</pre>
                  ) : (
                    <span className="text-slate-500">Bấm nút "Chạy thử API" ở trên để mô phỏng tiến trình đổi điểm lấy Voucher.</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SDK & CODE SAMPLES */}
          {activeSection === "sdk" && (
            <div className="flex flex-col gap-6">
              <div className="border-b pb-4 border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900">SDK &amp; Mã lệnh tích hợp</h2>
                <p className="text-slate-500 mt-1">Ví dụ mã tích hợp hệ thống GoSafe vào ứng dụng của bạn.</p>
              </div>

              <h3 className="font-bold text-slate-900 text-sm">Kết nối WebSocket (Javascript)</h3>
              <div className="border border-slate-200 rounded-2xl overflow-hidden font-mono bg-slate-50 p-4 text-[11px] leading-relaxed">
<pre>{`const socket = new WebSocket("wss://gosafe.vn/ws/traffic");

socket.onopen = () => {
  console.log("Đã kết nối thành công tới GoSafe!");
};

socket.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log("Cập nhật giao thông thời gian thực:", update);
};`}</pre>
              </div>

              <h3 className="font-bold text-slate-900 text-sm mt-4">Gọi REST API bằng Python requests</h3>
              <div className="border border-slate-200 rounded-2xl overflow-hidden font-mono bg-slate-50 p-4 text-[11px] leading-relaxed">
<pre>{`import requests

url = "https://gosafe.vn/api/incidents"
headers = {
    "Authorization": "Bearer secret_gosafe_api_key_here"
}

response = requests.get(url, headers=headers)
if response.status_code == 200:
    for incident in response.json():
        print(f"Hazard in {incident['locationName']}: Depth: {incident.get('depthCm', 0)}cm")`}</pre>
              </div>
            </div>
          )}

        </main>
      </div>

      <Footer />
    </div>
  );
}
