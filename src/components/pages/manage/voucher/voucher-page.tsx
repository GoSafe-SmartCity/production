"use client";

import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "../shared/data-table";
import { voucherColumns, claimedVoucherColumns } from "../shared/columns";
import { VoucherForm } from "./voucher-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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
    const [exchanges, setExchanges] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExchangesLoading, setIsExchangesLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

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

    const fetchExchanges = useCallback(async () => {
        try {
            setIsExchangesLoading(true);
            const res = await fetch("/api/vouchers/exchange");
            if (res.ok) {
                const data = await res.json();
                setExchanges(data);
            }
        } catch (e) {
            console.error("Failed to fetch exchanges:", e);
            toast.error("Could not retrieve voucher exchanges.");
        } finally {
            setIsExchangesLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchVouchers();
        fetchExchanges();
    }, [fetchVouchers, fetchExchanges]);

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
                setIsDialogOpen(false);
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
        setIsDialogOpen(true);
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

    const handleMarkAsUsed = async (exchangeId: string) => {
        if (!confirm("Mark this voucher exchange as USED?")) return;
        try {
            const res = await fetch("/api/vouchers/exchange", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ exchangeId, status: "USED" }),
            });
            if (res.ok) {
                toast.success("Voucher exchange marked as USED.");
                fetchExchanges();
            } else {
                toast.error("Failed to update voucher status.");
            }
        } catch (e) {
            toast.error("Connection failed.");
        }
    };

    return (
        <div className="flex flex-col w-full">
            {/* Header */}
            <div className="px-8 pt-8 pb-4">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Voucher Catalog &amp; Claims Management</h1>
                <p className="text-sm text-slate-500 mt-1">Configure reward vouchers and process user claim redemptions.</p>
            </div>

            <div className="w-full h-px bg-slate-200" />

            <div className="px-8 py-6">
                <Tabs defaultValue="catalog" className="w-full">
                    <div className="flex items-center justify-between mb-6 flex-wrap gap-4 border-b border-slate-200 pb-1">
                        <TabsList className="bg-slate-100/80 p-1 rounded-xl">
                            <TabsTrigger value="catalog" className="px-4 py-2 text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-500 hover:text-slate-900 border-0">
                                Active Voucher Catalog
                            </TabsTrigger>
                            <TabsTrigger value="claims" className="px-4 py-2 text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-500 hover:text-slate-900 border-0">
                                Voucher Claims &amp; Management
                            </TabsTrigger>
                        </TabsList>
                        
                        <Button 
                            onClick={() => {
                                handleCancelEditVoucher();
                                setIsDialogOpen(true);
                            }}
                            className="h-9 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs flex items-center gap-1.5 border-0 shadow-sm"
                        >
                            <Plus className="w-4 h-4" /> Add Voucher
                        </Button>
                    </div>

                    <TabsContent value="catalog" className="mt-0">
                        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
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
                                        pageSize={5}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="claims" className="mt-0">
                        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                            <CardHeader className="border-b border-slate-100 px-6 py-5">
                                <CardTitle className="text-base font-bold text-slate-900">Claimed Vouchers &amp; Validity</CardTitle>
                                <CardDescription className="text-xs text-slate-500">View citizen exchange transactions and mark active codes as used.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-6">
                                {isExchangesLoading && exchanges.length === 0 ? (
                                    <p className="text-center text-slate-500 py-10 font-bold">Loading claims list...</p>
                                ) : (
                                    <DataTable
                                        columns={claimedVoucherColumns}
                                        data={exchanges}
                                        searchColumnId="id"
                                        searchPlaceholder="Search exchange ID..."
                                        metaCallbacks={{
                                            onMarkAsUsed: handleMarkAsUsed
                                        }}
                                        pageSize={5}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Add/Edit Dialog Modal */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-lg p-0 bg-transparent border-none shadow-none outline-none">
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
                        onCancelEdit={() => {
                            handleCancelEditVoucher();
                            setIsDialogOpen(false);
                        }}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
