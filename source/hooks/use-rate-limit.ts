"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

interface RateLimitStatus {
  used: number;
  limit: number | null;
  remaining: number | null;
  isAdmin: boolean;
  resetAt: string;
  dailyLimit: number;
}

export function useRateLimit() {
  const { data: session } = useSession();
  const [status, setStatus] = useState<RateLimitStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRateLimit = useCallback(async () => {
    if (!session) {
      setStatus(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/rate-limit");
      if (!res.ok) {
        throw new Error("Failed to fetch rate limit");
      }
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchRateLimit();
  }, [fetchRateLimit]);

  return {
    status,
    isLoading,
    error,
    refetch: fetchRateLimit,
    isLimitReached: status && !status.isAdmin && status.remaining === 0,
    isAdmin: status?.isAdmin ?? false,
  };
}
