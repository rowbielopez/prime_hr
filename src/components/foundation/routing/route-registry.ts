import type { AppRole } from "@/lib/constants/roles";
import type { AppPermission } from "@/lib/rbac/permissions";

export type AppNavIconKey =
  | "layout-dashboard"
  | "users"
  | "building-2"
  | "shield-check"
  | "file-search"
  | "bar-chart-3"
  | "user-round"
  | "briefcase-business"
  | "line-chart"
  | "graduation-cap"
  | "wallet"
  | "heart-handshake"
  | "settings";

/** Module accent buckets — mirror `--module-*` token names in `globals.css`. */
export type AppModuleColor =
  | "people"
  | "compliance"
  | "recruitment"
  | "learning"
  | "performance"
  | "rewards"
  | "platform";

export type AppRouteDefinition = {
  path: string;
  navGroup?: string;
  navLabel?: string;
  navDescription?: string;
  icon?: AppNavIconKey;
  pageLabel: string;
  pageTitle: string;
  pageSubtitle?: string;
  isComingSoon?: boolean;
  requiredRoles?: AppRole[];
  requiredPermissions?: AppPermission[];
  /** Visual accent bucket used by sidebar/breadcrumbs/page chrome. */
  moduleColor?: AppModuleColor;
  /** Whether this route should appear in the command palette. Defaults true when navLabel exists. */
  commandable?: boolean;
  /** Optional "quick create" target paired with this route (e.g. `/employees/new`). */
  quickCreateHref?: string;
  /** Optional override label for breadcrumb segments. */
  breadcrumbHint?: string;
};

