import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET: Returns list of camera stations, optionally with detections filtered by date range
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    const cameraId = searchParams.get("cameraId");

    let dateFilter: any = {};
    if (startDateStr || endDateStr) {
      dateFilter = {
        timestamp: {
          ...(startDateStr && { gte: new Date(startDateStr) }),
          ...(endDateStr && { lte: new Date(endDateStr) }),
        }
      };
    }

    if (cameraId) {
      const station = await prisma.cameraStation.findUnique({
        where: { id: cameraId },
        include: {
          detections: {
            where: dateFilter,
            orderBy: { timestamp: "desc" }
          }
        }
      });
      return NextResponse.json(station);
    }

    // Return all stations with their detections
    const stations = await prisma.cameraStation.findMany({
      include: {
        detections: {
          where: dateFilter,
          orderBy: { timestamp: "desc" }
        }
      }
    });

    return NextResponse.json(stations);
  } catch (error: any) {
    console.error("Error in camera GET: ", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Trigger detection on a camera (or proxy to FastAPI)
export async function POST(req: NextRequest) {
  try {
    const { cameraId } = await req.json();
    if (!cameraId) {
      return NextResponse.json({ error: "Missing cameraId" }, { status: 400 });
    }

    // Attempt to fetch latest detection from DB first
    const latestDetection = await prisma.cameraDetection.findFirst({
      where: { stationId: cameraId },
      orderBy: { timestamp: "desc" }
    });

    if (latestDetection) {
      const station = await prisma.cameraStation.findUnique({
        where: { id: cameraId }
      });

      return NextResponse.json({
        cameraId,
        name: station?.name || `Camera ${cameraId}`,
        latitude: station?.latitude || 10.8782,
        longitude: station?.longitude || 106.8008,
        depthCm: latestDetection.waterDepthCm,
        distanceM: 100, // simulated
        vehiclesDetected: latestDetection.vehiclesCount,
        severity: latestDetection.severity,
        reason: `Lượng nước ngập chiếm ${latestDetection.floodedAreaPct}% tiết diện đường mặt.`,
        image: latestDetection.segmentPath // Segmented overlay
      });
    }

    // Fallback data aligned with Goong API reverse geocoding results
    const fallbacks: Record<string, any> = {
      "CAM_01": {
        name: "Đ. William Shakespeare / Marie Curie",
        latitude: 10.8791999,
        longitude: 106.7991941,
        depthCm: 45,
        distanceM: 150,
        vehiclesDetected: 4,
        severity: "HIGH",
        reason: "Mưa lớn kéo dài và hệ thống thoát nước quá tải.",
        image: "/detections/cam1_segment_day_3.jpg"
      },
      "CAM_02": {
        name: "Đường Marie Curie, Đông Hoà",
        latitude: 10.8789166,
        longitude: 106.8004081,
        depthCm: 25,
        distanceM: 80,
        vehiclesDetected: 2,
        severity: "MEDIUM",
        reason: "Mức ngập trung bình ở rìa đường đi bộ.",
        image: "/detections/cam2_segment_day_4.jpg"
      },
      "CAM_03": {
        name: "Khu thực hành CNSH, Đông Hoà",
        latitude: 10.8783257,
        longitude: 106.8013148,
        depthCm: 10,
        distanceM: 30,
        vehiclesDetected: 1,
        severity: "LOW",
        reason: "Đọng nước cục bộ ở hố ga.",
        image: "/detections/cam3_segment_day_6.jpg"
      }
    };

    const data = fallbacks[cameraId] || {
      name: `Camera ${cameraId} - Khu vực VNU`,
      latitude: 10.8782,
      longitude: 106.8008,
      depthCm: 35,
      distanceM: 100,
      vehiclesDetected: 3,
      severity: "MEDIUM",
      reason: "Ngập úng đường phụ quanh trường.",
      image: "/detections/cam1_segment_day_0.jpg"
    };

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
