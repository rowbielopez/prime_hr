"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FilePlus2, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/foundation";
import { cancelEmployeeRequestAction } from "@/features/requests/requests.actions";
import type { EmployeeRequestListItem, EmployeeRequestStatus, EmployeeRequestType } from "@/features/requests/types";
import { EMPLOYEE_REQUEST_STATUSES, EMPLOYEE_REQUEST_TYPES, EMPLOYEE_REQUEST_TYPE_LABELS } from "@/features/requests/types";
import { EmployeeRequestDetailDialog } from "@/components/features/requests/employee-request-detail-dialog";
import { EmployeeRequestFormDialog } from "@/components/features/requests/employee-request-form-dialog";
import { EmployeeRequestStatusBadge } from "@/components/features/requests/employee-request-status-badge";

const ALL = "all";

function formatDate(input: string | null) {
    if (!input) return "—";
    return new Date(input).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function includesDateRange(request: EmployeeRequestListItem, from: string, to: string) {
    const basis = request.submittedAt ?? request.createdAt;
    const date = new Date(basis).getTime();
    if (from && date < new Date(`${from}T00:00:00`).getTime()) return false;
    if (to && date > new Date(`${to}T23:59:59`).getTime()) return false;
    return true;
}

function canEdit(request: EmployeeRequestListItem) {
    return request.status === "draft" || request.status === "returned_for_revision";
}

function canCancel(request: EmployeeRequestListItem) {
    return request.status === "draft" || request.status === "submitted";
}

type Props = {
    requests: EmployeeRequestListItem[];
};

export function MyRequestsList({ requests }: Props) {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState<typeof ALL | EmployeeRequestStatus>(ALL);
    const [requestType, setRequestType] = useState<typeof ALL | EmployeeRequestType>(ALL);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [isPending, startTransition] = useTransition();

    const filtered = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        return requests.filter((request) => {
            if (status !== ALL && request.status !== status) return false;
            if (requestType !== ALL && request.requestType !== requestType) return false;
            if (!includesDateRange(request, dateFrom, dateTo)) return false;
            if (!normalizedQuery) return true;
            return [request.subject, request.description, request.hrRemarks ?? ""]
                .join(" ")
                .toLowerCase()
                .includes(normalizedQuery);
        });
    }, [dateFrom, dateTo, query, requestType, requests, status]);

    function cancelRequest(request: EmployeeRequestListItem) {
        startTransition(async () => {
            const result = await cancelEmployeeRequestAction(request.id);
            if (!result.ok) {
                toast.error(result.error);
                return;
            }
            toast.success("Your request has been cancelled.");
            router.refresh();
        });
    }

    return (
        <Card>
            <CardHeader className="border-b">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <CardTitle className="text-base">Request List</CardTitle>
                        <p className="mt-1 text-xs text-muted-foreground">Only requests linked to your employee profile are shown here.</p>
                    </div>
                    <EmployeeRequestFormDialog />
                </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
                <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_0.8fr_0.8fr]">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
                        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by subject or remarks" className="pl-8" />
                    </div>
                    <Select value={requestType} onValueChange={(value) => value && setRequestType(value as typeof requestType)}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>All request types</SelectItem>
                            {EMPLOYEE_REQUEST_TYPES.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={status} onValueChange={(value) => value && setStatus(value as typeof status)}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>All statuses</SelectItem>
                            {EMPLOYEE_REQUEST_STATUSES.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} aria-label="Date from" />
                    <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} aria-label="Date to" />
                </div>

                {requests.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed bg-muted/20 px-6 py-10 text-center">
                        <FilePlus2 className="size-8 text-muted-foreground" aria-hidden />
                        <p className="text-sm font-medium">You have not submitted any requests yet.</p>
                        <p className="max-w-md text-xs text-muted-foreground">Submit a request when you need HR to review a correction or process an HR service.</p>
                        <div className="mt-2"><EmployeeRequestFormDialog /></div>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                        No requests match the current filters.
                    </div>
                ) : (
                    <>
                        <div className="hidden overflow-hidden rounded-lg border md:block">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                                    <tr>
                                        <th className="px-3 py-2 font-medium">Request Type</th>
                                        <th className="px-3 py-2 font-medium">Subject</th>
                                        <th className="px-3 py-2 font-medium">Status</th>
                                        <th className="px-3 py-2 font-medium">Submitted</th>
                                        <th className="px-3 py-2 font-medium">Last Updated</th>
                                        <th className="px-3 py-2 text-right font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filtered.map((request) => (
                                        <tr key={request.id} className="align-top">
                                            <td className="px-3 py-3 text-muted-foreground">{EMPLOYEE_REQUEST_TYPE_LABELS[request.requestType]}</td>
                                            <td className="px-3 py-3">
                                                <p className="font-medium">{request.subject}</p>
                                                {request.hrRemarks ? <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">HR remarks: {request.hrRemarks}</p> : null}
                                            </td>
                                            <td className="px-3 py-3"><EmployeeRequestStatusBadge status={request.status} /></td>
                                            <td className="px-3 py-3 text-muted-foreground">{formatDate(request.submittedAt)}</td>
                                            <td className="px-3 py-3 text-muted-foreground">{formatDate(request.updatedAt)}</td>
                                            <td className="px-3 py-3">
                                                <div className="flex justify-end gap-2">
                                                    <EmployeeRequestDetailDialog request={request} />
                                                    {canEdit(request) ? <EmployeeRequestFormDialog request={request} triggerLabel={request.status === "returned_for_revision" ? "Revise" : "Edit Draft"} variant="outline" /> : null}
                                                    {canCancel(request) ? (
                                                        <ConfirmDialog
                                                            trigger={<Button type="button" variant="outline" size="sm" className="border-destructive/40 text-destructive hover:text-destructive">Cancel</Button>}
                                                            title="Cancel this request?"
                                                            description="This will mark the request as cancelled. HR will no longer process it."
                                                            confirmLabel="Cancel Request"
                                                            variant="destructive"
                                                            isPending={isPending}
                                                            onConfirm={() => cancelRequest(request)}
                                                        />
                                                    ) : null}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="space-y-3 md:hidden">
                            {filtered.map((request) => (
                                <div key={request.id} className="rounded-lg border p-3 text-sm">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-medium">{request.subject}</p>
                                            <p className="mt-1 text-xs text-muted-foreground">{EMPLOYEE_REQUEST_TYPE_LABELS[request.requestType]}</p>
                                        </div>
                                        <EmployeeRequestStatusBadge status={request.status} />
                                    </div>
                                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                        <span>Submitted: {formatDate(request.submittedAt)}</span>
                                        <span>Updated: {formatDate(request.updatedAt)}</span>
                                    </div>
                                    {request.hrRemarks ? <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">HR remarks: {request.hrRemarks}</p> : null}
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <EmployeeRequestDetailDialog request={request} />
                                        {canEdit(request) ? <EmployeeRequestFormDialog request={request} triggerLabel={request.status === "returned_for_revision" ? "Revise" : "Edit Draft"} variant="outline" /> : null}
                                        {canCancel(request) ? (
                                            <ConfirmDialog
                                                trigger={<Button type="button" variant="outline" size="sm" className="border-destructive/40 text-destructive hover:text-destructive">Cancel</Button>}
                                                title="Cancel this request?"
                                                description="This will mark the request as cancelled. HR will no longer process it."
                                                confirmLabel="Cancel Request"
                                                variant="destructive"
                                                isPending={isPending}
                                                onConfirm={() => cancelRequest(request)}
                                            />
                                        ) : null}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {isPending ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="size-3.5 animate-spin" aria-hidden /> Updating request...
                    </div>
                ) : null}
            </CardContent>
        </Card>
    );
}
