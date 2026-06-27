"use client";

import { useState } from "react";
import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    getPaginationRowModel,
    ColumnDef,
    flexRender,
    SortingState,
    ColumnFiltersState,
    RowData
} from "@tanstack/react-table";
import { ArrowUp, ArrowDown, ChevronsUpDown, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Table meta typing extension
declare module '@tanstack/react-table' {
    interface TableMeta<TData extends RowData> {
        onApprove?: (report: any) => void;
        onReject?: (id: string) => void;
        onClear?: (id: string) => void;
        onEditIncident?: (incident: any) => void;
        onDeleteIncident?: (id: string) => void;
        onEditVoucher?: (voucher: any) => void;
        onDeleteVoucher?: (id: string) => void;
        onRoleUpdate?: () => void;
        onViewCameraDetection?: (detection: any) => void;
    }
}

// Reusable TanStack Table Component
interface DataTableProps<TData> {
    columns: ColumnDef<TData, any>[];
    data: TData[];
    searchPlaceholder?: string;
    searchColumnId?: string;
    metaCallbacks?: {
        onApprove?: (report: any) => void;
        onReject?: (id: string) => void;
        onClear?: (id: string) => void;
        onEditIncident?: (incident: any) => void;
        onDeleteIncident?: (id: string) => void;
        onEditVoucher?: (voucher: any) => void;
        onDeleteVoucher?: (id: string) => void;
        onRoleUpdate?: () => void;
        onViewCameraDetection?: (detection: any) => void;
    };
    pageSize?: number;
}

export function DataTable<TData>({
    columns,
    data,
    searchPlaceholder = "Search...",
    searchColumnId,
    metaCallbacks,
    pageSize = 5,
}: DataTableProps<TData>) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        state: {
            sorting,
            columnFilters,
        },
        initialState: {
            pagination: {
                pageSize: pageSize,
            }
        },
        meta: metaCallbacks
    });

    const handleExportCSV = () => {
        // Get column headers
        const headers = table.getVisibleFlatColumns()
            .filter(col => col.id !== "actions" && col.id !== "view_segment")
            .map(col => {
                if (typeof col.columnDef.header === 'string') {
                    return col.columnDef.header;
                }
                return col.id;
            });
        
        // Get rows data
        const rows = table.getRowModel().rows.map(row => {
            return table.getVisibleFlatColumns()
                .filter(col => col.id !== "actions" && col.id !== "view_segment")
                .map(col => {
                    const value = row.getValue(col.id);
                    if (value === null || value === undefined) return '';
                    if (value instanceof Date) return value.toLocaleString('vi-VN');
                    if (typeof value === 'object') return JSON.stringify(value);
                    return String(value).replace(/"/g, '""'); // escape quotes
                });
        });
        
        // Create CSV content with UTF-8 BOM
        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.map(val => `"${val}"`).join(','))
        ].join('\n');
        
        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `export_${searchColumnId || 'table'}_${Date.now()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                {searchColumnId ? (
                    <input
                        placeholder={searchPlaceholder}
                        value={(table.getColumn(searchColumnId)?.getFilterValue() as string) ?? ""}
                        onChange={(event) =>
                            table.getColumn(searchColumnId)?.setFilterValue(event.target.value)
                        }
                        className="max-w-sm p-3 border border-slate-200 rounded-2xl bg-white text-xs outline-none focus:border-primary text-slate-800 font-bold focus:ring-1 focus:ring-primary/20 flex-1"
                    />
                ) : (
                    <div />
                )}
                
                <Button
                    onClick={handleExportCSV}
                    variant="outline"
                    size="sm"
                    className="h-10 rounded-2xl border-slate-200 bg-white font-bold text-xs flex items-center gap-1.5 hover:bg-slate-50 text-slate-700"
                >
                    <Download className="w-3.5 h-3.5" />
                    Xuất file CSV
                </Button>
            </div>
            
            <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden relative">
                <div className="overflow-x-auto w-full">
                    <table className="w-full text-xs text-left border-collapse min-w-[700px]">
                        <thead>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <tr key={headerGroup.id} className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase">
                                    {headerGroup.headers.map((header) => {
                                        return (
                                            <th key={header.id} className={cn("p-4 font-bold select-none", header.column.getCanSort() && "cursor-pointer hover:text-slate-800")} onClick={header.column.getToggleSortingHandler()}>
                                                <div className="flex items-center gap-1.5">
                                                    {header.isPlaceholder
                                                        ? null
                                                        : flexRender(
                                                            header.column.columnDef.header,
                                                            header.getContext()
                                                        )}
                                                    {header.column.getCanSort() && (
                                                        <span className="ml-1 text-slate-400">
                                                            {{
                                                                asc: <ArrowUp className="w-3 h-3 inline-block" />,
                                                                desc: <ArrowDown className="w-3 h-3 inline-block" />,
                                                            }[header.column.getIsSorted() as string] ?? <ChevronsUpDown className="w-3 h-3 inline-block" />}
                                                        </span>
                                                    )}
                                                </div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            ))}
                        </thead>
                        <tbody>
                            {table.getRowModel().rows.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <tr
                                        key={row.id}
                                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 font-semibold text-slate-700"
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <td key={cell.id} className="p-4">
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan={columns.length}
                                        className="h-24 text-center text-slate-400 font-bold text-xs"
                                    >
                                        No matching logs found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between px-2 text-xs font-bold text-slate-500">
                <span>
                    Page {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}
                </span>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        className="h-8 rounded-xl bg-white border-slate-200"
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        className="h-8 rounded-xl bg-white border-slate-200"
                    >
                        Next
                    </Button>
                </div>
            </div>
        </div>
    );
}
