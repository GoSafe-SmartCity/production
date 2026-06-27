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
