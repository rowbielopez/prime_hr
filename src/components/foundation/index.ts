export { AppShell } from "@/components/foundation/layout/app-shell";
export { TopHeader } from "@/components/foundation/layout/top-header";
export { SidebarNav } from "@/components/foundation/layout/sidebar-nav";
export { CommandPalette } from "@/components/foundation/command/command-palette";
export { MotionPage, MotionPanel, StaggerContainer, StaggerItem } from "@/components/foundation/motion/motion-primitives";
export { ThemeProvider } from "@/components/foundation/theme/theme-provider";
export { ThemeToggle } from "@/components/foundation/theme/theme-toggle";

export { PageHeader } from "@/components/foundation/page/page-header";
export type { PageHeaderBreadcrumbItem } from "@/components/foundation/page/page-header";
export { buildPageBreadcrumb } from "@/components/foundation/page/breadcrumbs";
export { getPageMeta } from "@/components/foundation/page/breadcrumbs";
export type { PageMeta } from "@/components/foundation/page/breadcrumbs";
export { Breadcrumbs } from "@/components/foundation/page/breadcrumbs-component";
export type { BreadcrumbsProps } from "@/components/foundation/page/breadcrumbs-component";
export { SectionHeader } from "@/components/foundation/page/section-header";

export { useLocalStorage } from "@/components/foundation/hooks/use-local-storage";

export { DashboardMetricCard } from "@/components/foundation/dashboard/dashboard-metric-card";

export { DataTableWrapper } from "@/components/foundation/data/data-table-wrapper";
export { SearchFilterBar } from "@/components/foundation/data/search-filter-bar";
export {
  FilterSelect,
  StatusFilterControls,
  ClearFiltersButton,
} from "@/components/foundation/data/filter-controls";
export type { FilterOption } from "@/components/foundation/data/filter-controls";
export { AdminDataTable, AdminStatusChip } from "@/components/foundation/data/admin-data-table";
export { createAdminColumns, createRowActions } from "@/components/foundation/data/admin-data-table.helpers";
export type { AdminTableColumn, AdminRowAction } from "@/components/foundation/data/admin-data-table.helpers";
export { useAdminTableState } from "@/components/foundation/data/use-admin-table-state";

export { StatusBadge } from "@/components/foundation/feedback/status-badge";
export { EmptyState } from "@/components/foundation/feedback/empty-state";
export { DashboardCardsSkeleton, TableSkeleton, FormSkeleton } from "@/components/foundation/feedback/loading-skeletons";
export { InlineAlert } from "@/components/foundation/feedback/inline-alert";
export type { InlineAlertProps, InlineAlertTone } from "@/components/foundation/feedback/inline-alert";
export { ErrorState } from "@/components/foundation/feedback/error-state";
export type { ErrorStateProps } from "@/components/foundation/feedback/error-state";
export { SuccessState } from "@/components/foundation/feedback/success-state";
export type { SuccessStateProps } from "@/components/foundation/feedback/success-state";

export { FormLayout, FormField, FormGrid } from "@/components/foundation/forms/form-layout";
export { StandardDialog } from "@/components/foundation/forms/dialog-patterns";
export { FileUploader } from "@/components/foundation/forms/file-uploader";
export {
  FormControl,
  FormText,
  FormTextarea,
  FormSelect,
} from "@/components/foundation/forms/controls";
export type {
  FormControlProps,
  FormTextProps,
  FormTextareaProps,
  FormSelectOption,
  FormSelectProps,
} from "@/components/foundation/forms/controls";
export { Stepper } from "@/components/foundation/forms/stepper";
export type { StepperProps, StepperStep } from "@/components/foundation/forms/stepper";
export { DrawerForm } from "@/components/foundation/forms/drawer-form";
export type { DrawerFormProps } from "@/components/foundation/forms/drawer-form";
export { AutosaveIndicator } from "@/components/foundation/forms/autosave-indicator";
export type {
  AutosaveIndicatorProps,
  AutosaveStatus,
} from "@/components/foundation/forms/autosave-indicator";
export { ConfirmDialog } from "@/components/foundation/forms/confirm-dialog";
export type {
  ConfirmDialogProps,
  ConfirmDialogVariant,
} from "@/components/foundation/forms/confirm-dialog";

export { showToast } from "@/components/foundation/feedback/toast";

export { StickyPageHeader } from "@/components/foundation/page/sticky-page-header";
export type { StickyPageHeaderProps } from "@/components/foundation/page/sticky-page-header";
export { PageTabs } from "@/components/foundation/page/page-tabs";
export type { PageTabsProps, PageTabItem } from "@/components/foundation/page/page-tabs";
export { InspectorLayout } from "@/components/foundation/page/inspector-layout";
export type { InspectorLayoutProps } from "@/components/foundation/page/inspector-layout";

export { ChartContainer } from "@/components/foundation/dashboard/chart-container";
export type { ChartContainerProps } from "@/components/foundation/dashboard/chart-container";
export { Sparkline } from "@/components/foundation/dashboard/sparkline";
export type { SparklineProps } from "@/components/foundation/dashboard/sparkline";
export { AnimatedMetricCard } from "@/components/foundation/dashboard/animated-metric-card";
export type { AnimatedMetricCardProps } from "@/components/foundation/dashboard/animated-metric-card";
export { ActivityFeed } from "@/components/foundation/dashboard/activity-feed";
export type { ActivityFeedItem, ActivityFeedProps } from "@/components/foundation/dashboard/activity-feed";
export { ProgressRing } from "@/components/foundation/dashboard/progress-ring";
export type { ProgressRingProps } from "@/components/foundation/dashboard/progress-ring";


