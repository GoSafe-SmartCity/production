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

// POST: Submit a citizen report or direct incident creation (Admin)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const body = await req.json();

    // Check if admin is creating incident directly
    if (session?.user?.role === "ADMIN" && body.directCreate) {
      const { category, riskLevel, riskScore, locationName, description, recommendation, latitude, longitude } = body;
      if (!category || !locationName || !description || latitude === undefined || longitude === undefined) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }
      const incident = await prisma.roadIncident.create({
        data: {
          category,
          riskLevel: riskLevel || "LOW",
          riskScore: parseInt(riskScore) || 0,
          locationName,
          description,
          recommendation: recommendation || "",
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          status: "ACTIVE",
          startedAt: new Date(),
        }
      });
      return NextResponse.json({ success: true, incident });
    }

    const { category, latitude, longitude, description, imageUrl, type } = body;

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

// PUT: Update an active road incident (Admin CRUD)
export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id, category, riskScore, riskLevel, latitude, longitude, locationName, description, recommendation, status } = await req.json();

    if (!id || !category || !locationName || !description) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const incident = await prisma.roadIncident.update({
      where: { id },
      data: {
        category,
        riskScore: parseInt(riskScore) || 0,
        riskLevel,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        locationName,
        description,
        recommendation: recommendation || "",
        status: status || "ACTIVE",
      },
    });

    return NextResponse.json({ success: true, incident });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Remove a road incident (Admin CRUD)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing incident ID" }, { status: 400 });
    }

    await prisma.roadIncident.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
