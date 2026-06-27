import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// POST: Exchange points for a voucher
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { voucherId } = await req.json();

    if (!voucherId) {
      return NextResponse.json({ error: "Missing voucherId" }, { status: 400 });
    }

    // Get user and voucher
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    const voucher = await prisma.voucher.findUnique({
      where: { id: voucherId },
    });

    if (!user || !voucher) {
      return NextResponse.json({ error: "User or Voucher not found" }, { status: 404 });
    }

    if (voucher.quantity <= 0) {
      return NextResponse.json({ error: "Voucher out of stock" }, { status: 400 });
    }

    if (user.points < voucher.pointsRequired) {
      return NextResponse.json({ error: "Insufficient points" }, { status: 400 });
    }

    // Execute in a transaction: decrement points, decrement voucher qty, create exchange log
    const exchange = await prisma.$transaction(async (tx) => {
      // Decrement user points
      await tx.user.update({
        where: { id: user.id },
        data: { points: { decrement: voucher.pointsRequired } },
      });

      // Decrement voucher quantity
      await tx.voucher.update({
        where: { id: voucher.id },
        data: { quantity: { decrement: 1 } },
      });

      // Create exchange history log
      return tx.voucherExchange.create({
        data: {
          userId: user.id,
          voucherId: voucher.id,
          status: "ACTIVE",
        },
        include: {
          voucher: true,
        },
      });
    });

    return NextResponse.json({ success: true, exchange });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET: List exchange transactions
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admins see all exchanges, Users see only theirs
    const isAdmin = session.user.role === "ADMIN";

    const exchanges = await prisma.voucherExchange.findMany({
      where: isAdmin ? {} : { userId: session.user.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        voucher: true,
      },
      orderBy: { exchangedAt: "desc" },
    });

    return NextResponse.json(exchanges);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
