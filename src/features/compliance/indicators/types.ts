export type PrimeAreaOption = {
  id: string;
  code: string;
  name: string;
};

export type ComplianceIndicatorAdminItem = {
  id: string;
  areaId: string;
  areaCode: string;
  areaName: string;
  code: string;
  title: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
};
