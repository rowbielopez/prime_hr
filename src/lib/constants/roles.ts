export const APP_ROLES = [
  "super_admin",
  "central_hr_admin",
  "campus_hr_officer",
  "office_unit_head",
  "committee_member",
  "employee",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

