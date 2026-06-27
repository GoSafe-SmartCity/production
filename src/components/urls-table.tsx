"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Copy, 
  ExternalLink, 
  QrCode, 
  Trash2, 
  Eye,
  BarChart3,
  Edit2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  ArrowUp,
  ArrowDown,
  Filter,
  ListFilter,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { QRCodeDisplay } from "./qr-code-display";
import { LinkAnalyticsDialog } from "./link-analytics-dialog";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface UrlUser {
  id: string;
  name: string | null;
  email: string | null;
  image?: string | null;
}

interface Url {
  id: string;
  shortCode: string;
  originalUrl: string;
  visitCount: number;
  createdAt: string;
  _count?: { visits: number };
  user?: UrlUser | null;
}

interface UrlsTableProps {
  refreshTrigger: number;
  delayLoad?: boolean;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type SortField = "shortCode" | "visitCount" | "createdAt" | null;
type SortDirection = "asc" | "desc";

export function UrlsTable({ refreshTrigger, delayLoad = false }: UrlsTableProps) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const [urls, setUrls] = useState<Url[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState<{ id: string; shortCode: string } | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [limit, setLimit] = useState(10);
  const [initialLoaded, setInitialLoaded] = useState(false);
  
  // All available users from API (for admin filter)
  const [allUsers, setAllUsers] = useState<{ id: string; name: string | null; email: string | null }[]>([]);
  
  // Filter & Sort states (these are sent to API for global filtering)
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [shortCodeSearch, setShortCodeSearch] = useState("");
  const [originalUrlSearch, setOriginalUrlSearch] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  // Build API URL with filter params
  const buildApiUrl = (pageNum: number, pageLimit: number) => {
    const params = new URLSearchParams();
    params.set("page", pageNum.toString());
    params.set("limit", pageLimit.toString());
    
    // Combine shortCode and originalUrl search
    const searchTerms = [shortCodeSearch.trim(), originalUrlSearch.trim()].filter(Boolean).join(" ");
    if (searchTerms) {
      params.set("search", searchTerms);
    }
    if (selectedUserIds.length > 0) {
      params.set("userIds", selectedUserIds.join(","));
    }
    if (sortField) {
      params.set("sortBy", sortField);
      params.set("sortDirection", sortDirection);
    }
    
    return `/api/urls?${params.toString()}`;
  };

  const fetchUrls = async (pageNum: number = page, pageLimit: number = limit) => {
    try {
      setIsLoading(true);
      const res = await fetch(buildApiUrl(pageNum, pageLimit));
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setUrls(data.urls || []);
      setPagination(data.pagination || null);
      if (data.users) {
        setAllUsers(data.users);
      }
      if (!initialLoaded) setInitialLoaded(true);
    } catch {
      toast.error("Không thể tải danh sách liên kết");
    } finally {
      setIsLoading(false);
    }
  };

  // Refetch when filters change
  useEffect(() => {
    if (initialLoaded) {
      setPage(1);
      fetchUrls(1, limit);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortField, sortDirection, selectedUserIds, shortCodeSearch, originalUrlSearch]);

  useEffect(() => {
    if (!delayLoad) {
      if (refreshTrigger > 0) {
        setPage(1);
        fetchUrls(1);
      } else {
        fetchUrls();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger, delayLoad]);

  const copyToClipboard = async (shortCode: string) => {
    const fullUrl = `${baseUrl}/${shortCode}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      toast.success("Đã sao chép liên kết!");
    } catch {
      toast.error("Không thể sao chép");
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    
    // Show loading toast
    const toastId = toast.loading("Đang xóa liên kết...");
    
    try {
      const res = await fetch(`/api/urls/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      
      toast.success("Đã xóa liên kết", { id: toastId });
      
      const remainingItems = urls.length - 1;
      
      if (remainingItems === 0 && page > 1) {
        const newPage = page - 1;
        setPage(newPage);
        fetchUrls(newPage);
      } else {
        fetchUrls(page);
      }
    } catch {
      toast.error("Không thể xóa liên kết", { id: toastId });
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = async (id: string) => {
    try {
      const res = await fetch(`/api/urls/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalUrl: editValue }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }
      
      toast.success("Đã cập nhật liên kết");
      setUrls((prev) =>
        prev.map((u) => (u.id === id ? { ...u, originalUrl: editValue } : u))
      );
      setEditingId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật");
    }
  };

  const openAnalytics = (url: Url) => {
    setSelectedUrl({ id: url.id, shortCode: url.shortCode });
    setAnalyticsOpen(true);
  };

  const truncateUrl = (url: string, maxLength: number = 50) => {
    return url.length > maxLength ? url.substring(0, maxLength) + "..." : url;
  };

  const truncateShortCode = (code: string, maxLength: number = 12) => {
    return code.length > maxLength ? code.substring(0, maxLength) + "..." : code;
  };

  // Clear all filters
  const clearFilters = () => {
    setSortField(null);
    setSortDirection("desc");
    setSelectedUserIds([]);
    setShortCodeSearch("");
    setOriginalUrlSearch("");
    setUserSearchQuery("");
  };

  // Toggle user selection for filter
  const toggleUserFilter = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // Check if any filter is active
  const hasActiveFilters = sortField !== null || selectedUserIds.length > 0 || shortCodeSearch.trim() !== "" || originalUrlSearch.trim() !== "";

  // Filter users by search query (for the user filter popover)
  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return allUsers;
    const query = userSearchQuery.toLowerCase();
    return allUsers.filter(
      (user) =>
        user.name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query)
    );
  }, [allUsers, userSearchQuery]);

  // ShortCode Filter Header Component
  const ShortCodeFilterHeader = () => {
    const isActive = sortField === "shortCode" || shortCodeSearch.trim() !== "";
    const [tempSearch, setTempSearch] = useState(shortCodeSearch);
    
    return (
      <TableHead className="text-center w-[220px]">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 gap-1.5 font-medium",
                isActive && "text-primary"
              )}
            >
              Liên kết rút gọn
              <ListFilter className={cn("h-3.5 w-3.5", isActive && "text-primary")} />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="center" className="w-56 p-2 rounded-xl">
            <div className="space-y-2">
              {/* Search */}
              <div>
                <p className="text-xs font-medium text-muted-foreground px-2 py-1">Tìm kiếm</p>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Nhập mã rút gọn..."
                    value={tempSearch}
                    onChange={(e) => setTempSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setShortCodeSearch(tempSearch);
                      }
                    }}
                    className="h-8 pl-8 rounded-lg text-sm"
                  />
                </div>
                <Button
                  variant="default"
                  size="sm"
                  className="w-full mt-1 rounded-lg"
                  onClick={() => setShortCodeSearch(tempSearch)}
                >
                  Áp dụng
                </Button>
              </div>
              
              <div className="border-t pt-2">
                <p className="text-xs font-medium text-muted-foreground px-2 py-1">Sắp xếp</p>
                <Button
                  variant={sortField === "shortCode" && sortDirection === "asc" ? "secondary" : "ghost"}
                  size="sm"
                  className="w-full justify-start rounded-lg"
                  onClick={() => {
                    setSortField("shortCode");
                    setSortDirection("asc");
                  }}
                >
                  <ArrowUp className="mr-2 h-3.5 w-3.5" />
                  A → Z
                </Button>
                <Button
                  variant={sortField === "shortCode" && sortDirection === "desc" ? "secondary" : "ghost"}
                  size="sm"
                  className="w-full justify-start rounded-lg"
                  onClick={() => {
                    setSortField("shortCode");
                    setSortDirection("desc");
                  }}
                >
                  <ArrowDown className="mr-2 h-3.5 w-3.5" />
                  Z → A
                </Button>
              </div>
              
              {isActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start rounded-lg text-muted-foreground border-t pt-2"
                  onClick={() => {
                    setSortField(null);
                    setShortCodeSearch("");
                    setTempSearch("");
                  }}
                >
                  <X className="mr-2 h-3.5 w-3.5" />
                  Xóa bộ lọc
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </TableHead>
    );
  };

  // OriginalUrl Filter Header Component
  const OriginalUrlFilterHeader = () => {
    const isActive = originalUrlSearch.trim() !== "";
    const [tempSearch, setTempSearch] = useState(originalUrlSearch);
    
    return (
      <TableHead className="text-center">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 gap-1.5 font-medium",
                isActive && "text-primary"
              )}
            >
              URL gốc
              <ListFilter className={cn("h-3.5 w-3.5", isActive && "text-primary")} />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="center" className="w-56 p-2 rounded-xl">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground px-2 py-1">Tìm kiếm</p>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Nhập URL..."
                  value={tempSearch}
                  onChange={(e) => setTempSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setOriginalUrlSearch(tempSearch);
                    }
                  }}
                  className="h-8 pl-8 rounded-lg text-sm"
                />
              </div>
              <Button
                variant="default"
                size="sm"
                className="w-full mt-1 rounded-lg"
                onClick={() => setOriginalUrlSearch(tempSearch)}
              >
                Áp dụng
              </Button>
              
              {isActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start rounded-lg text-muted-foreground border-t pt-2"
                  onClick={() => {
                    setOriginalUrlSearch("");
                    setTempSearch("");
                  }}
                >
                  <X className="mr-2 h-3.5 w-3.5" />
                  Xóa bộ lọc
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </TableHead>
    );
  };

  // Column Filter Header Component (for visitCount, createdAt)
  const ColumnFilterHeader = ({ 
    label, 
    field, 
    width,
    ascLabel,
    descLabel,
  }: { 
    label: string; 
    field: SortField; 
    width?: string;
    ascLabel: string;
    descLabel: string;
  }) => {
    const isActive = sortField === field;
    
    return (
      <TableHead className={cn("text-center", width)}>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 gap-1.5 font-medium",
                isActive && "text-primary"
              )}
            >
              {label}
              <ListFilter className={cn("h-3.5 w-3.5", isActive && "text-primary")} />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="center" className="w-48 p-2 rounded-xl">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground px-2 py-1">Sắp xếp</p>
              <Button
                variant={isActive && sortDirection === "asc" ? "secondary" : "ghost"}
                size="sm"
                className="w-full justify-start rounded-lg"
                onClick={() => {
                  setSortField(field);
                  setSortDirection("asc");
                }}
              >
                <ArrowUp className="mr-2 h-3.5 w-3.5" />
                {ascLabel}
              </Button>
              <Button
                variant={isActive && sortDirection === "desc" ? "secondary" : "ghost"}
                size="sm"
                className="w-full justify-start rounded-lg"
                onClick={() => {
                  setSortField(field);
                  setSortDirection("desc");
                }}
              >
                <ArrowDown className="mr-2 h-3.5 w-3.5" />
                {descLabel}
              </Button>
              {isActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start rounded-lg text-muted-foreground"
                  onClick={() => setSortField(null)}
                >
                  <X className="mr-2 h-3.5 w-3.5" />
                  Bỏ sắp xếp
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </TableHead>
    );
  };

  // User Filter Header Component 
  const UserFilterHeader = () => {
    const isActive = selectedUserIds.length > 0;
    const [localSearchQuery, setLocalSearchQuery] = useState("");
    const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedUserIds);
    const [isOpen, setIsOpen] = useState(false);
    
    // Local filtered users based on local search
    const localFilteredUsers = useMemo(() => {
      if (!localSearchQuery.trim()) return allUsers;
      const query = localSearchQuery.toLowerCase();
      return allUsers.filter(
        (user) =>
          user.name?.toLowerCase().includes(query) ||
          user.email?.toLowerCase().includes(query)
      );
    }, [allUsers, localSearchQuery]);

    // Toggle local user selection
    const toggleLocalUser = (userId: string) => {
      setLocalSelectedIds((prev) =>
        prev.includes(userId)
          ? prev.filter((id) => id !== userId)
          : [...prev, userId]
      );
    };

    // Check if there are changes to apply
    const hasChanges = JSON.stringify(localSelectedIds.sort()) !== JSON.stringify(selectedUserIds.sort());
    
    // Apply filter
    const applyFilter = () => {
      setSelectedUserIds(localSelectedIds);
      setIsOpen(false);
    };

    // Clear filter
    const clearFilter = () => {
      setLocalSelectedIds([]);
      setSelectedUserIds([]);
      setLocalSearchQuery("");
    };
    
    return (
      <TableHead className="text-center w-[150px]">
        <Popover open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (open) {
            // Sync local state with global state when opening
            setLocalSelectedIds(selectedUserIds);
          }
          if (!open) setLocalSearchQuery(""); // Reset search when closing
        }}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 gap-1.5 font-medium",
                isActive && "text-primary"
              )}
            >
              Người tạo
              {isActive ? (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs rounded-md">
                  {selectedUserIds.length}
                </Badge>
              ) : (
                <ListFilter className="h-3.5 w-3.5" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="center" className="w-64 p-2 rounded-xl" onOpenAutoFocus={(e) => e.preventDefault()}>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground px-2 py-1">Lọc theo người tạo</p>
              
              {/* Search input */}
              <div className="relative px-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo tên..."
                  value={localSearchQuery}
                  onChange={(e) => setLocalSearchQuery(e.target.value)}
                  className="h-8 pl-8 rounded-lg text-sm"
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>
              
              {allUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground px-2 py-2">Không có dữ liệu</p>
              ) : localFilteredUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground px-2 py-2">Không tìm thấy</p>
              ) : (
                <div className="max-h-[200px] overflow-y-auto space-y-1">
                  {localFilteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent cursor-pointer"
                      onClick={() => toggleLocalUser(user.id)}
                    >
                      <Checkbox
                        checked={localSelectedIds.includes(user.id)}
                        onCheckedChange={() => toggleLocalUser(user.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{user.name || user.email}</p>
                        {user.name && (
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Selected count */}
              {localSelectedIds.length > 0 && (
                <p className="text-xs text-muted-foreground px-2">
                  Đã chọn: {localSelectedIds.length} người dùng
                </p>
              )}
              
              {/* Action buttons */}
              <div className="flex gap-2 pt-1">
                {(localSelectedIds.length > 0 || isActive) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 rounded-lg text-muted-foreground"
                    onClick={clearFilter}
                  >
                    <X className="mr-1 h-3.5 w-3.5" />
                    Xóa
                  </Button>
                )}
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 rounded-lg"
                  onClick={applyFilter}
                  disabled={!hasChanges && !isActive}
                >
                  Áp dụng
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </TableHead>
    );
  };

  // Show skeleton only on initial load
  if (isLoading && !initialLoaded) {
    return (
      <div className="rounded-3xl border bg-background overflow-hidden">
        <Table className="border-collapse [&_th]:border-b [&_th]:border-r [&_th:last-child]:border-r-0 [&_td]:border-b [&_td]:border-r [&_td:last-child]:border-r-0 [&_tr:last-child_td]:border-b-0">
          <TableHeader>
            <TableRow className="bg-card hover:bg-transparent">
              <TableHead className="text-center w-[220px]"><Skeleton className="h-4 w-28 mx-auto" /></TableHead>
              <TableHead className="text-center"><Skeleton className="h-4 w-16 mx-auto" /></TableHead>
              <TableHead className="text-center w-[150px]"><Skeleton className="h-4 w-20 mx-auto" /></TableHead>
              <TableHead className="text-center w-[120px]"><Skeleton className="h-4 w-24 mx-auto" /></TableHead>
              <TableHead className="text-center w-[140px]"><Skeleton className="h-4 w-16 mx-auto" /></TableHead>
              <TableHead className="text-center w-[180px]"><Skeleton className="h-4 w-16 mx-auto" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell className="text-center">
                  <Skeleton className="h-7 w-20 rounded-xl mx-auto" />
                </TableCell>
                <TableCell className="text-center">
                  <Skeleton className="h-4 w-full max-w-[250px] mx-auto" />
                </TableCell>
                <TableCell className="text-center">
                  <Skeleton className="h-4 w-24 mx-auto" />
                </TableCell>
                <TableCell className="text-center">
                  <Skeleton className="h-7 w-16 rounded-xl mx-auto" />
                </TableCell>
                <TableCell className="text-center">
                  <Skeleton className="h-4 w-20 mx-auto" />
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center gap-1">
                    <Skeleton className="h-8 w-8 rounded-xl" />
                    <Skeleton className="h-8 w-8 rounded-xl" />
                    <Skeleton className="h-8 w-8 rounded-xl" />
                    <Skeleton className="h-8 w-8 rounded-xl" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (urls.length === 0 && !isLoading && !hasActiveFilters) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-muted flex items-center justify-center">
          <BarChart3 className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Chưa có liên kết nào</h3>
        <p className="text-muted-foreground">
          Tạo liên kết rút gọn đầu tiên của bạn ở trên!
        </p>
      </div>
    );
  }

  const handleLimitChange = (value: string) => {
    const newLimit = parseInt(value);
    setLimit(newLimit);
    setPage(1);
    fetchUrls(1, newLimit);
  };

  return (
    <>
      {/* Active Filters Bar */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 mb-3 px-1 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Bộ lọc:</span>
          {shortCodeSearch && (
            <Badge variant="secondary" className="rounded-lg gap-1">
              Mã: "{shortCodeSearch}"
              <button onClick={() => setShortCodeSearch("")} className="hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {originalUrlSearch && (
            <Badge variant="secondary" className="rounded-lg gap-1">
              URL: "{originalUrlSearch}"
              <button onClick={() => setOriginalUrlSearch("")} className="hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {sortField && (
            <Badge variant="secondary" className="rounded-lg gap-1">
              {sortField === "shortCode" ? "Mã rút gọn" : sortField === "visitCount" ? "Lượt truy cập" : "Ngày tạo"}
              {sortDirection === "asc" ? " ↑" : " ↓"}
              <button onClick={() => setSortField(null)} className="hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {selectedUserIds.length > 0 && (
            <Badge variant="secondary" className="rounded-lg gap-1">
              {selectedUserIds.length} người dùng
              <button onClick={() => setSelectedUserIds([])} className="hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
          >
            Xóa tất cả
          </Button>
        </div>
      )}

      <div className="rounded-3xl border bg-background overflow-x-auto relative">
        <Table className="border-collapse [&_th]:border-b [&_th]:border-r [&_th:last-child]:border-r-0 [&_td]:border-b [&_td]:border-r [&_td:last-child]:border-r-0 [&_tr:last-child_td]:border-b-0">
          <TableHeader>
            <TableRow className="bg-card hover:bg-transparent">
              <ShortCodeFilterHeader />
              <OriginalUrlFilterHeader />
              <UserFilterHeader />
              <ColumnFilterHeader label="Lượt truy cập" field="visitCount" width="w-[120px]" ascLabel="Ít nhất" descLabel="Nhiều nhất" />
              <ColumnFilterHeader label="Ngày tạo" field="createdAt" width="w-[140px]" ascLabel="Cũ nhất" descLabel="Mới nhất" />
              <TableHead className="text-center w-[180px]">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="relative">
            {/* Loading Overlay - only covers body */}
            {isLoading && initialLoaded && (
              <tr className="absolute inset-0 z-10">
                <td colSpan={6} className="h-full">
                  <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Đang tải...</span>
                    </div>
                  </div>
                </td>
              </tr>
            )}
            {urls.length === 0 && !isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Filter className="h-8 w-8" />
                    <p>Không tìm thấy liên kết phù hợp</p>
                    {hasActiveFilters && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={clearFilters}
                        className="text-primary"
                      >
                        Xóa bộ lọc
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              urls.map((url) => (
              <TableRow key={url.id} className="group">
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    {url.shortCode.length > 12 ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="secondary"
                            className="font-mono text-sm px-3 py-1 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer transition-colors"
                            onClick={() => copyToClipboard(url.shortCode)}
                          >
                            /{truncateShortCode(url.shortCode)}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-mono">/{url.shortCode}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="font-mono text-sm px-3 py-1 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer transition-colors"
                        onClick={() => copyToClipboard(url.shortCode)}
                      >
                        /{url.shortCode}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {editingId === url.id ? (
                    <div className="flex items-center justify-center gap-2">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-8 rounded-xl text-sm"
                        autoFocus
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-green-500 hover:text-green-600"
                        onClick={() => handleEdit(url.id)}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a
                          href={url.originalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 max-w-[300px] mx-auto"
                        >
                          <span className="truncate">{truncateUrl(url.originalUrl)}</span>
                          <ExternalLink className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-md">
                        <p className="break-all">{url.originalUrl}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {url.user ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-sm truncate max-w-[120px] cursor-default inline-block">
                          {url.user.name || url.user.email || "User"}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{url.user.name}</p>
                        <p className="text-xs text-muted-foreground">{url.user.email}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 rounded-xl hover:bg-primary/10 gap-1.5"
                        onClick={() => openAnalytics(url)}
                      >
                        <Eye className="w-3.5 h-3.5 text-primary" />
                        <span className="font-semibold">{url.visitCount.toLocaleString()}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Xem thống kê chi tiết</TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm text-center">
                  {(() => {
                    try {
                      const date = new Date(url.createdAt);
                      // Check for invalid date
                      if (isNaN(date.getTime())) {
                        throw new Error("Invalid date");
                      }
                      return formatDistanceToNow(date, {
                        addSuffix: true,
                        locale: vi,
                      }).replace(/^./, (c) => c.toUpperCase());
                    } catch {
                      return "Vừa xong";
                    }
                  })()}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    {/* Copy */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-xl"
                          onClick={() => copyToClipboard(url.shortCode)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Sao chép</TooltipContent>
                    </Tooltip>

                    {/* QR Code Dialog */}
                    <Dialog>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-xl"
                            >
                              <QrCode className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent>QR Code</TooltipContent>
                      </Tooltip>
                      <DialogContent className="flex overflow-auto h-[90vh] md:h-[calc(100vh-8rem)]  min-w-[calc(80vw)] flex-col gap-0 p-0 rounded-3xl overflow-hidden">
                        <DialogHeader className="px-5 py-4 border-b shrink-0">
                          <DialogTitle>Tùy chỉnh QR Code</DialogTitle>
                          <DialogDescription className="font-mono text-xs">
                            {baseUrl}/{url.shortCode}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex-1 overflow-hidden">
                          <QRCodeDisplay
                            url={`${baseUrl}/${url.shortCode}`}
                            shortCode={url.shortCode}
                          />
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Edit */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-xl"
                          onClick={() => {
                            setEditingId(url.id);
                            setEditValue(url.originalUrl);
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Chỉnh sửa</TooltipContent>
                    </Tooltip>

                    {/* Delete Dialog */}
                    <Dialog>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-xl text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent>Xóa</TooltipContent>
                      </Tooltip>
                      <DialogContent className="sm:max-w-md rounded-3xl">
                        <DialogHeader>
                          <DialogTitle>Xác nhận xóa</DialogTitle>
                          <DialogDescription>
                            Bạn có chắc chắn muốn xóa liên kết này? Hành động này không thể hoàn tác.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-2 space-x-2 sm:gap-0">
                          <DialogClose asChild>
                            <Button variant="outline" className="rounded-full">
                              Hủy
                            </Button>
                          </DialogClose>
                          <DialogClose asChild>
                            <Button
                              variant="destructive"
                              className="rounded-full"
                              onClick={() => handleDelete(url.id)}
                              disabled={deletingId === url.id}
                            >
                              {deletingId === url.id ? "Đang xóa..." : "Xóa"}
                            </Button>
                          </DialogClose>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </TableCell>
              </TableRow>
            )))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-2">
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Hiển thị {urls.length > 0 ? ((page - 1) * limit) + 1 : 0} - {Math.min(page * limit, pagination.total)} trong số {pagination.total} liên kết
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
                onClick={() => { setPage(1); fetchUrls(1); }}
                disabled={page === 1 || isLoading}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-xl"
                onClick={() => { setPage(p => p - 1); fetchUrls(page - 1); }}
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
                onClick={() => { setPage(p => p + 1); fetchUrls(page + 1); }}
                disabled={page === pagination.totalPages || isLoading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-xl"
                onClick={() => { setPage(pagination.totalPages); fetchUrls(pagination.totalPages); }}
                disabled={page === pagination.totalPages || isLoading}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Analytics Dialog */}
      {selectedUrl && (
        <LinkAnalyticsDialog
          open={analyticsOpen}
          onOpenChange={setAnalyticsOpen}
          urlId={selectedUrl.id}
          shortCode={selectedUrl.shortCode}
        />
      )}
    </>
  );
}
