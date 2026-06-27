import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Shared in-memory list for active sessions waiting for notifications (simplified broadcast SSE/polling fallback)
let activeNotifications: Array<{ id: string; title: string; message: string; timestamp: Date }> = [];

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const body = await req.json();
    const { action } = body;

    if (action === "subscribe") {
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const { endpoint, p256dh, auth } = body;
      if (!endpoint || !p256dh || !auth) {
        return NextResponse.json({ error: "Missing subscription details" }, { status: 400 });
      }

      const subscription = await prisma.notificationSubscription.create({
        data: {
          userId: session.user.id,
          endpoint,
          p256dh,
          auth,
        },
      });
      return NextResponse.json({ success: true, subscription });
    }

    if (action === "broadcast") {
      if (!session || session.user?.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized. Admin required" }, { status: 403 });
      }

      const { title, message } = body;
      if (!title || !message) {
        return NextResponse.json({ error: "Missing title or message" }, { status: 400 });
      }

      const notification = {
        id: Math.random().toString(36).substr(2, 9),
        title,
        message,
        timestamp: new Date(),
      };

      activeNotifications.push(notification);

      // Keep only latest 10 notifications
      if (activeNotifications.length > 10) {
        activeNotifications.shift();
      }

      return NextResponse.json({ success: true, notification, recipientCount: 1 });
    }

    if (action === "poll") {
      // Returns active notifications list
      const since = body.since ? new Date(body.since) : new Date(Date.now() - 10000);
      const newAlerts = activeNotifications.filter(n => n.timestamp > since);
      return NextResponse.json({ success: true, alerts: newAlerts });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
