export type UserListItem = {
  id: string;
  email: string;
  fullName: string;
  roleId: string | null;
  roleCode: string | null;
  roleName: string | null;
  roleScopeType: "global" | "scoped" | null;
  campusName: string | null;
  campusId: string | null;
  officeName: string | null;
  officeId: string | null;
  isActive: boolean;
  status: "active" | "inactive" | "suspended";
  lastLoginAt: string | null;
};

export type RoleOption = {
  id: string;
  code: string;
  name: string;
  scopeType: "global" | "scoped";
};

export type CampusOption = {
  id: string;
  name: string;
  code: string;
  shortName: string | null;
  sortOrder: number;
};

export type OfficeOption = {
  id: string;
  campusId: string;
  name: string;
  code: string;
};

