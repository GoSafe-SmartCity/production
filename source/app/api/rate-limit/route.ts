import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getRateLimitStatus, DAILY_LINK_LIMIT } from "@/lib/services/rate-limit.service";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const status = await getRateLimitStatus(user);

    return NextResponse.json({
      used: status.used,
      limit: status.isAdmin ? null : status.limit,
      remaining: status.isAdmin ? null : status.remaining,
      isAdmin: status.isAdmin,
      resetAt: status.resetAt.toISOString(),
      dailyLimit: DAILY_LINK_LIMIT,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 });
    }
    console.error("Error getting rate limit:", error);
    return NextResponse.json({ error: "Có lỗi xảy ra" }, { status: 500 });
  }
}
