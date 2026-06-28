import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET: Admins view users consent status logs, or regular users view their own info
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user?.role === "ADMIN") {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          consent: true,
          points: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(users);
    } else {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          consent: true,
          points: true,
          createdAt: true,
        },
      });
      return NextResponse.json(user ? [user] : []);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Logged in user updates privacy consent status
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { consent } = await req.json();

    if (consent === undefined) {
      return NextResponse.json({ error: "Missing consent flag" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { consent: !!consent },
    });

    return NextResponse.json({ success: true, consent: user.consent });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
