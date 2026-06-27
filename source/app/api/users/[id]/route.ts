import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    
    // Only admin can update users
    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
    }
    
    const { id } = await params;
    const body = await req.json();
    const { role } = body;
    
    // Validate role
    if (role && !["USER", "ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Vai trò không hợp lệ" }, { status: 400 });
    }
    
    // Prevent admin from removing their own admin role
    if (id === user.id && role === "USER") {
      return NextResponse.json({ error: "Không thể tự hạ cấp vai trò của mình" }, { status: 400 });
    }
    
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });
    
    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 });
    }
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Có lỗi xảy ra" }, { status: 500 });
  }
}
