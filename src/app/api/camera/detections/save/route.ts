import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      stationId,
      timestamp,
      waterDepthCm,
      vehiclesCount,
      severity,
      rawFramePath,
      segmentPath,
      floodedAreaPct
    } = body;

    if (!stationId || waterDepthCm === undefined || vehiclesCount === undefined || !severity || !rawFramePath || !segmentPath || floodedAreaPct === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify station exists
    const station = await prisma.cameraStation.findUnique({
      where: { id: stationId }
    });

    if (!station) {
      return NextResponse.json({ error: `Camera station ${stationId} not found` }, { status: 404 });
    }

    const parsedDate = timestamp ? new Date(timestamp) : new Date();

    const detection = await prisma.cameraDetection.create({
      data: {
        stationId,
        timestamp: parsedDate,
        waterDepthCm: parseFloat(waterDepthCm),
        vehiclesCount: parseInt(vehiclesCount),
        severity,
        rawFramePath,
        segmentPath,
        floodedAreaPct: parseFloat(floodedAreaPct)
      }
    });

    return NextResponse.json({ success: true, detection });
  } catch (error: any) {
    console.error("Error saving camera detection: ", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
