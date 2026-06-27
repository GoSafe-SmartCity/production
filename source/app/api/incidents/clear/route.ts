import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { incidentId, status } = await req.json(); // status: "CLEARED" | "ACTIVE"

    if (!incidentId || !status) {
      return NextResponse.json({ error: "Missing incidentId or status" }, { status: 400 });
    }

    // Update the incident status
    const incident = await prisma.roadIncident.update({
      where: { id: incidentId },
      data: {
        status,
        ...(status === "CLEARED" && { endsAt: new Date() }),
      },
    });

    return NextResponse.json({ success: true, incident });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
