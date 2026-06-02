export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

/** Declared outside `Database` so `Insert`/`Update` avoid circular `Database["..."]["Row"]` refs (PostgREST client infers `never` otherwise). */
type CampusesRow = {
  id: string;
  code: string;
  name: string;
  short_name: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type OfficesRow = {
  id: string;
  campus_id: string;
  code: string;
  name: string;
  sort_order: number;
  office_type: "academic" | "administrative" | "student_services" | "other";
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type EmployeeRequestType =
  | "profile_correction"
  | "employment_detail_correction"
  | "pds_update"
  | "service_record_correction"
  | "document_request"
  | "certificate_request"
  | "leave_related_request"
  | "account_login_concern"
  | "other_hr_request";

type EmployeeRequestStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "returned_for_revision"
  | "approved"
  | "rejected"
  | "completed"
  | "cancelled";

export type Database = {
  public: {
    Tables: {
      app_users: {
        Row: {
          id: string;
          auth_user_id: string;
          email: string;
          first_name: string | null;
          middle_name: string | null;
          last_name: string | null;
          suffix: string | null;
          status: "active" | "inactive" | "suspended";
          primary_campus_id: string | null;
          primary_office_id: string | null;
          employee_id: string | null;
          is_active: boolean;
          last_login_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["app_users"]["Row"]> & {
          auth_user_id: string;
          email: string;
        };
        Update: Partial<Database["public"]["Tables"]["app_users"]["Row"]>;
      };
      campuses: {
        Row: CampusesRow;
        Insert: Partial<CampusesRow>;
        Update: Partial<CampusesRow>;
        Relationships: [];
      };
      offices: {
        Row: OfficesRow;
        Insert: Partial<OfficesRow>;
        Update: Partial<OfficesRow>;
        Relationships: [
          {
            foreignKeyName: "offices_campus_id_fkey";
            columns: ["campus_id"];
            isOneToOne: false;
            referencedRelation: "campuses";
            referencedColumns: ["id"];
          },
        ];
      };
      employees: {
        Row: {
          id: string;
          employee_no: string;
          first_name: string;
          middle_name: string | null;
          last_name: string;
          suffix: string | null;
          birth_date: string | null;
          sex: string | null;
          campus_id: string;
          office_id: string | null;
          email: string | null;
          mobile_no: string | null;
          position_title: string | null;
          plantilla_item_no: string | null;
          employment_status: "active" | "on_leave" | "separated" | "retired";
          date_hired: string | null;
          civil_status: string | null;
          tin: string | null;
          gsis_no: string | null;
          philhealth_no: string | null;
          pagibig_no: string | null;
          employment_type: string | null;
          date_separated: string | null;
          separation_reason: string | null;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          present_address: string | null;
          permanent_address: string | null;
          external_ref: string | null;
          created_by_user_id: string | null;
          updated_by_user_id: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["employees"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["employees"]["Row"]>;
      };
      employee_documents: {
        Row: {
          id: string;
          employee_id: string;
          campus_id: string;
          document_type: string;
          title: string;
          storage_bucket: string;
          storage_path: string;
          file_name: string;
          status: "draft" | "submitted" | "verified" | "rejected" | "archived";
          created_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["employee_documents"]["Row"]> & {
          employee_id: string;
          document_type: string;
          title: string;
          storage_bucket: string;
          storage_path: string;
          file_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["employee_documents"]["Row"]>;
      };
      employee_requests: {
        Row: {
          id: string;
          employee_id: string;
          campus_id: string;
          office_id: string | null;
          request_type: EmployeeRequestType;
          subject: string;
          description: string;
          field_to_correct: string | null;
          current_value: string | null;
          requested_value: string | null;
          related_module: string | null;
          related_record_id: string | null;
          status: EmployeeRequestStatus;
          hr_remarks: string | null;
          submitted_at: string | null;
          reviewed_at: string | null;
          reviewed_by_user_id: string | null;
          completed_at: string | null;
          internal_notes: string | null;
          cancelled_at: string | null;
          created_by_user_id: string | null;
          updated_by_user_id: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["employee_requests"]["Row"]> & {
          employee_id: string;
          campus_id: string;
          request_type: EmployeeRequestType;
          subject: string;
          description: string;
        };
        Update: Partial<Database["public"]["Tables"]["employee_requests"]["Row"]>;
      };
      employee_request_status_history: {
        Row: {
          id: string;
          request_id: string;
          employee_id: string;
          campus_id: string;
          office_id: string | null;
          from_status: EmployeeRequestStatus | null;
          to_status: EmployeeRequestStatus;
          remarks: string | null;
          internal_notes: string | null;
          actor_user_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["employee_request_status_history"]["Row"]> & {
          request_id: string;
          employee_id: string;
          campus_id: string;
          to_status: EmployeeRequestStatus;
        };
        Update: Partial<Database["public"]["Tables"]["employee_request_status_history"]["Row"]>;
      };
      recruitment_vacancies: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          qualification_notes: string | null;
          plantilla_item_no: string | null;
          campus_id: string;
          office_id: string | null;
          employment_type: string | null;
          item_count: number;
          status: "draft" | "open" | "for_review" | "filled" | "closed" | "cancelled";
          posted_at: string | null;
          closing_at: string | null;
          remarks: string | null;
          public_slug: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["recruitment_vacancies"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["recruitment_vacancies"]["Row"]>;
      };
      recruitment_applicants: {
        Row: {
          id: string;
          first_name: string;
          middle_name: string | null;
          last_name: string;
          suffix: string | null;
          email: string | null;
          mobile_no: string | null;
          campus_id: string;
          office_id: string | null;
          status: "new" | "screening" | "shortlisted" | "hired" | "rejected" | "withdrawn";
          notes: string | null;
          source: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["recruitment_applicants"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["recruitment_applicants"]["Row"]>;
      };
      recruitment_applications: {
        Row: {
          id: string;
          applicant_id: string;
          vacancy_id: string;
          campus_id: string;
          office_id: string | null;
          status: "submitted" | "screening" | "interview" | "for_offer" | "hired" | "rejected" | "withdrawn";
          applied_at: string | null;
          remarks: string | null;
          reference_no: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["recruitment_applications"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["recruitment_applications"]["Row"]>;
      };
      recruitment_screening_results: {
        Row: {
          id: string;
          applicant_id: string;
          application_id: string | null;
          result: "pass" | "fail" | "hold";
          remarks: string | null;
          screened_at: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["recruitment_screening_results"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["recruitment_screening_results"]["Row"]>;
      };
      recruitment_interviews: {
        Row: {
          id: string;
          applicant_id: string;
          application_id: string | null;
          scheduled_at: string;
          interview_mode: "in_person" | "online" | "phone";
          panel_remarks: string | null;
          outcome: "pending" | "pass" | "fail" | "no_show";
          decided_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["recruitment_interviews"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["recruitment_interviews"]["Row"]>;
      };
      recruitment_application_status_history: {
        Row: {
          id: string;
          application_id: string;
          from_status: "submitted" | "screening" | "interview" | "for_offer" | "hired" | "rejected" | "withdrawn" | null;
          to_status: "submitted" | "screening" | "interview" | "for_offer" | "hired" | "rejected" | "withdrawn";
          remarks: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["recruitment_application_status_history"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["recruitment_application_status_history"]["Row"]>;
      };
      recruitment_ranking_entries: {
        Row: {
          id: string;
          vacancy_id: string;
          applicant_id: string;
          campus_id: string;
          office_id: string | null;
          rank_no: number;
          score: number | null;
          remarks: string | null;
          recommendation_status: "draft" | "for_review" | "endorsed" | "approved" | "rejected";
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["recruitment_ranking_entries"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["recruitment_ranking_entries"]["Row"]>;
      };
      recruitment_appointment_recommendations: {
        Row: {
          id: string;
          vacancy_id: string;
          applicant_id: string;
          campus_id: string;
          office_id: string | null;
          status: "draft" | "for_review" | "endorsed" | "approved" | "rejected";
          remarks: string | null;
          justification: string | null;
          decided_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["recruitment_appointment_recommendations"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["recruitment_appointment_recommendations"]["Row"]>;
      };
      recruitment_recommendation_status_history: {
        Row: {
          id: string;
          recommendation_id: string;
          from_status: "draft" | "for_review" | "endorsed" | "approved" | "rejected" | null;
          to_status: "draft" | "for_review" | "endorsed" | "approved" | "rejected";
          remarks: string | null;
          changed_by_user_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["recruitment_recommendation_status_history"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["recruitment_recommendation_status_history"]["Row"]>;
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role_id: string;
          campus_id: string | null;
          is_active: boolean;
          effective_from: string | null;
          effective_to: string | null;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["user_roles"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["user_roles"]["Row"]>;
      };
      roles: {
        Row: {
          id: string;
          code: string;
          name: string;
        };
        Insert: Partial<Database["public"]["Tables"]["roles"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["roles"]["Row"]>;
      };
      user_role_offices: {
        Row: {
          id: string;
          user_role_id: string;
          office_id: string;
        };
        Insert: Partial<Database["public"]["Tables"]["user_role_offices"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["user_role_offices"]["Row"]>;
      };
      audit_logs: {
        Row: {
          id: number;
          event_type: string;
          action: string;
          actor_user_id: string | null;
          campus_id: string | null;
          entity_type: string;
          entity_id: string | null;
          entity_uuid: string | null;
          metadata: Json;
        };
        Insert: Partial<Database["public"]["Tables"]["audit_logs"]["Row"]> & {
          event_type: string;
          action: string;
          entity_type: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Row"]>;
      };
    };
    Views: {
      public_vacancies: {
        Row: {
          public_slug: string;
          title: string;
          description: string | null;
          qualification_notes: string | null;
          plantilla_item_no: string | null;
          employment_type: string | null;
          item_count: number;
          posted_at: string | null;
          closing_at: string | null;
          updated_at: string;
          campus_name: string;
          office_name: string | null;
        };
      };
    };
    Functions: {
      apply_compliance_evidence_status_change: {
        Args: {
          p_evidence_id: string;
          p_to_status: "draft" | "submitted" | "approved" | "rejected";
          p_remarks: string;
        };
        Returns: null;
      };
      apply_user_management_bundle: {
        Args: {
          p_target_user_id: string;
          p_is_active: boolean;
          p_status: "active" | "inactive" | "suspended";
          p_primary_campus_id: string | null;
          p_primary_office_id: string | null;
          p_role_id: string;
          p_role_campus_id: string | null;
          p_office_id: string | null;
        };
        Returns: null;
      };
    };
    Enums: {
      employee_request_type: EmployeeRequestType;
      employee_request_status: EmployeeRequestStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};

