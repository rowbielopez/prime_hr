import { StatusBadge } from "@/components/foundation";
import type { EmployeeRequestStatus } from "@/features/requests/types";
import { EMPLOYEE_REQUEST_STATUS_LABELS, EMPLOYEE_REQUEST_STATUS_TONES } from "@/features/requests/types";

type Props = {
    status: EmployeeRequestStatus;
};

export function EmployeeRequestStatusBadge({ status }: Props) {
    return <StatusBadge tone={EMPLOYEE_REQUEST_STATUS_TONES[status]} label={EMPLOYEE_REQUEST_STATUS_LABELS[status]} />;
}
