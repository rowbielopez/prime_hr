export type DocumentAssetStatus = "active" | "deleted" | "quarantined";

export type DocumentAsset = {
  id: string;
  campusId: string;
  officeId: string | null;
  entityType: string;
  entityId: string;
  category: string;
  title: string | null;
  description: string | null;
  storageBucket: string;
  storagePath: string;
  fileName: string;
  mimeType: string | null;
  fileSizeBytes: number | null;
  checksumSha256: string | null;
  status: DocumentAssetStatus;
  versionNo: number;
  parentAssetId: string | null;
  uploadedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

