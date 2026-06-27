import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function getSession() {
  return await getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  
  if (!session?.user?.email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  return user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}

export function isAdmin(user: { role: string } | null): boolean {
  return user?.role === "ADMIN";
}

export async function requireAdmin() {
  const user = await requireAuth();
  
  if (user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }

  return user;
}
