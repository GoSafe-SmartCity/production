"use client";

import React from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { ArrowUp, ArrowDown, ChevronsUpDown, SlidersHorizontal, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Columns definition for Citizen Reports
const reportHelper = createColumnHelper<any>();
export const reportColumns = [
    reportHelper.accessor('createdAt', {
        header: 'Timestamp',
        cell: info => <span className="text-slate-500">{new Date(info.getValue()).toLocaleString('vi-VN')}</span>
    }),
    reportHelper.accessor('category', {
        header: 'Incident Type',
        cell: info => <span className="font-bold uppercase text-slate-800">{info.getValue()}</span>
    }),
    reportHelper.accessor('description', {
        header: 'Detailed Description',
        cell: info => <p className="max-w-[220px] truncate text-slate-650 font-semibold" title={info.getValue()}>{info.getValue()}</p>
    }),
    reportHelper.accessor('latitude', {
        header: 'Coordinates',
        cell: ({ row }) => <span className="text-slate-500">{row.original.latitude.toFixed(5)}, {row.original.longitude.toFixed(5)}</span>
    }),
    reportHelper.accessor('reporter.name', {
        header: 'Reporter Name',
        cell: ({ row }) => (
            <div>
                <p className="font-bold text-slate-900">{row.original.reporter?.name || "Anonymous"}</p>
                <p className="text-[9px] text-slate-400 font-semibold mt-0.5 leading-none">{row.original.reporter?.email || ""}</p>
            </div>
        )
    }),
    reportHelper.accessor('status', {
        header: 'Status',
        cell: info => {
            const val = info.getValue();
            return (
                <span className={cn(
                    "px-2 py-0.5 rounded text-[8px] font-bold uppercase",
                    val === "APPROVED" ? "bg-green-50 text-green-700 border border-green-200" :
                    val === "PENDING" ? "bg-orange-50 text-orange-700 border border-orange-200" :
                    "bg-red-50 text-red-700 border border-red-200"
                )}>
                    {val}
                </span>
            );
        }
    }),
    reportHelper.display({
        id: 'actions',
        header: () => <span className="text-center block w-full">Actions</span>,
        cell: ({ row, table }) => (
            <div className="flex items-center justify-center gap-1.5 w-full">
                <Button variant="outline" size="sm" onClick={() => table.options.meta?.onViewDetail?.(row.original)} className="h-7 rounded-lg text-[9px] font-bold text-slate-755 border-slate-200 hover:bg-slate-50 bg-white">View</Button>
                {row.original.status === "PENDING" && (
                    <>
                        <Button variant="outline" size="sm" onClick={() => table.options.meta?.onReject?.(row.original.id)} className="h-7 rounded-lg text-[9px] font-bold text-red-650 border-red-250 hover:bg-red-50 bg-white">Reject</Button>
                        <Button size="sm" onClick={() => table.options.meta?.onApprove?.(row.original)} className="h-7 rounded-lg text-[9px] font-bold bg-primary hover:bg-primary/90 text-primary-foreground border-0">Approve</Button>
                    </>
                )}
                {row.original.status === "APPROVED" && (
                    <Button variant="outline" size="sm" onClick={() => table.options.meta?.onClear?.(row.original.id)} className="h-7 rounded-lg text-[9px] font-bold text-green-600 border-green-200 hover:bg-green-50 bg-white">Clear Block</Button>
                )}
            </div>
        )
    })
];

// Columns for Camera Telemetry Detections
const cameraDetectionHelper = createColumnHelper<any>();
export const cameraDetectionColumns = [
    cameraDetectionHelper.accessor('timestamp', {
        header: 'Timestamp',
        cell: info => <span className="text-slate-500">{new Date(info.getValue()).toLocaleString('vi-VN')}</span>
    }),
    cameraDetectionHelper.accessor('stationId', {
        header: 'Camera ID',
        cell: info => <span className="font-bold text-slate-900">{info.getValue()}</span>
    }),
    cameraDetectionHelper.accessor('station.name', {
        header: 'Station Name',
        cell: info => <span className="font-bold text-slate-800">{info.getValue() || "Camera Station"}</span>
    }),
    cameraDetectionHelper.accessor('waterDepthCm', {
        header: 'Water Depth',
        cell: info => <span className="font-bold text-primary">{info.getValue()} cm</span>
    }),
    cameraDetectionHelper.accessor('floodedAreaPct', {
        header: 'Flooded Area',
        cell: info => <span className="font-semibold text-slate-850">{info.getValue()}%</span>
    }),
    cameraDetectionHelper.accessor('severity', {
        header: 'Severity',
        cell: info => {
            const val = info.getValue();
            return (
                <span className={cn(
                    "px-2 py-0.5 rounded text-[8px] font-bold uppercase",
                    val === "HIGH" ? "bg-red-50 text-red-700 border border-red-200" :
                    val === "MEDIUM" ? "bg-orange-50 text-orange-700 border border-orange-200" :
                    "bg-blue-50 text-blue-700 border border-blue-200"
                )}>
                    {val}
                </span>
            );
        }
    }),
    cameraDetectionHelper.display({
        id: 'view_segment',
        header: () => <span className="text-center block w-full">CCTV Slider</span>,
        cell: ({ row, table }) => (
            <div className="flex justify-center w-full">
                <Button size="sm" onClick={() => table.options.meta?.onViewCameraDetection?.(row.original)} className="h-7 rounded-lg text-[9px] font-bold bg-slate-900 text-white hover:bg-slate-800 border-0 flex items-center gap-1">
                    <SlidersHorizontal className="w-3 h-3" /> Compare Frames
                </Button>
            </div>
        )
    })
];

// Columns for Weather Telemetry Logs
const weatherTelemetryHelper = createColumnHelper<any>();
export const weatherTelemetryColumns = [
    weatherTelemetryHelper.accessor('createdAt', {
        header: 'Timestamp',
        cell: info => <span className="text-slate-500">{new Date(info.getValue()).toLocaleString('vi-VN')}</span>
    }),
    weatherTelemetryHelper.accessor('latitude', {
        header: 'Coordinates',
        cell: ({ row }) => <span className="text-slate-550">{row.original.latitude.toFixed(5)}, {row.original.longitude.toFixed(5)}</span>
    }),
    weatherTelemetryHelper.accessor('temperature', {
        header: 'Temperature',
        cell: info => <span className="font-bold text-slate-900">{info.getValue().toFixed(1)}°C</span>
    }),
    weatherTelemetryHelper.accessor('rainfall', {
        header: 'Rainfall',
        cell: info => <span className="font-bold text-primary">{info.getValue().toFixed(1)} mm</span>
    }),
    weatherTelemetryHelper.accessor('windSpeed', {
        header: 'Wind Speed',
        cell: info => <span className="font-semibold text-slate-700">{info.getValue().toFixed(1)} m/s</span>
    }),
    weatherTelemetryHelper.accessor('pressure', {
        header: 'Pressure',
        cell: info => <span className="text-slate-500">{info.getValue()} hPa</span>
    }),
    weatherTelemetryHelper.accessor('description', {
        header: 'Description',
        cell: info => <span className="font-bold capitalize text-slate-800">{info.getValue()}</span>
    })
];

// Columns definition for Vouchers
const voucherHelper = createColumnHelper<any>();
export const voucherColumns = [
    voucherHelper.accessor('code', {
        header: 'Voucher Code',
        cell: info => <span className="font-bold text-primary text-xs uppercase">{info.getValue()}</span>
    }),
    voucherHelper.accessor('title', {
        header: 'Title',
        cell: info => <span className="font-bold text-slate-800">{info.getValue()}</span>
    }),
    voucherHelper.accessor('description', {
        header: 'Description',
        cell: info => <p className="max-w-[220px] truncate text-slate-500 font-semibold" title={info.getValue()}>{info.getValue()}</p>
    }),
    voucherHelper.accessor('pointsRequired', {
        header: 'Points Cost',
        cell: info => <span className="font-bold text-slate-900">{info.getValue()} pts</span>
    }),
    voucherHelper.accessor('quantity', {
        header: 'Quantity',
        cell: info => <span className="font-bold text-slate-900">{info.getValue()}</span>
    }),
    voucherHelper.display({
        id: 'actions',
        header: () => <span className="text-center block w-full">Actions</span>,
        cell: ({ row, table }) => (
            <div className="flex items-center justify-center gap-1.5 w-full">
                <Button variant="outline" size="sm" onClick={() => table.options.meta?.onEditVoucher?.(row.original)} className="h-7 rounded-lg text-[9px] font-bold text-blue-600 border-blue-200 hover:bg-blue-50 bg-white"><Edit2 className="w-2.5 h-2.5 mr-1" /> Edit</Button>
                <Button variant="outline" size="sm" onClick={() => table.options.meta?.onDeleteVoucher?.(row.original.id)} className="h-7 rounded-lg text-[9px] font-bold text-red-650 border-red-200 hover:bg-red-50 bg-white"><Trash2 className="w-2.5 h-2.5 mr-1" /> Delete</Button>
            </div>
        )
    })
];
// Columns definition for Claimed Vouchers (VoucherExchange)
const claimedVoucherHelper = createColumnHelper<any>();
export const claimedVoucherColumns = [
    claimedVoucherHelper.accessor('id', {
        header: 'Unique Voucher Hash',
        cell: info => {
            const id = info.getValue();
            return <span className="font-mono text-primary text-xs font-bold uppercase">{`GS-EX-${id.slice(-6).toUpperCase()}`}</span>;
        }
    }),
    claimedVoucherHelper.accessor('voucher.title', {
        header: 'Voucher Option',
        cell: info => <span className="font-bold text-slate-800">{info.getValue() || "Voucher"}</span>
    }),
    claimedVoucherHelper.accessor('user.name', {
        header: 'Claimed By',
        cell: ({ row }) => (
            <div>
                <p className="font-bold text-slate-900">{row.original.user?.name || "Anonymous"}</p>
                <p className="text-[9px] text-slate-400 font-semibold mt-0.5 leading-none">{row.original.user?.email || ""}</p>
            </div>
        )
    }),
    claimedVoucherHelper.accessor('exchangedAt', {
        header: 'Exchange Timestamp',
        cell: info => <span className="text-slate-550">{new Date(info.getValue()).toLocaleString('vi-VN')}</span>
    }),
    claimedVoucherHelper.accessor('status', {
        header: 'Status',
        cell: info => {
            const val = info.getValue();
            return (
                <span className={cn(
                    "px-2 py-0.5 rounded text-[8px] font-bold uppercase",
                    val === "ACTIVE" ? "bg-green-50 text-green-700 border border-green-200" : "bg-slate-100 text-slate-650 border border-slate-200"
                )}>
                    {val}
                </span>
            );
        }
    }),
    claimedVoucherHelper.display({
        id: 'timeLeft',
        header: 'Validity / Used Time Left',
        cell: ({ row }) => {
            const exchangedAt = row.original.exchangedAt;
            const status = row.original.status;
            if (status === "USED") {
                return <span className="text-slate-400 font-semibold">Used</span>;
            }
            const expiry = new Date(exchangedAt).getTime() + 30 * 24 * 60 * 60 * 1000;
            const diff = expiry - Date.now();
            if (diff <= 0) {
                return <span className="text-red-500 font-bold">Expired</span>;
            }
            const daysLeft = Math.floor(diff / (24 * 60 * 60 * 1000));
            const hoursLeft = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
            return (
                <span className="text-slate-650 font-semibold">
                    {daysLeft > 0 ? `${daysLeft}d ${hoursLeft}h left` : `${hoursLeft}h left`}
                </span>
            );
        }
    }),
    claimedVoucherHelper.display({
        id: 'actions',
        header: () => <span className="text-center block w-full">Actions</span>,
        cell: ({ row, table }) => (
            <div className="flex justify-center w-full">
                {row.original.status === "ACTIVE" && (
                    <Button 
                        size="sm" 
                        onClick={() => table.options.meta?.onMarkAsUsed?.(row.original.id)} 
                        className="h-7 rounded-lg text-[9px] font-bold bg-slate-900 text-white hover:bg-slate-800 border-0 cursor-pointer"
                    >
                        Mark as Used
                    </Button>
                )}
            </div>
        )
    })
];;
