"use client";

import React, { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export function BroadcastForm() {
    const [broadcastTitle, setBroadcastTitle] = useState("");
    const [broadcastMessage, setBroadcastMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleBroadcastAlert = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!broadcastTitle || !broadcastMessage) {
            toast.error("Vui lòng điền thông tin thông báo");
            return;
        }

        try {
            setIsSubmitting(true);
            const res = await fetch("/api/notifications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "broadcast",
                    title: broadcastTitle,
                    message: broadcastMessage,
                }),
            });

            if (res.ok) {
                toast.success("Emergency notice broadcasted!");
                setBroadcastTitle("");
                setBroadcastMessage("");
            } else {
                toast.error("Broadcast failed");
            }
        } catch (e) {
            toast.error("Connection failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm text-xs">
            <CardHeader className="border-b border-slate-100 px-6 py-5">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-orange-650">
                    <Bell className="w-5 h-5" /> Broadcast Warning Dispatch
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">Distribute urgent safety advice to all active mobile commuters.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
                <form onSubmit={handleBroadcastAlert} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Warning Subject</label>
                        <input 
                            type="text" 
                            value={broadcastTitle} 
                            onChange={(e) => setBroadcastTitle(e.target.value)} 
                            placeholder="Warning: Imminent Vo Van Ngan Street flood" 
                            className="p-3 border rounded-2xl bg-slate-50 border-slate-200 text-xs font-bold text-slate-900 outline-none focus:border-primary transition-colors" 
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Commuter Instructions</label>
                        <textarea 
                            value={broadcastMessage} 
                            onChange={(e) => setBroadcastMessage(e.target.value)} 
                            placeholder="Please divert via Pham Van Dong highway..." 
                            className="p-3 border rounded-2xl bg-slate-50 border-slate-200 text-xs h-20 resize-none font-bold text-slate-900 outline-none focus:border-primary transition-colors" 
                        />
                    </div>
                    <Button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="h-10 rounded-2xl bg-slate-900 text-white font-bold border-0 text-xs shadow-md"
                    >
                        {isSubmitting ? "Broadcasting..." : "Dispatch Alert Now"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
