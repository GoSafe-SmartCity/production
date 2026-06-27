"use client";

import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast, Toaster } from "sonner";
import {
    BarChart3,
    Camera,
    Users,
    ShieldCheck,
    Award,
    LogOut,
    BookOpen,
    ExternalLink,
    Map
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ManageLayoutClientProps {
    session: any;
    children: React.ReactNode;
}

export function ManageLayoutClient({ session, children }: ManageLayoutClientProps) {
    const pathname = usePathname();
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        const fetchPendingCount = async () => {
            try {
                const res = await fetch("/api/incidents?mode=reports&status=PENDING");
                if (res.ok) {
                    const data = await res.json();
                    setPendingCount(data.length);
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchPendingCount();
    }, [pathname]); // Refetch pending count when pathname changes to keep it fresh

    const sidebarItems = [
        { href: "/manage/map", label: "Flood Hazard Map", icon: Map, badge: pendingCount },
        { href: "/manage/camera", label: "Manage Cameras", icon: Camera },
        { href: "/manage", label: "Analytics Dashboard", icon: BarChart3, exact: true },
        { href: "/manage/voucher", label: "Manage Vouchers", icon: Award },
        { href: "/manage/user", label: "Privacy Consent Logs", icon: ShieldCheck },
    ];

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex overflow-hidden font-sans w-full">
            <Toaster position="top-center" richColors />

            {/* Sidebar Navigation */}
            <aside className="fixed left-0 top-0 h-screen w-72 bg-white border-r border-slate-200 flex flex-col justify-between py-6 px-4 z-40 select-none">
                <div className="flex flex-col gap-6">
                    <Link href="/" className="flex items-center gap-3 px-3 py-1 group">
                        <img
                            src="/logo.png"
                            alt="GoSafe Logo"
                            className="h-10 w-10 object-contain group-hover:scale-105 transition-transform"
                        />
                        <span className="text-xl font-bold tracking-tight text-slate-900">
                            <span className="text-primary">Go</span>Safe
                        </span>
                    </Link>

                    <nav className="flex flex-col gap-1.5">
                        {sidebarItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = item.exact 
                                ? pathname === item.href 
                                : pathname.startsWith(item.href);
                                
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all border-0 w-full text-left no-underline",
                                        isActive
                                            ? "bg-primary text-primary-foreground border border-primary/20 shadow-md"
                                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 bg-transparent"
                                    )}
                                >
                                    <Icon className="w-4 h-4 shrink-0" />
                                    <span className="flex-1 text-sm">{item.label}</span>
                                    {item.badge !== undefined && item.badge > 0 && (
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-full text-[9px] font-bold",
                                            isActive
                                                ? "bg-primary-foreground text-primary"
                                                : "bg-red-100 text-red-700"
                                        )}>
                                            {item.badge}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}

                        <div className="h-px bg-slate-200 my-4" />
                        
                        <Link href="/wiki" className="flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 bg-transparent transition-all border-0 no-underline">
                            <BookOpen className="w-4 h-4 shrink-0 text-slate-400" />
                            <span className="flex-1 text-sm">API Documentation</span>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                        </Link>
                    </nav>
                </div>

                <div className="border-t border-slate-150 pt-4 px-2 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 ring-2 ring-slate-100">
                            <AvatarImage src={session?.user?.image || ""} />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                                {session?.user?.name?.charAt(0).toUpperCase() || "A"}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col truncate">
                            <span className="text-xs font-bold text-slate-900 leading-tight truncate">{session?.user?.name || "Admin User"}</span>
                            <span className="text-[10px] text-slate-500 truncate max-w-[150px] mt-0.5">{session?.user?.email}</span>
                            <span className="mt-1 px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[8px] font-bold w-fit uppercase">Administrator</span>
                        </div>
                    </div>
                    <Button
                        onClick={() => signOut()}
                        variant="ghost"
                        className="w-full h-10 rounded-2xl justify-start gap-3 text-xs font-bold text-red-650 hover:bg-red-50 hover:text-red-700 bg-transparent border-0 cursor-pointer"
                    >
                        <LogOut className="w-4 h-4 text-red-500" /> Sign Out
                    </Button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 ml-72 h-screen overflow-y-auto p-0 relative">
                {/* Header Background Gradient Overlay */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full filter blur-3xl z-0 pointer-events-none" />
                <div className="relative w-full flex flex-col">
                    {children}
                </div>
            </main>
        </div>
    );
}
