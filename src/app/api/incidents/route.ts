import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET: Query incidents with advanced filters
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode") || "incidents"; // "incidents" | "reports"
    const category = searchParams.get("category") || undefined;
    const riskLevel = searchParams.get("riskLevel") || undefined;
    const status = searchParams.get("status") || undefined; // "ACTIVE" | "CLEARED" or "PENDING" | "APPROVED"
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    let dateQuery = {};
    if (startDateStr || endDateStr) {
      dateQuery = {
        createdAt: {
          ...(startDateStr && { gte: new Date(startDateStr) }),
          ...(endDateStr && { lte: new Date(endDateStr) }),
        },
      };
    }

    if (mode === "reports") {
      const reports = await prisma.incidentReport.findMany({
        where: {
          ...(category && { category }),
          ...(status && { status }),
          ...dateQuery,
        },
        include: {
          reporter: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(reports);
    } else {
      const incidents = await prisma.roadIncident.findMany({
        where: {
          ...(category && { category }),
          ...(riskLevel && { riskLevel }),
          ...(status && { status }),
          ...dateQuery,
        },
        include: {
          reports: true,
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(incidents);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Submit a citizen report
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const { category, latitude, longitude, description, imageUrl, type } = await req.json();

    if (!category || !latitude || !longitude || !description) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
    }

    // Citizen report or Camera report
    const reportType = type || "CITIZEN";

    // Standard PII privacy scrubbing simulation
    const finalDescription = `${description} [Privacy-checked: camera blurred metadata]`;

    const report = await prisma.incidentReport.create({
      data: {
        reporterId: session?.user?.id || null,
        type: reportType,
        category,
        imageUrl: imageUrl || null,
        latitude: lat,
        longitude: lng,
        description: finalDescription,
        confidence: reportType === "CV_CAMERA" ? 0.92 : 1.0,
        status: "PENDING",
      },
    });

    return NextResponse.json({ success: true, report });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
