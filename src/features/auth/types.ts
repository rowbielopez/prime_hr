import type { AppPermission } from "@/lib/rbac/permissions";
import type { AppRole } from "@/lib/constants/roles";

export type AuthProfile = {
  id: string;
  email: string;
  roles: AppRole[];
  campusId: string | null;
  officeId: string | null;
  isActive: boolean;
};

export type AuthorizationContext = {
  authUserId: string;
  appUserId: string;
  email: string;
  roles: AppRole[];
  permissions: AppPermission[];
  campusScopes: string[];
  officeScopes: string[];
  primaryCampusId: string | null;
  primaryOfficeId: string | null;
  isSuperAdmin: boolean;
};

