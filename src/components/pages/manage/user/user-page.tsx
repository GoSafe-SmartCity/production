"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "../shared/data-table";
import { cn } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ColumnDef } from "@tanstack/react-table";

interface UserConsentRecord {
    id: string;
    name: string;
    email: string;
    consent: boolean;
    points: number;
    role: string;
}

export function UserPage() {
    const [adminUsers, setAdminUsers] = useState<UserConsentRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchAdminUsers = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await fetch("/api/users/consent");
            if (res.ok) {
                const data = await res.json();
                setAdminUsers(data);
            }
        } catch (e) {
            console.error("Failed to fetch consent logs:", e);
            toast.error("Failed to load user consent records.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAdminUsers();
    }, [fetchAdminUsers]);

    const handleRoleUpdate = async (userId: string, newRole: string) => {
        try {
            const res = await fetch(`/api/users/${userId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: newRole }),
            });
            if (res.ok) {
                toast.success("User role modified successfully!");
                fetchAdminUsers();
            } else {
                const errData = await res.json();
                toast.error(errData.error || "Role modification failed");
            }
        } catch (error) {
            toast.error("Network communication failure");
        }
    };

    const columns: ColumnDef<UserConsentRecord, any>[] = [
        {
            header: "Commuter Name",
            accessorKey: "name",
            cell: info => <span className="font-bold text-slate-900">{info.getValue() || "Anonymous"}</span>
        },
        {
            header: "Email Address",
            accessorKey: "email",
            cell: info => <span className="text-slate-500">{info.getValue()}</span>
        },
        {
            header: "GPS Tracking Authorized",
            accessorKey: "consent",
            cell: info => {
                const val = info.getValue();
                return (
                    <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase",
                        val ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
                    )}>
                        {val ? "AUTHORIZED" : "REVOKED"}
                    </span>
                );
            }
        },
        {
            header: "Wallet Credits",
            accessorKey: "points",
            cell: info => <span className="font-bold text-primary">{info.getValue()} pts</span>
        },
        {
            header: "Role Control",
            id: "actions",
            cell: ({ row }) => {
                const currentRole = row.original.role || "USER";
                const userId = row.original.id;
                return (
                    <Select
                        defaultValue={currentRole}
                        onValueChange={(newRole) => handleRoleUpdate(userId, newRole)}
                    >
                        <SelectTrigger className="w-[100px] h-8 rounded-xl bg-white border-slate-200 text-xs font-bold text-slate-850">
                            <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800">
                            <SelectItem value="USER">USER</SelectItem>
                            <SelectItem value="ADMIN">ADMIN</SelectItem>
                        </SelectContent>
                    </Select>
                );
            }
        }
    ];

    return (
        <div className="flex flex-col gap-6 px-8 py-8 w-full">
            <div>
                <h1 className="text-3xl font-black text-slate-900">Privacy Consents &amp; Wallet balances</h1>
                <p className="text-sm text-slate-500 mt-1">Audit active GPS telemetry authorizations and safety wallet balances.</p>
            </div>

            <div className="w-full h-px bg-slate-200" />

            {isLoading && adminUsers.length === 0 ? (
                <div className="text-center py-20 text-xs font-semibold text-slate-500 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-primary" /> Loading privacy logs...
                </div>
            ) : (
                <DataTable
                    columns={columns}
                    data={adminUsers}
                    searchColumnId="email"
                    searchPlaceholder="Search email..."
                    pageSize={10}
                />
            )}
        </div>
    );
}
