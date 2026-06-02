"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { submitPublicApplicationAction } from "@/features/recruitment/public/public-careers.actions";

type Props = {
  vacancySlug: string;
  vacancyTitle: string;
  campusName?: string;
  officeName?: string | null;
  employmentType?: string | null;
  requiredDocuments?: string[];
};

type FormErrors = Partial<
  Record<
    | "firstName"
    | "middleName"
    | "lastName"
    | "suffix"
    | "email"
    | "mobileNo"
    | "coverNote"
    | "consent",
    string
  >
>;

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

const DEFAULT_DOCUMENTS = [
  "application_letter",
  "pds",
  "tor_diploma",
  "civil_service_eligibility",
];

export function PublicApplyForm({
  vacancySlug,
  vacancyTitle,
  campusName,
  officeName,
  employmentType,
  requiredDocuments,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<FormErrors>({});

  // Personal info
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [suffix, setSuffix] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNo, setMobileNo] = useState("");

  // Qualification summary (optional)
  const [education, setEducation] = useState("");
  const [eligibility, setEligibility] = useState("");
  const [experience, setExperience] = useState("");
  const [skills, setSkills] = useState("");

  // Cover note + consent
  const [coverNote, setCoverNote] = useState("");
  const [consent, setConsent] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);

  // Document checklist acknowledgement
  const checklist = useMemo(() => {
    const list =
      requiredDocuments && requiredDocuments.length > 0
        ? requiredDocuments
        : DEFAULT_DOCUMENTS;
    return list.map((key) => ({ key, label: DOCUMENT_LABELS[key] ?? key }));
  }, [requiredDocuments]);
  const [acknowledgedChecklist, setAcknowledgedChecklist] = useState(false);

  function buildCombinedCoverNote(): string {
    // Combine qualification summary into the cover note so HR sees it in one place
    // without requiring schema changes. Section headers make it easy to parse.
    const sections: string[] = [];
    if (education.trim())
      sections.push(`Highest Education:\n${education.trim()}`);
    if (eligibility.trim())
      sections.push(`Eligibility / License:\n${eligibility.trim()}`);
    if (experience.trim())
      sections.push(`Relevant Experience:\n${experience.trim()}`);
    if (skills.trim())
      sections.push(`Skills / Competencies:\n${skills.trim()}`);
    if (coverNote.trim()) sections.push(`Cover Note:\n${coverNote.trim()}`);
    const combined = sections.join("\n\n");
    // Schema cap is 2000 chars — trim safely.
    return combined.length > 2000 ? combined.slice(0, 2000) : combined;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});

    if (!consent || !privacyConsent) {
      setErrors({ consent: "You must agree to both consent statements." });
      toast.error("Please agree to the certification and privacy notice.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await submitPublicApplicationAction({
          vacancySlug,
          firstName,
          middleName,
          lastName,
          suffix,
          email,
          mobileNo,
          coverNote: buildCombinedCoverNote(),
          consent,
          // _hp intentionally omitted (honeypot stays empty for real users)
        });

        if (result.status === "ok") {
          toast.success("Your application has been submitted successfully.", {
            description: `Reference number: ${result.referenceNo}. HR will review your application.`,
          });
          router.replace(
            `/careers/${vacancySlug}/apply/success?ref=${encodeURIComponent(result.referenceNo)}`,
          );
          return;
        }
        if (result.status === "duplicate") {
          toast.info(
            "You may have already submitted an application for this vacancy using the same email.",
            {
              description:
                result.referenceNo && result.referenceNo !== "—"
                  ? `Existing reference: ${result.referenceNo}`
                  : undefined,
            },
          );
          return;
        }
        if (result.status === "rate_limited") {
          toast.error(
            "You have submitted too many applications recently. Please try again later.",
          );
          return;
        }
        if (result.status === "vacancy_unavailable") {
          toast.error("This vacancy is no longer accepting applications.");
          router.replace(`/careers`);
          return;
        }
        if (result.status === "validation_error") {
          const next: FormErrors = {};
          for (const [key, list] of Object.entries(result.fieldErrors)) {
            if (Array.isArray(list) && list.length > 0) {
              next[key as keyof FormErrors] = list[0];
            }
          }
          setErrors(next);
          toast.error("Please review the highlighted fields.");
          return;
        }
        toast.error(
          result.message ?? "Something went wrong. Please try again.",
        );
      } catch {
        toast.error("Something went wrong. Please try again.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Vacancy summary (read-only) */}
      <div className="rounded-xl border border-border/70 bg-muted/40 p-4 space-y-2">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          You are applying for
        </p>
        <p className="font-semibold text-foreground">{vacancyTitle}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {campusName && <span>Campus: {campusName}</span>}
          {officeName && <span>Office: {officeName}</span>}
          {employmentType && <span>Type: {employmentType}</span>}
        </div>
      </div>

      {/* Personal details */}
      <fieldset className="space-y-4" disabled={isPending}>
        <legend className="text-sm font-semibold">Personal information</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">First name *</Label>
            <Input
              id="firstName"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              aria-invalid={Boolean(errors.firstName)}
              required
            />
            {errors.firstName && (
              <p className="text-xs text-destructive">{errors.firstName}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">Last name *</Label>
            <Input
              id="lastName"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              aria-invalid={Boolean(errors.lastName)}
              required
            />
            {errors.lastName && (
              <p className="text-xs text-destructive">{errors.lastName}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="middleName">Middle name</Label>
            <Input
              id="middleName"
              autoComplete="additional-name"
              value={middleName}
              onChange={(e) => setMiddleName(e.target.value)}
              aria-invalid={Boolean(errors.middleName)}
            />
            {errors.middleName && (
              <p className="text-xs text-destructive">{errors.middleName}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="suffix">Suffix</Label>
            <Input
              id="suffix"
              placeholder="Jr., Sr., III…"
              value={suffix}
              onChange={(e) => setSuffix(e.target.value)}
              aria-invalid={Boolean(errors.suffix)}
            />
            {errors.suffix && (
              <p className="text-xs text-destructive">{errors.suffix}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(errors.email)}
              required
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mobileNo">Mobile number *</Label>
            <Input
              id="mobileNo"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder="+63…"
              value={mobileNo}
              onChange={(e) => setMobileNo(e.target.value)}
              aria-invalid={Boolean(errors.mobileNo)}
              required
            />
            {errors.mobileNo && (
              <p className="text-xs text-destructive">{errors.mobileNo}</p>
            )}
          </div>
        </div>
      </fieldset>

      {/* Qualification summary */}
      <fieldset className="space-y-4" disabled={isPending}>
        <legend className="text-sm font-semibold">
          Qualification summary
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            (optional but recommended)
          </span>
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="education">Highest educational attainment</Label>
            <Input
              id="education"
              maxLength={200}
              placeholder="e.g. BS Information Technology, CSU"
              value={education}
              onChange={(e) => setEducation(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eligibility">Eligibility / PRC / CSC license</Label>
            <Input
              id="eligibility"
              maxLength={200}
              placeholder="e.g. CS Professional, RA 1080 (LET)"
              value={eligibility}
              onChange={(e) => setEligibility(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="experience">Relevant experience</Label>
          <Textarea
            id="experience"
            rows={3}
            maxLength={600}
            placeholder="Briefly describe your relevant work or teaching experience…"
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="skills">Skills / competencies</Label>
          <Textarea
            id="skills"
            rows={3}
            maxLength={500}
            placeholder="e.g. classroom management, data analysis, MS Office, project management…"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
          />
        </div>
      </fieldset>

      {/* Cover note */}
      <fieldset className="space-y-2" disabled={isPending}>
        <legend className="text-sm font-semibold">Cover note (optional)</legend>
        <Textarea
          id="coverNote"
          rows={4}
          maxLength={1000}
          placeholder="Briefly share why you are a good fit for this position…"
          value={coverNote}
          onChange={(e) => setCoverNote(e.target.value)}
          aria-invalid={Boolean(errors.coverNote)}
        />
        <p className="text-xs text-muted-foreground">
          {coverNote.length} / 1000
        </p>
        {errors.coverNote && (
          <p className="text-xs text-destructive">{errors.coverNote}</p>
        )}
      </fieldset>

      {/* Document checklist */}
      <fieldset className="space-y-3" disabled={isPending}>
        <legend className="text-sm font-semibold">
          Required documents
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            (checklist — submit copies upon HR request)
          </span>
        </legend>
        <div className="rounded-xl border border-border/70 bg-surface-raised/60 p-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Online document upload is not yet available. Please prepare the
            following documents. HR will contact you with submission
            instructions (in person or by email) after your application is
            screened.
          </p>
          <ul className="space-y-1.5">
            {checklist.map((doc) => (
              <li
                key={doc.key}
                className="flex items-start gap-2.5 text-sm text-foreground/90"
              >
                <svg
                  viewBox="0 0 14 14"
                  fill="none"
                  className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-primary"
                  aria-hidden="true"
                >
                  <path
                    d="M2.5 7.5L5.5 10.5L11.5 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {doc.label}
              </li>
            ))}
          </ul>
          <div className="flex items-start gap-3 pt-2 border-t border-border/50">
            <Checkbox
              id="ackChecklist"
              checked={acknowledgedChecklist}
              onCheckedChange={(v) => setAcknowledgedChecklist(v === true)}
            />
            <Label
              htmlFor="ackChecklist"
              className="text-xs font-normal leading-relaxed"
            >
              I acknowledge the document checklist and will prepare these
              documents for submission when contacted by HR.
            </Label>
          </div>
        </div>
      </fieldset>

      {/* Consent */}
      <fieldset className="space-y-3" disabled={isPending}>
        <legend className="text-sm font-semibold">
          Certification &amp; consent
        </legend>
        <div className="space-y-2 rounded-md border border-border/70 bg-background/60 p-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="consent"
              checked={consent}
              onCheckedChange={(v) => setConsent(v === true)}
              aria-invalid={Boolean(errors.consent)}
            />
            <Label
              htmlFor="consent"
              className="text-sm font-normal leading-relaxed"
            >
              I certify that the information I have provided in this application
              is true, accurate, and complete to the best of my knowledge.
            </Label>
          </div>
          <div className="flex items-start gap-3">
            <Checkbox
              id="privacyConsent"
              checked={privacyConsent}
              onCheckedChange={(v) => setPrivacyConsent(v === true)}
            />
            <Label
              htmlFor="privacyConsent"
              className="text-sm font-normal leading-relaxed"
            >
              I consent to the collection, storage, and processing of my
              personal information by Cagayan State University for recruitment
              purposes, in accordance with R.A. 10173 (Data Privacy Act of
              2012).
            </Label>
          </div>
          {errors.consent && (
            <p className="text-xs text-destructive">{errors.consent}</p>
          )}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          By submitting, you will receive a reference number for your records.
        </p>
        <div className="flex items-center gap-3">
          {/* Hidden honeypot — must stay empty; filled value indicates bot. */}
          <input
            type="text"
            name="_hp"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{ display: "none" }}
            readOnly
            value=""
          />
          <Button
            type="submit"
            disabled={
              isPending || !consent || !privacyConsent || !acknowledgedChecklist
            }
          >
            {isPending ? "Submitting…" : "Submit application"}
          </Button>
        </div>
      </div>
    </form>
  );
}
