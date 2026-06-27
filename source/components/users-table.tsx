"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Link2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

interface UserData {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: "USER" | "ADMIN";
  createdAt: string;
  _count: { urls: number };
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function UsersTable() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [limit, setLimit] = useState(10);
  const [initialLoaded, setInitialLoaded] = useState(false);

  const fetchUsers = async (pageNum: number = page, pageLimit: number = limit) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/users?page=${pageNum}&limit=${pageLimit}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setUsers(data.users || []);
      setPagination(data.pagination || null);
      if (!initialLoaded) setInitialLoaded(true);
    } catch {
      toast.error("Không thể tải danh sách người dùng");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingId(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }
      
      toast.success("Đã cập nhật vai trò");
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole as "USER" | "ADMIN" } : u))
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật vai trò");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleLimitChange = (value: string) => {
    const newLimit = parseInt(value);
    setLimit(newLimit);
    setPage(1);
    fetchUsers(1, newLimit);
  };

  // Initial loading state - show skeleton
  if (isLoading && !initialLoaded) {
    return (
      <div className="rounded-3xl border bg-background overflow-hidden">
        <Table className="border-collapse [&_th]:border-b [&_th]:border-r [&_th:last-child]:border-r-0 [&_td]:border-b [&_td]:border-r [&_td:last-child]:border-r-0 [&_tr:last-child_td]:border-b-0">
          <TableHeader>
            <TableRow className="bg-card hover:bg-transparent">
              <TableHead className="w-[250px]"><Skeleton className="h-4 w-24" /></TableHead>
              <TableHead className="text-center w-[180px]"><Skeleton className="h-4 w-12 mx-auto" /></TableHead>
              <TableHead className="text-center w-[120px]"><Skeleton className="h-4 w-16 mx-auto" /></TableHead>
              <TableHead className="text-center w-[100px]"><Skeleton className="h-4 w-14 mx-auto" /></TableHead>
              <TableHead className="text-center w-[140px]"><Skeleton className="h-4 w-16 mx-auto" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <div className="flex justify-center">
                    <Skeleton className="h-4 w-36" />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex justify-center">
                    <Skeleton className="h-8 w-20 rounded-xl" />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex justify-center">
                    <Skeleton className="h-4 w-8" />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex justify-center">
                    <Skeleton className="h-4 w-20" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-muted flex items-center justify-center">
          <Link2 className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Chưa có người dùng nào</h3>
        <p className="text-muted-foreground">
          Người dùng sẽ xuất hiện ở đây khi họ đăng ký
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-3xl border bg-background overflow-x-auto relative">
        <Table className="border-collapse [&_th]:border-b [&_th]:border-r [&_th:last-child]:border-r-0 [&_td]:border-b [&_td]:border-r [&_td:last-child]:border-r-0 [&_tr:last-child_td]:border-b-0">
          <TableHeader>
            <TableRow className="bg-card hover:bg-transparent">
              <TableHead className="w-[250px]">Người dùng</TableHead>
              <TableHead className="text-center w-[180px]">Email</TableHead>
              <TableHead className="text-center w-[120px]">Vai trò</TableHead>
              <TableHead className="text-center w-[100px]">Số link</TableHead>
              <TableHead className="text-center w-[140px]">Ngày tạo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} className="group">
                <TableCell>
                  <span className="font-medium">{user.name || "—"}</span>
                </TableCell>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-sm text-muted-foreground truncate max-w-[160px] block">
                        {user.email || "—"}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{user.email}</p>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center">
                    <Select
                      value={user.role}
                      onValueChange={(value) => handleRoleChange(user.id, value)}
                      disabled={updatingId === user.id}
                    >
                      <SelectTrigger 
                        className={`w-[90px] h-8 rounded-xl ${
                          user.role === "ADMIN" 
                            ? "bg-primary/10 text-primary border-primary/30" 
                            : "bg-muted"
                        }`}
                      >
                        {updatingId === user.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <SelectValue />
                        )}
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="USER" className="rounded-lg">User</SelectItem>
                        <SelectItem value="ADMIN" className="rounded-lg">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1.5">
                    <Link2 className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{user._count.urls}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDistanceToNow(new Date(user.createdAt), {
                    addSuffix: true,
                    locale: vi,
                  }).replace(/^./, (c) => c.toUpperCase())}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {/* Loading Overlay */}
        {isLoading && initialLoaded && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center rounded-3xl z-10">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Đang tải...</span>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-2">
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Hiển thị {((page - 1) * limit) + 1} - {Math.min(page * limit, pagination.total)} trong số {pagination.total} người dùng
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Số dòng:</span>
              <Select value={limit.toString()} onValueChange={handleLimitChange}>
                <SelectTrigger className="w-[80px] h-8 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="10" className="rounded-lg">10</SelectItem>
                  <SelectItem value="20" className="rounded-lg">20</SelectItem>
                  <SelectItem value="50" className="rounded-lg">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {pagination.totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-xl"
                onClick={() => { setPage(1); fetchUsers(1); }}
                disabled={page === 1 || isLoading}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-xl"
                onClick={() => { setPage(p => p - 1); fetchUsers(page - 1); }}
                disabled={page === 1 || isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1 px-2">
                <span className="text-sm font-medium">{page}</span>
                <span className="text-sm text-muted-foreground">/</span>
                <span className="text-sm text-muted-foreground">{pagination.totalPages}</span>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-xl"
                onClick={() => { setPage(p => p + 1); fetchUsers(page + 1); }}
                disabled={page === pagination.totalPages || isLoading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-xl"
                onClick={() => { setPage(pagination.totalPages); fetchUsers(pagination.totalPages); }}
                disabled={page === pagination.totalPages || isLoading}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
