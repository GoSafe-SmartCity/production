import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    let dateFilter: any = {};
    if (startDateStr || endDateStr) {
      dateFilter = {
        createdAt: {
          ...(startDateStr && { gte: new Date(startDateStr) }),
          ...(endDateStr && { lte: new Date(endDateStr) }),
        }
      };
    }

    const history = await prisma.weatherTelemetry.findMany({
      where: dateFilter,
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(history);
  } catch (error: any) {
    console.error("Error fetching weather history: ", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
