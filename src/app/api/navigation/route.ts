import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// POST: Start a navigation session or end it
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, startLat, startLng, endLat, endLng, sessionId, rating, comment } = await req.json();

    if (action === "start") {
      if (startLat === undefined || startLng === undefined || endLat === undefined || endLng === undefined) {
        return NextResponse.json({ error: "Missing navigation coordinates" }, { status: 400 });
      }

      const navSession = await prisma.navigationSession.create({
        data: {
          userId: session.user.id,
          startLat: parseFloat(startLat),
          startLng: parseFloat(startLng),
          endLat: parseFloat(endLat),
          endLng: parseFloat(endLng),
          status: "IN_PROGRESS",
          startedAt: new Date(),
        },
      });

      return NextResponse.json({ success: true, session: navSession });
    } 
    
    if (action === "arrive") {
      if (!sessionId) {
        return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
      }

      // Close the navigation session if it exists and is not feedback
      let navSession = null;
      if (sessionId !== "feedback") {
        try {
          navSession = await prisma.navigationSession.update({
            where: { id: sessionId },
            data: {
              status: "ARRIVED",
              endedAt: new Date(),
            },
          });
        } catch (e) {
          console.warn("Could not find navigation session to update: ", e);
        }
      }

      // Award commuter points for completing navigation & safety checks (+5 points)
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          points: { increment: 5 },
        },
      });

      // Record navigation feedback
      if (rating !== undefined) {
        await prisma.incidentFeedback.create({
          data: {
            userId: session.user.id,
            type: "POST_NAVIGATION",
            rating: parseInt(rating),
            comment: comment || "Successfully completed route safely.",
          },
        });
      }

      return NextResponse.json({ success: true, session: navSession, pointsAwarded: 5 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
