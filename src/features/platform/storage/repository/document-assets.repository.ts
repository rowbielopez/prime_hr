import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { applyAuthorizationScope } from "@/lib/db/scoped-query";
import type { AuthorizationContext } from "@/features/auth/types";
import type { Json } from "@/lib/db/types";
import type { DocumentAsset } from "@/features/platform/storage/types";

const SECURE_DOCS_BUCKET = "primehr-secure-docs";

function mapDocumentAsset(row: {
  id: string;
  campus_id: string;
  office_id: string | null;
  entity_type: string;
  entity_id: string;
  category: string;
  title: string | null;
  description: string | null;
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  checksum_sha256: string | null;
  status: "active" | "deleted" | "quarantined";
  version_no: number;
  parent_asset_id: string | null;
  uploaded_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}): DocumentAsset {
  return {
    id: row.id,
    campusId: row.campus_id,
    officeId: row.office_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    category: row.category,
    title: row.title,
    description: row.description,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    fileSizeBytes: row.file_size_bytes,
    checksumSha256: row.checksum_sha256,
    status: row.status,
    versionNo: row.version_no,
    parentAssetId: row.parent_asset_id,
    uploadedByUserId: row.uploaded_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export async function createDocumentAsset(input: {
  campusId: string;
  officeId?: string | null;
  entityType: string;
  entityId: string;
  category: string;
  title?: string | null;
  description?: string | null;
  storageBucket?: string;
  storagePath: string;
  fileName: string;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
  checksumSha256?: string | null;
  versionNo?: number;
  parentAssetId?: string | null;
  uploadedByUserId?: string | null;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("document_assets")
    .insert({
      campus_id: input.campusId,
      office_id: input.officeId ?? null,
      entity_type: input.entityType,
      entity_id: input.entityId,
      category: input.category,
      title: input.title ?? null,
      description: input.description ?? null,
      storage_bucket: input.storageBucket ?? SECURE_DOCS_BUCKET,
      storage_path: input.storagePath,
      file_name: input.fileName,
      mime_type: input.mimeType ?? null,
      file_size_bytes: input.fileSizeBytes ?? null,
      checksum_sha256: input.checksumSha256 ?? null,
      version_no: input.versionNo ?? 1,
      parent_asset_id: input.parentAssetId ?? null,
      uploaded_by_user_id: input.uploadedByUserId ?? null,
    } as never)
    .select(
      "id, campus_id, office_id, entity_type, entity_id, category, title, description, storage_bucket, storage_path, file_name, mime_type, file_size_bytes, checksum_sha256, status, version_no, parent_asset_id, uploaded_by_user_id, created_at, updated_at, deleted_at"
    )
    .single();
  if (error || !data) return { ok: false, error: error?.message, asset: null as DocumentAsset | null };
  return { ok: true, error: null, asset: mapDocumentAsset(data as never) };
}

export async function listDocumentAssetsByEntity(
  entityType: string,
  entityId: string,
  context?: AuthorizationContext
): Promise<DocumentAsset[]> {
  const supabase = await createSupabaseServerClient();
  const base = supabase
    .from("document_assets")
    .select(
      "id, campus_id, office_id, entity_type, entity_id, category, title, description, storage_bucket, storage_path, file_name, mime_type, file_size_bytes, checksum_sha256, status, version_no, parent_asset_id, uploaded_by_user_id, created_at, updated_at, deleted_at"
    )
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  const { data, error } = await applyAuthorizationScope(base, context);
  if (error) return [];
  return ((data ?? []) as Array<{
    id: string;
    campus_id: string;
    office_id: string | null;
    entity_type: string;
    entity_id: string;
    category: string;
    title: string | null;
    description: string | null;
    storage_bucket: string;
    storage_path: string;
    file_name: string;
    mime_type: string | null;
    file_size_bytes: number | null;
    checksum_sha256: string | null;
    status: "active" | "deleted" | "quarantined";
    version_no: number;
    parent_asset_id: string | null;
    uploaded_by_user_id: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
  }>).map(mapDocumentAsset);
}

export async function softDeleteDocumentAsset(assetId: string, deletedByUserId: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("document_assets")
    .update({
      status: "deleted",
      deleted_at: new Date().toISOString(),
      deleted_by_user_id: deletedByUserId,
    } as never)
    .eq("id", assetId);
  return { ok: !error, error: error?.message };
}

export async function logDocumentAssetAccess(input: {
  documentAssetId: string;
  actorUserId?: string | null;
  accessType: string;
  accessContext?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("document_asset_access_logs").insert({
    document_asset_id: input.documentAssetId,
    actor_user_id: input.actorUserId ?? null,
    access_type: input.accessType,
    access_context: input.accessContext ?? null,
    metadata: (input.metadata ?? {}) as Json,
  } as never);
  return { ok: !error, error: error?.message };
}

export async function createSecureUploadUrl(input: {
  objectPath: string;
  bucket?: string;
}) {
  const admin = createSupabaseAdminClient();
  const bucket = input.bucket ?? SECURE_DOCS_BUCKET;
  const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(input.objectPath);
  return {
    ok: !error,
    error: error?.message,
    bucket,
    signedUrl: data?.signedUrl ?? null,
    token: data?.token ?? null,
    path: input.objectPath,
  };
}

export async function createSecureDownloadUrl(input: {
  objectPath: string;
  expiresInSeconds?: number;
  bucket?: string;
}) {
  const admin = createSupabaseAdminClient();
  const bucket = input.bucket ?? SECURE_DOCS_BUCKET;
  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUrl(input.objectPath, input.expiresInSeconds ?? 60);
  return {
    ok: !error,
    error: error?.message,
    bucket,
    signedUrl: data?.signedUrl ?? null,
  };
}

