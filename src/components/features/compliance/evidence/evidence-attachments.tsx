"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/foundation";
import { evidenceAttachmentSchema } from "@/features/compliance/evidence/schemas/evidence-attachment.schema";
import type { EvidenceAttachmentItem } from "@/features/compliance/evidence/types";

type EvidenceAttachmentsProps = {
  evidenceId: string;
  attachments: EvidenceAttachmentItem[];
  onAddAttachment: (input: { evidenceId: string; fileName: string; fileType: string; storagePath?: string | null }) => Promise<{
    ok: boolean;
    error?: string;
  }>;
  onUploadAttachment: (formData: FormData) => Promise<{ ok: boolean; error?: string }>;
  onGetSignedUrl: (attachmentId: string) => Promise<{ ok: boolean; url?: string; error?: string }>;
  onDeleteAttachment: (input: { attachmentId: string; deleteFromStorage: boolean }) => Promise<{
    ok: boolean;
    error?: string;
  }>;
};

export function EvidenceAttachments({
  evidenceId,
  attachments,
  onAddAttachment,
  onUploadAttachment,
  onGetSignedUrl,
  onDeleteAttachment,
}: EvidenceAttachmentsProps) {
  const [isPending, startTransition] = useTransition();
  const [formState, setFormState] = useState({ fileName: "", fileType: "", storagePath: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function addAttachment() {
    const parsed = evidenceAttachmentSchema.safeParse({
      evidenceId,
      fileName: formState.fileName,
      fileType: formState.fileType,
      storagePath: formState.storagePath || null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid attachment metadata.");
      return;
    }
    startTransition(async () => {
      const result = await onAddAttachment(parsed.data);
      if (!result.ok) {
        toast.error(result.error ?? "Failed to add attachment.");
        return;
      }
      toast.success("Attachment metadata added.");
      setFormState({ fileName: "", fileType: "", storagePath: "" });
    });
  }

  function uploadFile() {
    if (!selectedFile) {
      toast.error("Please choose a file to upload.");
      return;
    }
    const formData = new FormData();
    formData.set("file", selectedFile);
    startTransition(async () => {
      const result = await onUploadAttachment(formData);
      if (!result.ok) {
        toast.error(result.error ?? "Failed to upload attachment.");
        return;
      }
      toast.success("Attachment uploaded and linked.");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    });
  }

  function openAttachment(attachmentId: string) {
    startTransition(async () => {
      const result = await onGetSignedUrl(attachmentId);
      if (!result.ok || !result.url) {
        toast.error(result.error ?? "Unable to open attachment.");
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    });
  }

  function deleteAttachment(attachmentId: string) {
    const deleteFromStorage = window.confirm(
      "Delete this attachment from secure storage too?\n\nPress OK to delete from storage and hide from record.\nPress Cancel to keep file in storage and only hide from this record."
    );
    startTransition(async () => {
      const result = await onDeleteAttachment({ attachmentId, deleteFromStorage });
      if (!result.ok) {
        toast.error(result.error ?? "Failed to delete attachment.");
        return;
      }
      toast.success(deleteFromStorage ? "Attachment deleted from storage and record." : "Attachment hidden from record.");
    });
  }

  return (
    <section className="rounded-lg border p-4">
      <h3 className="text-sm font-semibold">Evidence Attachments</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Record attachment metadata after files are stored in your approved repository (shared drive, DMS, or future
        direct upload). Filename and type are stored here for audit traceability.
      </p>

      <div className="mt-4 rounded-md border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground">
        Upload files directly to secure storage using the upload form below, or keep encoding external references
        through metadata if your evidence source lives in another approved repository.
      </div>

      <div className="mt-4 rounded-md border p-3">
        <p className="mb-2 text-sm font-medium">Upload and attach file</p>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <Input
            ref={fileInputRef}
            type="file"
            onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
          />
          <Button size="sm" onClick={uploadFile} disabled={isPending || !selectedFile}>
            Upload & Attach
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Input
          placeholder="Filename"
          value={formState.fileName}
          onChange={(e) => setFormState((p) => ({ ...p, fileName: e.target.value }))}
        />
        <Input
          placeholder="File type (PDF/Image/Sheet)"
          value={formState.fileType}
          onChange={(e) => setFormState((p) => ({ ...p, fileType: e.target.value }))}
        />
        <Input
          placeholder="Storage path (optional)"
          value={formState.storagePath}
          onChange={(e) => setFormState((p) => ({ ...p, storagePath: e.target.value }))}
        />
      </div>
      <div className="mt-3 flex justify-end">
        <Button size="sm" onClick={addAttachment} disabled={isPending}>
          Save Attachment Metadata
        </Button>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="px-2 py-2">Filename</th>
              <th className="px-2 py-2">Type</th>
              <th className="px-2 py-2">Uploaded Date</th>
              <th className="px-2 py-2">Uploaded By</th>
              <th className="px-2 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {attachments.length === 0 ? (
              <tr>
                <td className="px-2 py-3 text-muted-foreground" colSpan={5}>
                  No attachments yet.
                </td>
              </tr>
            ) : (
              attachments.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="px-2 py-2">{item.fileName}</td>
                  <td className="px-2 py-2">{item.fileType}</td>
                  <td className="px-2 py-2">{item.uploadedAt.slice(0, 10)}</td>
                  <td className="px-2 py-2">{item.uploadedByLabel ?? "Unknown"}</td>
                  <td className="px-2 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      {item.storagePath ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAttachment(item.id)}
                          disabled={isPending}
                        >
                          Open
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">No stored file</span>
                      )}
                      <ConfirmDialog
                        trigger={
                          <Button size="sm" variant="destructive" disabled={isPending}>
                            Remove
                          </Button>
                        }
                        title="Remove attachment?"
                        description="This will permanently delete the file and cannot be undone."
                        confirmLabel="Remove"
                        variant="destructive"
                        onConfirm={() => deleteAttachment(item.id)}
                        isPending={isPending}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
