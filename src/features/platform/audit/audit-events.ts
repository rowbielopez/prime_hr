export const AUDIT_EVENTS = {
  documentAsset: {
    uploadRequested: "platform.document_asset.upload_requested",
    metadataCreated: "platform.document_asset.metadata_created",
    metadataUpdated: "platform.document_asset.metadata_updated",
    softDeleted: "platform.document_asset.soft_deleted",
    accessed: "platform.document_asset.accessed",
  },
  notification: {
    created: "platform.notification.created",
    markedRead: "platform.notification.marked_read",
    markedArchived: "platform.notification.marked_archived",
  },
} as const;

export type AuditEventType = string;

