/** Client-safe guards for user management UI (mirrors server authorization rules). */

export function actorCanMutateUserRow(actorIsSuperAdmin: boolean, rowRoleCode: string | null): boolean {
  return actorIsSuperAdmin || rowRoleCode !== "super_admin";
}
