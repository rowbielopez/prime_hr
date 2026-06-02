import { AuditLogList } from "@/components/features/audit/audit-log-list";
import { PageHeader } from "@/components/foundation";
import { listAuditLogs } from "@/features/audit/logs/repository/audit-logs.repository";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";

export default async function AuditLogsPage() {
  const { pageMeta, context } = await withProtectedPageMeta({
    pathname: "/audit/logs",
    permissions: ["audit.logs.read", "audit.logs.campus.read"],
  });
  const logs = await listAuditLogs(context);

  return (
    <div className="space-y-6">
      <PageHeader
        title={pageMeta.title}
        subtitle={pageMeta.subtitle}
        breadcrumb={pageMeta.breadcrumb}
      />
      <AuditLogList logs={logs} />
    </div>
  );
}
