"use server";

import { requireAuthorizedUser } from "@/features/auth/server/require-authorized-user";
import { logPlatformAudit } from "@/features/platform/audit/log-platform-audit";
import { AUDIT_EVENTS } from "@/features/platform/audit/audit-events";
import {
  createDocumentAsset,
  createSecureDownloadUrl,
  createSecureUploadUrl,
  logDocumentAssetAccess,
  softDeleteDocumentAsset,
} from "@/features/platform/storage/repository/document-assets.repository";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export async function requestSecureDocumentUploadAction(input: {
  campusId: string;
  officeId?: string | null;
  entityType: string;
  entityId: string;
  category: string;
  fileName: string;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
  checksumSha256?: string | null;
  title?: string | null;
  description?: string | null;
}) {
  const context = await requireAuthorizedUser();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeFileName = input.fileName.replace(/[^\w.\-]/g, "_");
  const objectPath = `${input.entityType}/${input.entityId}/${timestamp}-${safeFileName}`;
  const upload = await createSecureUploadUrl({ objectPath });
  if (!upload.ok || !upload.signedUrl) {
    return { ok: false, error: upload.error ?? "Failed to create secure upload URL." } as const;
  }

  const created = await createDocumentAsset({
    campusId: input.campusId,
    officeId: input.officeId ?? null,
    entityType: input.entityType,
    entityId: input.entityId,
    category: input.category,
    title: input.title ?? null,
    description: input.description ?? null,
    storageBucket: upload.bucket,
    storagePath: upload.path,
    fileName: input.fileName,
    mimeType: input.mimeType ?? null,
    fileSizeBytes: input.fileSizeBytes ?? null,
    checksumSha256: input.checksumSha256 ?? null,
    uploadedByUserId: context.appUserId,
  });
  if (!created.ok || !created.asset) {
    return { ok: false, error: created.error ?? "Failed to create document metadata." } as const;
  }

  await logPlatformAudit({
    eventType: AUDIT_EVENTS.documentAsset.uploadRequested,
    action: "request_secure_document_upload",
    entityType: "document_assets",
    entityId: created.asset.id,
    campusId: input.campusId,
    metadata: {
      entityType: input.entityType,
      entityId: input.entityId,
      category: input.category,
      fileName: input.fileName,
      storagePath: upload.path,
    },
  });

  return {
    ok: true,
    data: {
      assetId: created.asset.id,
      bucket: upload.bucket,
      storagePath: upload.path,
      signedUploadUrl: upload.signedUrl,
      token: upload.token,
    },
  } as const;
}

export async function getSecureDocumentDownloadUrlAction(input: {
  assetId: string;
  storagePath: string;
  bucket?: string;
  expiresInSeconds?: number;
}): Promise<ActionResult<{ signedUrl: string }>> {
  const context = await requireAuthorizedUser();
  const download = await createSecureDownloadUrl({
    objectPath: input.storagePath,
    bucket: input.bucket,
    expiresInSeconds: input.expiresInSeconds ?? 60,
  });
  if (!download.ok || !download.signedUrl) {
    return { ok: false, error: download.error ?? "Failed to create secure download URL." };
  }
  await logDocumentAssetAccess({
    documentAssetId: input.assetId,
    actorUserId: context.appUserId,
    accessType: "signed_download_url_issued",
  });
  await logPlatformAudit({
    eventType: AUDIT_EVENTS.documentAsset.accessed,
    action: "create_secure_document_download_url",
    entityType: "document_assets",
    entityId: input.assetId,
  });
  return { ok: true, data: { signedUrl: download.signedUrl } };
}

export async function softDeleteDocumentAssetAction(assetId: string): Promise<ActionResult> {
  const context = await requireAuthorizedUser();
  const result = await softDeleteDocumentAsset(assetId, context.appUserId);
  if (!result.ok) return { ok: false, error: result.error ?? "Failed to soft delete document asset." };
  await logPlatformAudit({
    eventType: AUDIT_EVENTS.documentAsset.softDeleted,
    action: "soft_delete_document_asset",
    entityType: "document_assets",
    entityId: assetId,
  });
  return { ok: true, data: undefined };
}

