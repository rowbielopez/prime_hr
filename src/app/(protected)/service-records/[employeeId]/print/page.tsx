import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { withProtectedPageMeta } from "@/features/auth/server/with-protected-page-meta";
import { getEmployeeServiceRecordDetail } from "@/features/service-records/repository/service-records.repository";
import { PrintTriggerButton } from "./print-trigger-button";

type PageProps = { params: Promise<{ employeeId: string }> };

function formatDate(input: string | null) {
    if (!input) return "";
    return new Date(input).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "2-digit" });
}

function formatMoney(input: number | null) {
    if (input === null) return "";
    return new Intl.NumberFormat("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(input);
}

function value(input: string | number | null | undefined) {
    if (input === null || input === undefined || input === "") return "";
    return String(input);
}

const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", tableLayout: "fixed" };
const thStyle: React.CSSProperties = { border: "1px solid #333", padding: "5px", fontSize: 10, textAlign: "center", background: "#f3f4f6" };
const tdStyle: React.CSSProperties = { border: "1px solid #333", padding: "5px", fontSize: 10, verticalAlign: "top" };

export default async function ServiceRecordPrintPage({ params }: PageProps) {
    const { employeeId } = await params;
    await withProtectedPageMeta({ pathname: "/service-records", permission: "employee.records.read" });
    const detail = await getEmployeeServiceRecordDetail(employeeId);
    if (!detail) notFound();
    const entries = detail.entries.filter((entry) => !entry.archivedAt);

    return (
        <div style={{ minHeight: "100vh", background: "#f8fafc", padding: 24 }}>
            <style>{`
        @media print {
          body { background: #fff !important; }
          aside, header, nav, [data-print-hidden="true"] { display: none !important; }
          main { padding: 0 !important; }
          .service-record-sheet { box-shadow: none !important; border: none !important; margin: 0 !important; }
          @page { size: legal landscape; margin: 12mm; }
        }
      `}</style>

            <div data-print-hidden="true" style={{ margin: "0 auto 16px", maxWidth: 1200, display: "flex", justifyContent: "space-between", gap: 12 }}>
                <Link href={`/service-records/${employeeId}`} style={{ color: "#7f1d1d", fontSize: 13 }}>Back to service record</Link>
                <PrintTriggerButton />
            </div>

            <section className="service-record-sheet" style={{ margin: "0 auto", maxWidth: 1200, background: "#fff", border: "1px solid #d1d5db", boxShadow: "0 8px 24px rgba(15,23,42,0.08)", padding: 28, color: "#111827" }}>
                <header style={{ display: "flex", alignItems: "center", gap: 16, borderBottom: "2px solid #7f1d1d", paddingBottom: 14, marginBottom: 18 }}>
                    <Image src="/600x600 CSU Logo.png" alt="Cagayan State University logo" width={64} height={64} style={{ objectFit: "contain" }} priority />
                    <div style={{ flex: 1, textAlign: "center" }}>
                        <p style={{ margin: 0, fontSize: 12 }}>Republic of the Philippines</p>
                        <h1 style={{ margin: "2px 0", fontSize: 18, letterSpacing: 0 }}>Cagayan State University</h1>
                        <p style={{ margin: 0, fontSize: 12 }}>Human Resource Management Office</p>
                        <h2 style={{ margin: "12px 0 0", fontSize: 16, textTransform: "uppercase" }}>Official Service Record</h2>
                    </div>
                    <div style={{ width: 64 }} />
                </header>

                <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16, fontSize: 11 }}>
                    <Info label="Employee Name" value={detail.employee.fullName} />
                    <Info label="Employee No." value={detail.employee.employeeNo} />
                    <Info label="Employment Status" value={detail.employee.employmentStatus.replace("_", " ")} />
                    <Info label="Campus" value={detail.employee.campusName} />
                    <Info label="Office / Unit" value={detail.employee.officeName} />
                    <Info label="Date Hired" value={formatDate(detail.employee.dateHired)} />
                </section>

                <table style={tableStyle}>
                    <thead>
                        <tr>
                            <th style={{ ...thStyle, width: "8%" }}>From</th>
                            <th style={{ ...thStyle, width: "8%" }}>To</th>
                            <th style={{ ...thStyle, width: "17%" }}>Designation / Position</th>
                            <th style={{ ...thStyle, width: "11%" }}>Status</th>
                            <th style={{ ...thStyle, width: "10%" }}>Salary</th>
                            <th style={{ ...thStyle, width: "9%" }}>SG / Step</th>
                            <th style={{ ...thStyle, width: "14%" }}>Station / Place</th>
                            <th style={{ ...thStyle, width: "8%" }}>Branch</th>
                            <th style={{ ...thStyle, width: "15%" }}>Remarks / Movement</th>
                        </tr>
                    </thead>
                    <tbody>
                        {entries.length === 0 ? (
                            <tr><td colSpan={9} style={{ ...tdStyle, textAlign: "center", padding: 16 }}>No service record entries found.</td></tr>
                        ) : entries.map((entry) => (
                            <tr key={entry.id}>
                                <td style={tdStyle}>{formatDate(entry.dateFrom)}</td>
                                <td style={tdStyle}>{entry.isCurrent ? "Present" : formatDate(entry.dateTo)}</td>
                                <td style={tdStyle}>{entry.positionTitle}</td>
                                <td style={tdStyle}>{value(entry.appointmentStatus)}</td>
                                <td style={{ ...tdStyle, textAlign: "right" }}>{formatMoney(entry.monthlySalary)}</td>
                                <td style={tdStyle}>{value(entry.salaryGradeStep)}</td>
                                <td style={tdStyle}>{value(entry.stationPlace)}</td>
                                <td style={tdStyle}>{value(entry.branch)}</td>
                                <td style={tdStyle}>{[entry.movementType, entry.remarks].filter(Boolean).join(" · ")}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <footer style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, marginTop: 42, fontSize: 11 }}>
                    <Signature label="Prepared by" />
                    <Signature label="Certified correct by" />
                </footer>
            </section>
        </div>
    );
}

function Info({ label, value: input }: { label: string; value: string | null | undefined }) {
    return <div><p style={{ margin: 0, color: "#6b7280" }}>{label}</p><p style={{ margin: "2px 0 0", fontWeight: 700 }}>{value(input) || "—"}</p></div>;
}

function Signature({ label }: { label: string }) {
    return <div style={{ textAlign: "center" }}><div style={{ borderBottom: "1px solid #111827", height: 32 }} /><p style={{ margin: "6px 0 0", fontWeight: 700 }}>{label}</p><p style={{ margin: 0, color: "#6b7280" }}>Name / Position / Date</p></div>;
}