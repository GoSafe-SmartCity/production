import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized. Admin access required" }, { status: 403 });
    }

    const { reportId, locationName } = await req.json();

    if (!reportId || !locationName) {
      return NextResponse.json({ error: "Missing reportId or locationName" }, { status: 400 });
    }

    // Get the report
    const report = await prisma.incidentReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    if (report.status !== "PENDING") {
      return NextResponse.json({ error: "Report is already processed" }, { status: 400 });
    }

    // Trigger local AI evaluation endpoint programmatically
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const aiResponse = await fetch(`${baseUrl}/api/incidents/ai-evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: report.category,
        latitude: report.latitude,
        longitude: report.longitude,
        description: report.description,
        confidence: report.confidence,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error("AI Evaluator failed to respond");
    }

    const aiResult = await aiResponse.json();

    // Auto-resolve streetCoords using Goong Directions API from start coordinate to end coordinate near the incident report point
    let streetCoordsStr = null;
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOONG_API_KEY || "2X3t5rZDLQiFHgLAdeGC8tkz2RZdTwfwMDtyFYSm";
      // Construct start/end nearby coords (e.g. 50 meters south-west to 50 meters north-east)
      const startLat = report.latitude - 0.0005;
      const startLng = report.longitude - 0.0005;
      const endLat = report.latitude + 0.0005;
      const endLng = report.longitude + 0.0005;
      
      const dirRes = await fetch(
        `https://rsapi.goong.io/direction?origin=${startLat},${startLng}&destination=${endLat},${endLng}&vehicle=car&api_key=${apiKey}`
      );
      if (dirRes.ok) {
        const dirData = await dirRes.json();
        const polyline = dirData.routes?.[0]?.overview_polyline?.points;
        if (polyline) {
          const decoded = decodePolyline(polyline);
          streetCoordsStr = JSON.stringify(decoded);
        }
      }
    } catch (e) {
      console.error("Failed to fetch Goong road segment directions during approval:", e);
    }

    // Create the Road Incident
    const incident = await prisma.roadIncident.create({
      data: {
        category: report.category,
        riskScore: aiResult.riskScore,
        riskLevel: aiResult.riskLevel,
        latitude: report.latitude,
        longitude: report.longitude,
        locationName,
        description: report.description,
        recommendation: aiResult.recommendation,
        status: "ACTIVE",
        startedAt: new Date(),
        streetCoords: streetCoordsStr,
        geom: streetCoordsStr,
      },
    });

    // Update Report status
    await prisma.incidentReport.update({
      where: { id: reportId },
      data: {
        status: "APPROVED",
        incidentId: incident.id,
      },
    });

    // Reward the user points (+10 points for approved report)
    if (report.reporterId) {
      await prisma.user.update({
        where: { id: report.reporterId },
        data: {
          points: { increment: 10 },
        },
      });
    }

    return NextResponse.json({ success: true, incident });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function decodePolyline(encoded: string) {
  if (!encoded) return [];
  let len = encoded.length;
  let index = 0;
  let lat = 0;
  let lng = 0;
  const points: [number, number][] = [];

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    points.push([lng / 1e5, lat / 1e5]);
  }
  return points;
}
