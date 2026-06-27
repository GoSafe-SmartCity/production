"use client";

import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { DataTable } from "../shared/data-table";
import { voucherColumns } from "../shared/columns";
import { VoucherForm } from "./voucher-form";
import { BroadcastForm } from "./broadcast-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Voucher {
    id: string;
    code: string;
    title: string;
    description: string;
    pointsRequired: number;
    quantity: number;
}

export function VoucherPage() {
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Form states
    const [voucherId, setVoucherId] = useState<string | null>(null);
    const [voucherCode, setVoucherCode] = useState("");
    const [voucherTitle, setVoucherTitle] = useState("");
    const [voucherDesc, setVoucherDesc] = useState("");
    const [voucherPoints, setVoucherPoints] = useState(100);
    const [voucherQty, setVoucherQty] = useState(50);

    const fetchVouchers = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await fetch("/api/vouchers");
            if (res.ok) {
                const data = await res.json();
                setVouchers(data);
            }
        } catch (e) {
            console.error("Failed to fetch vouchers:", e);
            toast.error("Could not retrieve vouchers.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchVouchers();
    }, [fetchVouchers]);

    // Add / Edit Voucher Submit Handlers
    const handleVoucherSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!voucherCode || !voucherTitle || !voucherDesc) {
            toast.error("Please specify voucher code, title and details");
            return;
        }

        const payload = {
            id: voucherId,
            code: voucherCode.toUpperCase(),
            title: voucherTitle,
            description: voucherDesc,
            pointsRequired: voucherPoints,
            quantity: voucherQty,
        };

        try {
            const method = voucherId ? "PUT" : "POST";
            const res = await fetch("/api/vouchers", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                toast.success(voucherId ? "Voucher updated!" : "Voucher registered successfully!");
                handleCancelEditVoucher();
                fetchVouchers();
            } else {
                toast.error(voucherId ? "Update request failed" : "Could not register voucher");
            }
        } catch (e) {
            toast.error("Connection failed");
        }
    };

    const handleOpenEditVoucher = (voucher: Voucher) => {
        setVoucherId(voucher.id);
        setVoucherCode(voucher.code);
        setVoucherTitle(voucher.title);
        setVoucherDesc(voucher.description);
        setVoucherPoints(voucher.pointsRequired);
        setVoucherQty(voucher.quantity);
    };

    const handleCancelEditVoucher = () => {
        setVoucherId(null);
        setVoucherCode("");
        setVoucherTitle("");
        setVoucherDesc("");
        setVoucherPoints(100);
        setVoucherQty(50);
    };

    const handleDeleteVoucher = async (id: string) => {
        if (!confirm("Remove this reward voucher?")) return;
        try {
            const res = await fetch(`/api/vouchers?id=${id}`, {
                method: "DELETE"
            });
            if (res.ok) {
                toast.success("Voucher deleted.");
                fetchVouchers();
            } else {
                toast.error("Delete request failed");
            }
        } catch (e) {
            toast.error("Connection failed");
        }
    };

    return (
        <div className="flex flex-col gap-8 px-8 py-8 w-full">
            <div>
                <h1 className="text-3xl font-black text-slate-900">Voucher Catalog &amp; Notice Broadcaster</h1>
                <p className="text-sm text-slate-500 mt-1">Configure user reward vouchers and dispatch citywide warnings.</p>
            </div>

            <div className="w-full h-px bg-slate-200" />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-xs items-start">
                <VoucherForm 
                    voucherId={voucherId}
                    voucherCode={voucherCode}
                    setVoucherCode={setVoucherCode}
                    voucherTitle={voucherTitle}
                    setVoucherTitle={setVoucherTitle}
                    voucherDesc={voucherDesc}
                    setVoucherDesc={setVoucherDesc}
                    voucherPoints={voucherPoints}
                    setVoucherPoints={setVoucherPoints}
                    voucherQty={voucherQty}
                    setVoucherQty={setVoucherQty}
                    onSubmit={handleVoucherSubmit}
                    onCancelEdit={handleCancelEditVoucher}
                />

                <div className="lg:col-span-2 flex flex-col gap-8">
                    <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <CardHeader className="border-b border-slate-100 px-6 py-5">
                            <CardTitle className="text-base font-bold text-slate-900">Active Voucher List</CardTitle>
                            <CardDescription className="text-xs text-slate-500">Reward catalog options currently available for claim.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            {isLoading && vouchers.length === 0 ? (
                                <p className="text-center text-slate-500 py-10 font-bold">Loading vouchers list...</p>
                            ) : (
                                <DataTable
                                    columns={voucherColumns}
                                    data={vouchers}
                                    searchColumnId="code"
                                    searchPlaceholder="Search voucher code..."
                                    metaCallbacks={{
                                        onEditVoucher: handleOpenEditVoucher,
                                        onDeleteVoucher: handleDeleteVoucher
                                    }}
                                    pageSize={3}
                                />
                            )}
                        </CardContent>
                    </Card>

                    <BroadcastForm />
                </div>
            </div>
        </div>
    );
}
