import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { PublicVacancyDetail } from "@/features/recruitment/public/types";
import {
  getVacancyState,
  VacancyStateBadge,
} from "@/components/features/careers/vacancy-badges";

const DOCUMENT_LABELS: Record<string, string> = {
  pds: "Personal Data Sheet (CSC Form 212 Rev. 2025)",
  application_letter: "Application Letter",
  saln: "SALN (Statement of Assets, Liabilities & Net Worth)",
  medical_certificate: "Medical Certificate",
  tor_diploma: "Transcript of Records / Diploma",
  civil_service_eligibility: "Certificate of Civil Service Eligibility",
  service_record: "Service Record",
  performance_rating: "Performance Rating (IPCR/OPCR — last 2 rating periods)",
  training_certificates: "Training Certificates (relevant to position)",
  nbi_clearance: "NBI Clearance",
  police_clearance: "Police Clearance",
  passport_photo: "2×2 Passport-size Photo (3 copies)",
  birth_certificate: "PSA Birth Certificate",
  marriage_certificate: "PSA Marriage Certificate (if applicable)",
  position_description_form: "Position Description Form (DBM-CSC Form No. 1)",
  employment_certificate: "Certificate of Previous Employment",
};

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function MetaItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function VacancyDetailView({
  vacancy,
}: {
  vacancy: PublicVacancyDetail;
}) {
  const posted = formatDate(vacancy.postedAt);
  const closes = formatDate(vacancy.closingAt);
  const state = getVacancyState(vacancy.postedAt, vacancy.closingAt);
  const closed = state === "deadline_passed";

  return (
    <article className="max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        href="/careers"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 mb-8"
      >
        <svg viewBox="0 0 14 14" fill="none" className="w-3.5 h-3.5">
          <path
            d="M12 7H2M6 3.5L2.5 7 6 10.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Back to open positions
      </Link>

      {/* Header card */}
      <div className="rounded-xl border border-border/60 bg-surface-raised p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <VacancyStateBadge state={state} />
              {vacancy.employmentType && (
                <Badge variant="secondary" className="text-[10px]">
                  {vacancy.employmentType}
                </Badge>
              )}
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground leading-tight">
              {vacancy.title}
            </h1>
            <p className="text-muted-foreground">
              {vacancy.campusName}
              {vacancy.officeName ? ` · ${vacancy.officeName}` : ""}
            </p>
          </div>
        </div>

        {/* Meta grid */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-lg bg-surface-inset border border-border/50 p-4">
          <MetaItem label="Positions available" value={vacancy.itemCount} />
          {vacancy.plantillaItemNo && (
            <MetaItem
              label="Plantilla item no."
              value={vacancy.plantillaItemNo}
            />
          )}
          <MetaItem label="Date posted" value={posted ?? "—"} />
          <MetaItem label="Deadline" value={closes ?? "Until filled"} />
        </div>
      </div>

      {/* Body */}
      <div className="space-y-4">
        {vacancy.description && (
          <div className="rounded-xl border border-border/60 bg-surface-raised p-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              Position summary
            </h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
              {vacancy.description}
            </p>
          </div>
        )}

        {vacancy.qualificationNotes && (
          <div className="rounded-xl border border-border/60 bg-surface-raised p-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              Qualifications
            </h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
              {vacancy.qualificationNotes}
            </p>
          </div>
        )}

        {vacancy.requiredDocuments.length > 0 && (
          <div className="rounded-xl border border-border/60 bg-surface-raised p-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              Required documents
            </h2>
            <ul className="space-y-2">
              {vacancy.requiredDocuments.map((key) => (
                <li
                  key={key}
                  className="flex items-start gap-2.5 text-sm text-foreground/90"
                >
                  <svg
                    viewBox="0 0 14 14"
                    fill="none"
                    className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-primary"
                  >
                    <path
                      d="M2.5 7.5L5.5 10.5L11.5 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {DOCUMENT_LABELS[key] ?? key}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Apply CTA */}
      {closed ? (
        <div className="mt-8 rounded-xl border border-border/60 bg-muted/30 p-6 text-center">
          <p className="font-semibold text-foreground">
            This vacancy is no longer accepting applications.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            The application deadline has passed. Please check our other open
            positions.
          </p>
          <Link
            href="/careers"
            className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-lg border border-border bg-surface-raised text-sm font-semibold transition-colors hover:bg-surface-inset"
          >
            Browse open positions
          </Link>
        </div>
      ) : (
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-primary/20 bg-primary/5 p-6">
          <div>
            <p className="font-semibold text-foreground">Ready to apply?</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Submission takes a few minutes — no account required.
            </p>
          </div>
          <Link
            href={`/careers/${vacancy.slug}/apply`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold transition-opacity hover:opacity-90 flex-shrink-0"
          >
            Apply for this position
            <svg viewBox="0 0 14 14" fill="none" className="w-3.5 h-3.5">
              <path
                d="M2 7h10M8 3.5L11.5 7 8 10.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>
      )}
    </article>
  );
}
