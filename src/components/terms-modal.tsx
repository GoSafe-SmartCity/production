"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldCheck, BookOpen, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

const TERMS_ACCEPTED_KEY = "gosafe-terms-accepted";

export function TermsModal() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [hasRead, setHasRead] = useState(false);

  useEffect(() => {
    // Only show for logged-in non-admin users
    if (!session?.user) return;
    if (session.user.role === "ADMIN") return;

    // Check if user has already accepted terms
    try {
      const accepted = localStorage.getItem(TERMS_ACCEPTED_KEY);
      if (!accepted) {
        // Small delay for better UX after page load
        const timer = setTimeout(() => setOpen(true), 500);
        return () => clearTimeout(timer);
      }
    } catch {
      const timer = setTimeout(() => setOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, [session]);

  const handleAccept = () => {
    try {
      localStorage.setItem(TERMS_ACCEPTED_KEY, "true");
    } catch {
      // Ignore write errors
    }
    setOpen(false);
  };

  // Don't render anything for admin or non-logged in users
  if (!session?.user || session.user.role === "ADMIN") {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-lg rounded-3xl p-0 overflow-hidden [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 pb-4">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-2xl bg-primary/10">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
              <DialogTitle className="text-xl font-semibold">
                Điều khoản sử dụng GoSafe
              </DialogTitle>
            </div>
            <DialogDescription className="text-muted-foreground">
              Vui lòng đọc và đồng ý với các điều khoản trước khi sử dụng hệ thống
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Terms content */}
        <ScrollArea className="max-h-[50vh] px-6">
          <div className="space-y-4 py-4">
            {/* Rule 1 */}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex gap-4 p-4 rounded-2xl bg-gradient-to-r from-green-500/5 to-emerald-500/5 border border-green-500/20"
            >
              <div className="p-2 rounded-xl bg-green-500/10 h-fit">
                <ShieldCheck className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-green-700 dark:text-green-400">Tuân thủ an toàn</h4>
                <p className="text-sm text-muted-foreground">
                  Tuân thủ luật lệ an toàn giao thông đường bộ và các chỉ dẫn từ chính quyền địa phương.
                </p>
              </div>
            </motion.div>

            {/* Rule 2 */}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex gap-4 p-4 rounded-2xl bg-gradient-to-r from-green-500/5 to-emerald-500/5 border border-green-500/20"
            >
              <div className="p-2 rounded-xl bg-green-500/10 h-fit">
                <AlertTriangle className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-green-700 dark:text-green-400">Báo cáo trung thực</h4>
                <p className="text-sm text-muted-foreground">
                  Chỉ báo cáo các điểm ngập nước, tai nạn hoặc sự cố giao thông thực tế. Không đưa tin giả.
                </p>
              </div>
            </motion.div>

            {/* Rule 3 */}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flex gap-4 p-4 rounded-2xl bg-gradient-to-r from-green-500/5 to-emerald-500/5 border border-green-500/20"
            >
              <div className="p-2 rounded-xl bg-green-500/10 h-fit">
                <BookOpen className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-green-700 dark:text-green-400">Quyền riêng tư vị trí</h4>
                <p className="text-sm text-muted-foreground">
                  Đồng ý chia sẻ dữ liệu vị trí ẩn danh nhằm tối ưu hóa tính toán lộ trình di chuyển tránh ngập.
                </p>
              </div>
            </motion.div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <DialogFooter className="p-6 pt-4 border-t border-border/50 bg-muted/20">
          <div className="w-full space-y-4">
            {/* Checkbox */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <Checkbox
                id="terms-read"
                checked={hasRead}
                onCheckedChange={(checked) => setHasRead(checked === true)}
                className="rounded-md data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                Tôi đã đọc và đồng ý với các điều khoản
              </span>
            </label>

            {/* Accept button */}
            <Button
              onClick={handleAccept}
              disabled={!hasRead}
              className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Đồng ý và tiếp tục
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
