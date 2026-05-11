# CSU PRIME-HR UI Foundation

## Design System Approach

- **Visual direction:** minimalist admin UI, neutral base surfaces, maroon primary accent, low visual noise.
- **Token-driven styling:** rely on existing semantic tokens (`--primary`, `--muted`, `--border`, `--ring`) so brand tuning happens in one place.
- **Composable primitives first:** use `shadcn/ui` building blocks (`card`, `table`, `dialog`, `badge`, `input`, `sheet`) and wrap with reusable PRIME-HR components.
- **Desktop-first responsive behavior:** persistent sidebar on desktop, sheet-based mobile navigation, fluid content widths.
- **Accessibility defaults:** semantic landmarks (`header`, `nav`, `main`), visible focus rings, proper labels, and readable text contrast.
- **Business-module readiness:** keep business logic out of foundation components; expose props/slots for feature-level composition.

## Component Plan

### Layout and Navigation
- `foundation/layout/app-shell.tsx`
- `foundation/layout/sidebar-nav.tsx`
- `foundation/layout/top-header.tsx`
- `foundation/layout/build-app-nav.ts`

### Page Structure
- `foundation/page/page-header.tsx`
- `foundation/page/section-header.tsx`

### Dashboard and Data Display
- `foundation/dashboard/dashboard-metric-card.tsx`
- `foundation/data/data-table-wrapper.tsx`
- `foundation/data/search-filter-bar.tsx`

### Feedback and State Components
- `foundation/feedback/status-badge.tsx`
- `foundation/feedback/empty-state.tsx`
- `foundation/feedback/loading-skeletons.tsx`

### Form and Interaction Patterns
- `foundation/forms/form-layout.tsx`
- `foundation/forms/dialog-patterns.tsx`
- `foundation/forms/file-uploader.tsx`

### Exports
- `foundation/index.ts` to keep imports clean and consistent for business modules.

## Scaffolding Notes

- Import `AppShell` from `foundation/layout/app-shell` (not a separate shared re-export).
- Dashboard page demonstrates the new foundation components as a reference implementation.
- New `ui/skeleton.tsx` added for loading-state consistency.