export const APP_ROUTE_DEFINITIONS: AppRouteDefinition[] = [
  {
    path: "/dashboard",
    navGroup: "Workspace",
    navLabel: "Dashboard",
    navDescription: "Overview and operational snapshot",
    icon: "layout-dashboard",
    requiredPermissions: ["dashboard.read"],
    pageLabel: "Dashboard",
    pageTitle: "Dashboard",
    pageSubtitle: "Operational snapshot across HR workflows and PRIME-HR governance.",
  },
  {
    path: "/employees",
    navGroup: "Core HR",
    navLabel: "Employee Records",
    navDescription: "Master profiles and employment data",
    icon: "user-round",
    requiredPermissions: ["employee.records.read"],
    pageLabel: "Employee Records",
    pageTitle: "Employee Records",
    pageSubtitle: "Master employee information and profile history.",
  },
  {
    path: "/recruitment",
    navGroup: "Core HR",
    navLabel: "Recruitment",
    navDescription: "Applicant pipelines and hiring workflows",
    icon: "briefcase-business",
    requiredPermissions: ["recruitment.vacancies.read"],
    pageLabel: "Recruitment",
    pageTitle: "Recruitment",
    pageSubtitle: "Vacancy planning, requisition tracking, and hiring pipeline foundations.",
  },
  {
    path: "/recruitment/vacancies",
    navGroup: "Core HR",
    navLabel: "Vacancy Management",
    navDescription: "Vacancy listings and staffing status",
    icon: "briefcase-business",
    requiredPermissions: ["recruitment.vacancies.read"],
    pageLabel: "Vacancy Management",
    pageTitle: "Vacancy Management",
    pageSubtitle: "Manage vacancies by campus and office with workflow status tracking.",
  },
  {
    path: "/recruitment/applicants",
    navGroup: "Core HR",
    navLabel: "Applicant Tracking",
    navDescription: "Applicant profiles and application records",
    icon: "users",
    requiredPermissions: ["recruitment.applicants.read"],
    pageLabel: "Applicant Tracking",
    pageTitle: "Applicant Tracking",
    pageSubtitle: "Track applicant pipeline and linked vacancy applications.",
  },
  {
    path: "/recruitment/ranking",
    navGroup: "Core HR",
    navLabel: "Ranking Summary",
    navDescription: "Rank applicants by vacancy",
    icon: "bar-chart-3",
    requiredPermissions: ["recruitment.recommendations.read"],
    pageLabel: "Ranking Summary",
    pageTitle: "Ranking Summary",
    pageSubtitle: "View ranking list, remarks, and recommendation status by vacancy.",
  },
  {
    path: "/recruitment/recommendations",
    navGroup: "Core HR",
    navLabel: "Appointment Recommendations",
    navDescription: "Recommendation records and status",
    icon: "file-search",
    requiredPermissions: ["recruitment.recommendations.read"],
    pageLabel: "Appointment Recommendations",
    pageTitle: "Appointment Recommendations",
    pageSubtitle: "Review recommendation details and status progression.",
  },
  {
    path: "/recruitment/recommendations/reports",
    navGroup: "Core HR",
    navLabel: "Recommendation Reports",
    navDescription: "Recommendation status and vacancy analytics",
    icon: "bar-chart-3",
    requiredPermissions: ["recruitment.recommendations.read"],
    pageLabel: "Recommendation Reports",
    pageTitle: "Recommendation Reports",
    pageSubtitle: "Recommendation counts, status mix, and vacancy-level breakdown.",
  },
  {
    path: "/performance",
    navGroup: "Core HR",
    navLabel: "Performance",
    navDescription: "Ratings, KPIs, and evaluations",
    icon: "line-chart",
    requiredPermissions: ["performance.read"],
    pageLabel: "Performance",
    pageTitle: "Performance Management",
    pageSubtitle: "Cycle setup, target tracking, reviews, final ratings, and completion dashboards.",
  },
  {
    path: "/performance/cycles",
    navGroup: "Core HR",
    navLabel: "Performance Cycles",
    navDescription: "Set up and manage appraisal periods",
    icon: "line-chart",
    requiredPermissions: ["performance.read"],
    pageLabel: "Performance Cycles",
    pageTitle: "Performance Cycles",
    pageSubtitle: "Configure cycle windows, deadlines, and scope.",
  },
  {
    path: "/performance/records",
    navGroup: "Core HR",
    navLabel: "Performance Records",
    navDescription: "Create records, assign staff and objectives",
    icon: "line-chart",
    requiredPermissions: ["performance.read"],
    pageLabel: "Performance Records",
    pageTitle: "Performance Records",
    pageSubtitle: "Create and manage performance records, objectives, and remarks.",
  },
  {
    path: "/performance/reviews",
    navGroup: "Core HR",
    navLabel: "Performance Reviews",
    navDescription: "Review and approve performance records",
    icon: "line-chart",
    requiredPermissions: ["performance.review"],
    pageLabel: "Performance Reviews",
    pageTitle: "Performance Reviews",
    pageSubtitle: "Review submitted records and send back revisions or approvals.",
  },
  {
    path: "/performance/my",
    pageLabel: "My Performance",
    pageTitle: "My Performance Records",
    pageSubtitle: "Enter targets, update accomplishments, and submit for review.",
  },
  {
    path: "/performance/dashboard",
    navGroup: "Core HR",
    navLabel: "Performance Dashboard",
    navDescription: "Completion status and cycle analytics",
    icon: "bar-chart-3",
    requiredPermissions: ["performance.dashboard.read"],
    pageLabel: "Performance Dashboard",
    pageTitle: "Performance Completion Dashboard",
    pageSubtitle: "Track cycle participation, review progress, and finalization rates.",
  },
  {
    path: "/performance/finalizations",
    navGroup: "Core HR",
    navLabel: "Performance Finalization",
    navDescription: "Finalize approved ratings",
    icon: "line-chart",
    requiredPermissions: ["performance.finalize"],
    pageLabel: "Performance Finalization",
    pageTitle: "Performance Finalization",
    pageSubtitle: "Compute final scores, map rating bands, and finalize records.",
  },
  {
    path: "/performance/summary",
    navGroup: "Core HR",
    navLabel: "Final Rating Summary",
    navDescription: "View finalized rating outcomes",
    icon: "bar-chart-3",
    requiredPermissions: ["performance.read"],
    pageLabel: "Final Rating Summary",
    pageTitle: "Final Rating Summary",
    pageSubtitle: "Finalized performance ratings by employee and cycle.",
  },
  {
    path: "/performance/rating-bands",
    navGroup: "Core HR",
    navLabel: "Performance Rating Bands",
    navDescription: "Configure final rating thresholds",
    icon: "settings",
    requiredPermissions: ["performance.finalize"],
    pageLabel: "Performance Rating Bands",
    pageTitle: "Performance Rating Band Configuration",
    pageSubtitle: "Maintain score thresholds used for final performance rating bands.",
  },
  {
    path: "/rewards",
    navGroup: "Core HR",
    navLabel: "Rewards & Recognition",
    navDescription: "Awards catalog, nominations, and approvals",
    icon: "heart-handshake",
    requiredPermissions: ["rewards.read"],
    pageLabel: "Rewards",
    pageTitle: "Rewards & Recognition",
    pageSubtitle: "Manage awards catalog, nominations, reviews, and awardee history.",
  },
  {
    path: "/rewards/awards",
    navGroup: "Core HR",
    navLabel: "Awards Catalog",
    navDescription: "Configure and maintain awards",
    icon: "heart-handshake",
    requiredPermissions: ["rewards.catalog.read"],
    pageLabel: "Awards Catalog",
    pageTitle: "Awards Catalog",
    pageSubtitle: "Create and maintain award definitions, windows, and scope.",
  },
  {
    path: "/rewards/nominations",
    navGroup: "Core HR",
    navLabel: "Nominations",
    navDescription: "Submit and track nominations",
    icon: "heart-handshake",
    requiredPermissions: ["rewards.nomination.read"],
    pageLabel: "Nominations",
    pageTitle: "Nominations",
    pageSubtitle: "Submit nominations and monitor workflow status.",
  },
  {
    path: "/rewards/reviews",
    navGroup: "Core HR",
    navLabel: "Nomination Reviews",
    navDescription: "Review and score nominations",
    icon: "heart-handshake",
    requiredPermissions: ["rewards.nomination.review"],
    pageLabel: "Nomination Reviews",
    pageTitle: "Nomination Reviews",
    pageSubtitle: "Review nominations, apply remarks/scoring, and recommend outcomes.",
  },
  {
    path: "/rewards/approvals",
    navGroup: "Core HR",
    navLabel: "Nomination Approvals",
    navDescription: "Final approval decisions",
    icon: "heart-handshake",
    requiredPermissions: ["rewards.nomination.approve"],
    pageLabel: "Nomination Approvals",
    pageTitle: "Nomination Approvals",
    pageSubtitle: "Approve or reject recommended nominations.",
  },
  {
    path: "/rewards/history",
    navGroup: "Core HR",
    navLabel: "Awardee History",
    navDescription: "View awardee records",
    icon: "heart-handshake",
    requiredPermissions: ["rewards.history.read"],
    pageLabel: "Awardee History",
    pageTitle: "Awardee History",
    pageSubtitle: "Track awarded employees by award, campus, and period.",
  },
  {
    path: "/rewards/reports",
    navGroup: "Core HR",
    navLabel: "Rewards Reports",
    navDescription: "Turnaround and award distribution analytics",
    icon: "bar-chart-3",
    requiredPermissions: ["rewards.reports.read"],
    pageLabel: "Rewards Reports",
    pageTitle: "Rewards & Recognition Reports",
    pageSubtitle: "Review approval turnaround and awardee distribution with period filters.",
  },
  {
    path: "/learning",
    navGroup: "Core HR",
    navLabel: "Learning & Development",
    navDescription: "Training catalog, plans, sessions, and history",
    icon: "graduation-cap",
    requiredPermissions: ["learning.access"],
    pageLabel: "Learning",
    pageTitle: "Learning & Development",
    pageSubtitle: "Training management, annual plans, attendance, and employee learning history.",
  },
  {
    path: "/learning/programs",
    navGroup: "Core HR",
    navLabel: "Training Catalog",
    navDescription: "Course definitions and modalities",
    icon: "graduation-cap",
    requiredPermissions: ["learning.read"],
    pageLabel: "Training Catalog",
    pageTitle: "Training Catalog",
    pageSubtitle: "Define reusable training programs for sessions and plans.",
  },
  {
    path: "/learning/plans",
    navGroup: "Core HR",
    navLabel: "Annual Training Plans",
    navDescription: "Campus plans by year and quarter",
    icon: "graduation-cap",
    requiredPermissions: ["learning.read"],
    pageLabel: "Annual Training Plans",
    pageTitle: "Annual Training Plans",
    pageSubtitle: "Plan priority offerings by campus and fiscal alignment.",
  },
  {
    path: "/learning/sessions",
    navGroup: "Core HR",
    navLabel: "Training Sessions",
    navDescription: "Scheduled runs, venue, and capacity",
    icon: "graduation-cap",
    requiredPermissions: ["learning.read"],
    pageLabel: "Training Sessions",
    pageTitle: "Training Sessions",
    pageSubtitle: "Schedule sessions, assign participants, and track attendance.",
  },
  {
    path: "/learning/requests",
    navGroup: "Core HR",
    navLabel: "Training Requests",
    navDescription: "Review and approve employee requests",
    icon: "graduation-cap",
    requiredPermissions: ["learning.read"],
    pageLabel: "Training Requests",
    pageTitle: "Training Requests",
    pageSubtitle: "Process training needs submitted by employees.",
  },
  {
    path: "/learning/requests/nominate",
    pageLabel: "Nominate training",
    pageTitle: "Nominate training",
    pageSubtitle: "Assign training to an employee for approval.",
  },
  {
    path: "/learning/reports",
    navGroup: "Core HR",
    navLabel: "L&D Reports",
    navDescription: "Completion and coverage summaries",
    icon: "bar-chart-3",
    requiredPermissions: ["learning.reports.read"],
    pageLabel: "L&D Reports",
    pageTitle: "Learning & Development Reports",
    pageSubtitle: "Completion rates, session throughput, and request outcomes.",
  },
  {
    path: "/learning/reports/operational",
    pageLabel: "Operational reports",
    pageTitle: "Operational L&D Reports",
    pageSubtitle: "Live pipeline, utilization, and coverage by campus.",
  },
  {
    path: "/learning/reports/analytics",
    pageLabel: "Analytics",
    pageTitle: "L&D Analytics",
    pageSubtitle: "Daily and monthly trends for delivery and outcomes.",
  },
  {
    path: "/learning/reports/requests",
    pageLabel: "Request analytics",
    pageTitle: "Training Request Analytics",
    pageSubtitle: "Demand mix and approval status by campus and request kind.",
  },
  {
    path: "/learning/competencies",
    navGroup: "Core HR",
    navLabel: "Competencies",
    navDescription: "Competency catalog and assessments",
    icon: "graduation-cap",
    requiredPermissions: ["learning.competencies.read"],
    pageLabel: "Competencies",
    pageTitle: "Competency Management",
    pageSubtitle: "Maintain competency catalog, mappings, and assessments.",
  },
  {
    path: "/learning/competencies/assessments",
    pageLabel: "Competency assessments",
    pageTitle: "Competency Assessments",
    pageSubtitle: "Track employee competency evaluations and gaps.",
  },
  {
    path: "/learning/my-requests",
    pageLabel: "My Training Requests",
    pageTitle: "My Training Requests",
    pageSubtitle: "Submit and track your training requests.",
  },
  {
    path: "/learning/my-training",
    pageLabel: "My Training History",
    pageTitle: "My Training History",
    pageSubtitle: "Attendance and completion across sessions.",
  },
  {
    path: "/payroll",
    navGroup: "Core HR",
    navLabel: "Payroll & Compensation",
    navDescription: "Salary, disbursement, and adjustments",
    icon: "wallet",
    isComingSoon: true,
    requiredRoles: ["super_admin", "central_hr_admin"],
    pageLabel: "Payroll",
    pageTitle: "Payroll & Compensation",
  },
  {
    path: "/benefits",
    navGroup: "Core HR",
    navLabel: "Benefits & Leave",
    navDescription: "Benefits enrollment and leave workflows",
    icon: "heart-handshake",
    isComingSoon: true,
    requiredRoles: ["super_admin", "central_hr_admin", "campus_hr_officer", "employee"],
    pageLabel: "Benefits",
    pageTitle: "Benefits & Leave",
  },
  {
    path: "/compliance",
    pageLabel: "Compliance",
    pageTitle: "Compliance",
    pageSubtitle: "Compliance operations and evidence governance.",
  },
  {
    path: "/compliance/evidence",
    navGroup: "Governance",
    navLabel: "Compliance Evidence",
    navDescription: "Evidence tracking and review workflow",
    icon: "shield-check",
    requiredPermissions: ["compliance.evidence.read"],
    pageLabel: "Evidence",
    pageTitle: "Compliance Evidence",
    pageSubtitle: "Track, review, and verify evidence submissions.",
  },
  {
    path: "/compliance/dashboard",
    navGroup: "Governance",
    navLabel: "Compliance Dashboard",
    navDescription: "Compliance status, gaps, and action metrics",
    icon: "bar-chart-3",
    requiredPermissions: ["compliance.dashboard.read"],
    pageLabel: "Compliance Dashboard",
    pageTitle: "Compliance Dashboard",
    pageSubtitle: "Summary of compliance performance, gaps, and overdue actions.",
  },
  {
    path: "/audit",
    pageLabel: "Audit",
    pageTitle: "Audit",
    pageSubtitle: "Audit and monitoring workspace.",
  },
  {
    path: "/audit/logs",
    navGroup: "Governance",
    navLabel: "Audit Logs",
    navDescription: "Security and activity monitoring",
    icon: "file-search",
    isComingSoon: true,
    requiredPermissions: ["audit.logs.read"],
    pageLabel: "Audit Logs",
    pageTitle: "Audit Logs",
    pageSubtitle: "Review security-sensitive and operational events.",
  },
  {
    path: "/reports",
    navGroup: "Governance",
    navLabel: "Reports & Analytics",
    navDescription: "Operational and executive reporting",
    icon: "bar-chart-3",
    isComingSoon: true,
    requiredRoles: ["super_admin", "central_hr_admin", "campus_hr_officer"],
    pageLabel: "Reports",
    pageTitle: "Reports & Analytics",
    pageSubtitle: "Operational and executive reporting dashboards.",
  },
  {
    path: "/admin",
    pageLabel: "Administration",
    pageTitle: "Administration",
    pageSubtitle: "System administration and access control.",
  },
  {
    path: "/admin/campuses",
    navGroup: "Administration",
    navLabel: "Campus Management",
    navDescription: "Campus records and status control",
    icon: "building-2",
    requiredPermissions: ["admin.organization.read"],
    pageLabel: "Campus Management",
    pageTitle: "Campus Management",
    pageSubtitle: "Create, update, and manage campus records.",
  },
  {
    path: "/admin/offices",
    navGroup: "Administration",
    navLabel: "Office Management",
    navDescription: "Office records and campus assignment",
    icon: "building-2",
    requiredPermissions: ["admin.organization.read"],
    pageLabel: "Office Management",
    pageTitle: "Office Management",
    pageSubtitle: "Create, update, and assign offices by campus.",
  },
  {
    path: "/admin/users",
    navGroup: "Administration",
    navLabel: "User Administration",
    navDescription: "Role, scope, and account management",
    icon: "users",
    requiredPermissions: ["admin.users.read"],
    pageLabel: "User Administration",
    pageTitle: "User Administration",
    pageSubtitle: "Manage users, roles, and access scope.",
  },
  {
    path: "/admin/compliance-indicators",
    navGroup: "Administration",
    navLabel: "Compliance Indicators",
    navDescription: "Manage PRIME-HR indicators catalog",
    icon: "shield-check",
    requiredPermissions: ["compliance.indicators.write"],
    pageLabel: "Compliance Indicators",
    pageTitle: "Compliance Indicators",
    pageSubtitle: "Create and maintain compliance indicators used by evidence workflows.",
  },
  {
    path: "/settings",
    navGroup: "Administration",
    navLabel: "System Settings",
    navDescription: "Configuration and policy controls",
    icon: "settings",
    isComingSoon: true,
    requiredRoles: ["super_admin", "central_hr_admin"],
    pageLabel: "Settings",
    pageTitle: "System Settings",
    pageSubtitle: "Global application and policy configuration.",
  },
];

export function normalizeRoutePath(pathname: string) {
  if (!pathname) return "/dashboard";
  const pathOnly = pathname.split("?")[0].split("#")[0];
  const withLeadingSlash = pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`;
  if (withLeadingSlash.length > 1 && withLeadingSlash.endsWith("/")) {
    return withLeadingSlash.slice(0, -1);
  }
  return withLeadingSlash;
}

export const APP_ROUTE_BY_PATH = new Map(APP_ROUTE_DEFINITIONS.map((route) => [route.path, route]));

