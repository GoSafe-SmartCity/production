"use client";

import React from "react";
import { Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface VoucherFormProps {
    voucherId: string | null;
    voucherCode: string;
    setVoucherCode: (val: string) => void;
    voucherTitle: string;
    setVoucherTitle: (val: string) => void;
    voucherDesc: string;
    setVoucherDesc: (val: string) => void;
    voucherPoints: number;
    setVoucherPoints: (val: number) => void;
    voucherQty: number;
    setVoucherQty: (val: number) => void;
    onSubmit: (e: React.FormEvent) => void;
    onCancelEdit: () => void;
}

export function VoucherForm({
    voucherId,
    voucherCode,
    setVoucherCode,
    voucherTitle,
    setVoucherTitle,
    voucherDesc,
    setVoucherDesc,
    voucherPoints,
    setVoucherPoints,
    voucherQty,
    setVoucherQty,
    onSubmit,
    onCancelEdit
}: VoucherFormProps) {
    return (
        <form onSubmit={onSubmit} className="flex flex-col gap-4 text-xs font-sans">
            <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Voucher Code</label>
                <input 
                    type="text" 
                    value={voucherCode} 
                    onChange={(e) => setVoucherCode(e.target.value)} 
                    placeholder="e.g. VCH-COF8A9" 
                    className="p-3 border rounded-2xl bg-slate-50 border-slate-200 text-xs font-bold uppercase text-slate-900 outline-none focus:border-primary transition-colors" 
                />
            </div>
            <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Voucher Title</label>
                <input 
                    type="text" 
                    value={voucherTitle} 
                    onChange={(e) => setVoucherTitle(e.target.value)} 
                    placeholder="GrabBike 50k Refill Discount" 
                    className="p-3 border rounded-2xl bg-slate-50 border-slate-200 text-xs font-bold text-slate-900 outline-none focus:border-primary transition-colors" 
                />
            </div>
            <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Rules &amp; Guidelines</label>
                <textarea 
                    value={voucherDesc} 
                    onChange={(e) => setVoucherDesc(e.target.value)} 
                    placeholder="Redeemable within Thu Duc City boundaries..." 
                    className="p-3 border rounded-2xl bg-slate-50 border-slate-200 text-xs h-16 resize-none font-bold text-slate-900 outline-none focus:border-primary transition-colors" 
                />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Points Cost</label>
                    <input 
                        type="number" 
                        value={voucherPoints} 
                        onChange={(e) => setVoucherPoints(parseInt(e.target.value) || 0)} 
                        placeholder="Points" 
                        className="p-3 border rounded-2xl bg-slate-50 border-slate-200 text-xs font-bold text-slate-900 outline-none focus:border-primary transition-colors" 
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Stock Count</label>
                    <input 
                        type="number" 
                        value={voucherQty} 
                        onChange={(e) => setVoucherQty(parseInt(e.target.value) || 0)} 
                        placeholder="Quantity" 
                        className="p-3 border rounded-2xl bg-slate-50 border-slate-200 text-xs font-bold text-slate-900 outline-none focus:border-primary transition-colors" 
                    />
                </div>
            </div>
            <div className="flex gap-2 mt-2">
                {voucherId && (
                    <Button 
                        type="button" 
                        onClick={onCancelEdit} 
                        variant="outline" 
                        className="flex-1 h-10 rounded-2xl border-slate-200 text-slate-700 font-bold bg-white text-xs cursor-pointer"
                    >
                        Cancel
                    </Button>
                )}
                <Button 
                    type="submit" 
                    className="flex-1 h-10 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold border-0 text-xs cursor-pointer"
                >
                    {voucherId ? "Save Changes" : "Create Voucher"}
                </Button>
            </div>
        </form>
    );
}
