"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface LocalStorageLink {
  id: string;
  user_id: string | null;
  short_code: string;
  original_url: string;
  click_count: number;
  last_clicked_at: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

interface LinkStorageState {
  state: {
    links: LocalStorageLink[];
    isLoading: boolean;
  };
  version: number;
}

const LOCAL_STORAGE_KEY = "link-storage";
const MIGRATION_DONE_KEY = "link-migration-done";

export function useLocalStorageMigration(onMigrationComplete?: () => void) {
  const { data: session, status } = useSession();
  const hasMigrated = useRef(false);

  useEffect(() => {
    // Check if feature is enabled
    if (process.env.NEXT_PUBLIC_ENABLE_LOCAL_STORAGE_MIGRATION !== "true") {
      return;
    }

    // Wait for session to be loaded
    if (status !== "authenticated" || !session?.user?.id) {
      return;
    }

    // Prevent multiple migrations
    if (hasMigrated.current) {
      return;
    }

    // Check if already migrated
    const migrationDone = localStorage.getItem(MIGRATION_DONE_KEY);
    if (migrationDone === session.user.id) {
      return;
    }

    const migrateLinks = async () => {
      try {
        // Get links from localStorage
        const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!storedData) {
          // Mark as done even if no data
          localStorage.setItem(MIGRATION_DONE_KEY, session.user!.id!);
          return;
        }

        const parsedData: LinkStorageState = JSON.parse(storedData);
        const links = parsedData?.state?.links;

        if (!links || links.length === 0) {
          localStorage.setItem(MIGRATION_DONE_KEY, session.user!.id!);
          return;
        }

        // Prepare links for claiming
        const linksToClAim = links.map((link) => ({
          shortCode: link.short_code,
          originalUrl: link.original_url,
        }));

        // Call API to claim links
        const response = await fetch("/api/urls/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ links: linksToClAim }),
        });

        const result = await response.json();

        if (response.ok && result.claimed?.length > 0) {
          toast.success(`Đã tự động nhận ${result.claimed.length} liên kết của bạn!`, {
            description: "Các liên kết từ phiên trước đã được liên kết với tài khoản của bạn.",
            duration: 5000,
          });

          // Remove claimed links from localStorage
          const remainingLinks = links.filter(
            (link) => !result.claimed.includes(link.short_code)
          );

          if (remainingLinks.length > 0) {
            localStorage.setItem(
              LOCAL_STORAGE_KEY,
              JSON.stringify({
                ...parsedData,
                state: {
                  ...parsedData.state,
                  links: remainingLinks,
                },
              })
            );
          } else {
            // Clear localStorage if all links were claimed
            localStorage.removeItem(LOCAL_STORAGE_KEY);
          }

          // Trigger refresh
          onMigrationComplete?.();
        }

        // Mark migration as done for this user
        hasMigrated.current = true;
        localStorage.setItem(MIGRATION_DONE_KEY, session.user!.id!);
      } catch (error) {
        console.error("Error migrating links from localStorage:", error);
        // Ensure we don't crash and mark as done to prevent infinite loops
        try {
           if (session?.user?.id) {
             localStorage.setItem(MIGRATION_DONE_KEY, session.user.id);
           }
        } catch {}
      }
    };

    // Run migration with a small delay to not block initial render
    const timeoutId = setTimeout(migrateLinks, 1000);

    return () => clearTimeout(timeoutId);
  }, [session, status, onMigrationComplete]);
}
