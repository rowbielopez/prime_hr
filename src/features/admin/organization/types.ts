import type { OfficeTypeValue } from "@/features/admin/organization/schemas/office-form.schema";

export type CampusListItem = {
  id: string;
  code: string;
  name: string;
  shortName: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
};

export type OfficeListItem = {
  id: string;
  campusId: string;
  campusName: string;
  campusSortOrder: number;
  code: string;
  name: string;
  officeType: OfficeTypeValue;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
};

export type CampusOption = {
  id: string;
  name: string;
  code: string;
  shortName: string | null;
  sortOrder: number;
};
