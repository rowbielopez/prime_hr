import { FileCheck2, FileClock, FileText, RotateCcw, SearchCheck, ShieldCheck } from "lucide-react";
import type { EmployeeRequestSummary } from "@/features/requests/types";
import { cn } from "@/lib/utils";

type SummaryItem = {
    label: string;
    value: number;
    icon: typeof FileText;
    className: string;
};

type Props = {
    summary: EmployeeRequestSummary;
};

export function MyRequestsSummaryCards({ summary }: Props) {
    const items: SummaryItem[] = [
        { label: "Total Requests", value: summary.total, icon: FileText, className: "bg-muted text-foreground" },
        { label: "Pending", value: summary.pending, icon: FileClock, className: "bg-amber-50 text-amber-700" },
        { label: "Under Review", value: summary.underReview, icon: SearchCheck, className: "bg-blue-50 text-blue-700" },
        { label: "Returned", value: summary.returned, icon: RotateCcw, className: "bg-orange-50 text-orange-700" },
        { label: "Approved", value: summary.approved, icon: ShieldCheck, className: "bg-green-50 text-green-700" },
        { label: "Completed", value: summary.completed, icon: FileCheck2, className: "bg-emerald-50 text-emerald-700" },
    ];

    return (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {items.map((item) => {
                const Icon = item.icon;
                return (
                    <div key={item.label} className="rounded-lg border bg-card p-3 shadow-premium-sm">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs text-muted-foreground">{item.label}</p>
                                <p className="mt-1 text-2xl font-semibold tracking-normal">{item.value}</p>
                            </div>
                            <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-md", item.className)}>
                                <Icon className="size-4" aria-hidden />
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
