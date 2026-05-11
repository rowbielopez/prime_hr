import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/db/types";

async function getActorAppUserId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("app_users")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

export async function writeAuditLog(input: {
  eventType: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  campusId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const admin = createSupabaseAdminClient();
  const actorUserId = await getActorAppUserId();
  const { error } = await admin.from("audit_logs").insert({
    event_type: input.eventType,
    action: input.action,
    actor_user_id: actorUserId,
    campus_id: input.campusId ?? null,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    metadata: (input.metadata ?? {}) as Json,
  } as never);
  if (error) {
    throw new Error(error.message);
  }
}
