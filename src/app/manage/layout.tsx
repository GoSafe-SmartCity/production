import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ManageLayoutClient } from "@/components/pages/manage/layout/manage-layout-client";

export default async function ManageLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getSession();

    // Server-side auth check: ONLY allow admins to access
    if (!session || session.user?.role !== "ADMIN") {
        redirect("/");
    }

    return (
        <ManageLayoutClient session={session}>
            {children}
        </ManageLayoutClient>
    );
}
