import { FileText } from "lucide-react";
import { PageHeader } from "@/components/foundation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { getMyEmployee, getMyDocuments } from "@/features/me/repository/me.repository";
import { NoEmployeeLink } from "@/components/features/me/no-employee-link";

function formatDate(input: string) {
    try {
        return new Date(input).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
    } catch {
        return input;
    }
}

export default async function MyDocumentsPage() {
    const { pageMeta, context } = await withProtectedPageMeta({ pathname: "/me/documents" });
    const me = await getMyEmployee(context.appUserId);

    if (!me || !me.employee) {
        return (
            <div className="space-y-6">
                <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />
                <NoEmployeeLink />
            </div>
        );
    }

    const documents = await getMyDocuments(me.employeeId);

    return (
        <div className="space-y-6">
            <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} breadcrumb={pageMeta.breadcrumb} />

            <Card>
                <CardHeader className="border-b">
                    <CardTitle className="text-base">Documents on file</CardTitle>
                    <p className="text-xs text-muted-foreground">
                        These are documents HR has attached to your 201 file. To request a copy or upload a new document, please
                        contact your HR officer.
                    </p>
                </CardHeader>
                <CardContent className="pt-4">
                    {documents.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border/70 bg-muted/30 px-6 py-10 text-center">
                            <FileText className="h-8 w-8 text-muted-foreground" />
                            <p className="text-sm font-medium">No documents yet</p>
                            <p className="max-w-md text-xs text-muted-foreground">
                                When HR uploads documents for you (contracts, certificates, appointment papers), they will appear here.
                            </p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-border/70">
                            {documents.map((doc) => (
                                <li key={doc.id} className="flex items-center justify-between gap-3 py-3">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                            <FileText className="h-4 w-4" />
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-sm font-medium">{doc.title}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {doc.documentType.replaceAll("_", " ")} · {doc.fileName}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge variant="secondary" className="capitalize">{doc.status.replaceAll("_", " ")}</Badge>
                                        <span className="text-xs text-muted-foreground">{formatDate(doc.createdAt)}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
