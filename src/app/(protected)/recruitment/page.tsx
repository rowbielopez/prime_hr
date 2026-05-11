import { redirect } from "next/navigation";
import { requirePermission } from "@/features/auth/server/require-permission";

export default async function RecruitmentPage() {
  await requirePermission({ permission: "recruitment.vacancies.read" });
  redirect("/recruitment/vacancies");
}
