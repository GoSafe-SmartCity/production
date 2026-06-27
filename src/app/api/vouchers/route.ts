import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET: Retrieve all vouchers
export async function GET(req: NextRequest) {
  try {
    const vouchers = await prisma.voucher.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(vouchers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create a voucher (Admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized. Admin required" }, { status: 403 });
    }

    const { code, title, description, pointsRequired, quantity } = await req.json();

    if (!code || !title || !description || pointsRequired === undefined || quantity === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const points = parseInt(pointsRequired);
    const qty = parseInt(quantity);

    if (isNaN(points) || isNaN(qty)) {
      return NextResponse.json({ error: "Invalid points or quantity" }, { status: 400 });
    }

    const voucher = await prisma.voucher.create({
      data: {
        code: code.toUpperCase(),
        title,
        description,
        pointsRequired: points,
        quantity: qty,
      },
    });

    return NextResponse.json({ success: true, voucher });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Update a voucher (Admin only)
export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id, code, title, description, pointsRequired, quantity } = await req.json();

    if (!id || !code || !title || !description || pointsRequired === undefined || quantity === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const points = parseInt(pointsRequired);
    const qty = parseInt(quantity);

    const voucher = await prisma.voucher.update({
      where: { id },
      data: {
        code: code.toUpperCase(),
        title,
        description,
        pointsRequired: points,
        quantity: qty,
      },
    });

    return NextResponse.json({ success: true, voucher });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Remove a voucher (Admin only)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing voucher ID" }, { status: 400 });
    }

    await prisma.voucher.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
