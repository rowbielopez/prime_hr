import { redirect } from "next/navigation";
import { requirePermission } from "@/features/auth/server/require-permission";

export default async function ComplianceIndexPage() {
  await requirePermission({ permission: "compliance.evidence.read" });
  redirect("/compliance/evidence");
}
