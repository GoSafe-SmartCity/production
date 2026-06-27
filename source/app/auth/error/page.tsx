"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ShieldX, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/footer";
import { ErrorPageLayout } from "@/components/error-page-layout";
import { Suspense } from "react";

const errorMessages: Record<string, { title: string; description: string }> = {
  AccessDenied: {
    title: "Truy cập bị từ chối",
    description: "Chỉ tài khoản email @hcmute.edu.vn, @student.hcmute.edu.vn mới được phép đăng nhập vào hệ thống.",
  },
  Configuration: {
    title: "Lỗi cấu hình",
    description: "Có lỗi xảy ra với cấu hình máy chủ. Vui lòng liên hệ quản trị viên.",
  },
  Verification: {
    title: "Lỗi xác thực",
    description: "Liên kết xác thực đã hết hạn hoặc đã được sử dụng.",
  },
  Default: {
    title: "Đã xảy ra lỗi",
    description: "Có lỗi xảy ra trong quá trình xác thực. Vui lòng thử lại.",
  },
};

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") || "Default";
  const errorInfo = errorMessages[error] || errorMessages.Default;

  return (
    <ErrorPageLayout
      icon={<ShieldX className="w-12 h-12 text-destructive" />}
      iconClassName="bg-destructive/10"
      title={errorInfo.title}
      description={errorInfo.description}
      actions={
        <Button asChild variant="outline" className="rounded-full px-6">
          <Link href="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Về trang chủ
          </Link>
        </Button>
      }
      footer={<Footer animate animationDelay={0.4} />}
    />
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
        </div>
      }
    >
      <ErrorContent />
    </Suspense>
  );
}
