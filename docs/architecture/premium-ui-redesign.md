# PRIME-HR Premium UI Redesign Foundation

This document is the implementation contract for the PRIME-HR redesign. It keeps the platform premium, modern, and alive while preserving enterprise usability, RBAC constraints, accessibility, and the current server-first architecture.

## Product Direction

- Product type: data-heavy enterprise HRIS and PRIME-HRM governance platform for Cagayan State University.
- Target users: HR administrators, campus/office administrators, hiring managers, reviewers, committee members, and employees.
- Desired feel: Apple-level restraint, Linear-like speed, Stripe-style data clarity, Notion-like composability, and modern AI-native command surfaces.
- Non-goal: a generic admin dashboard, marketing landing page, decorative glass demo, or oversized card layout.

## Visual System

- Neutral surfaces lead the interface. Maroon is an accent and brand signal, not a dominant background.
- Gold is reserved for rare emphasis such as readiness, recognition, or high-value insights.
- Glass surfaces are used for shell, sticky headers, overlays, command palette, and drawers where layering improves orientation.
- Work surfaces for tables and forms stay crisp, readable, and calm.
- Typography uses Geist with clear hierarchy, tabular figures for metrics, and no negative tracking.
- Minimum body text target is 16px on mobile. Dense table text can be smaller only when surrounding affordances remain accessible.

## Motion System

- Use Framer Motion through shared foundation primitives only.
- Common timings: 150ms for fast feedback, 220ms for standard transitions, 320ms for larger panels.
- Exits should be faster than entrances.
- Motion must communicate state, continuity, hierarchy, or feedback. Decorative-only motion is avoided.
- Respect `prefers-reduced-motion` in every reusable primitive.
- Avoid animating expensive layout properties in tables or large lists.

## Shell Pattern

- The protected app shell remains a client component receiving RBAC-filtered navigation from the server layout.
- Desktop navigation supports a premium collapsible sidebar.
- Mobile navigation uses the existing sheet pattern with better glass and spacing.
- The top header owns contextual title/subtitle, global search/command entry, theme switching, notifications, and page actions.
- Navigation metadata should eventually drive breadcrumbs, command entries, module accents, and quick actions.

## Data Workbench Pattern

- Tables should feel like Airtable + Linear + Stripe: searchable, filterable, keyboard-friendly, and scannable.
- Required states: loading skeleton, empty state, error state, filtered-empty state, row hover/focus, pagination, and mobile fallback.
- Near-term foundation: toolbar, density affordance, sticky header, better search/filter grouping, bulk action slots.
- Long-term option: `@tanstack/react-table` plus virtualization for large datasets.

## Form Pattern

- Forms use visible labels, inline hints, inline validation, progressive disclosure, and section grouping.
- Use drawers for contextual create/edit flows when the user needs to preserve list context.
- Use dialogs for focused confirmations and short forms.
- Uploaders should support drag/drop, previews, progress, and clear error states.

## Accessibility And Quality Checklist

- Light and dark contrast independently meet WCAG AA for text.
- Focus states are visible on every interactive element.
- Keyboard flows work for sidebar, command palette, dialogs, sheets, filters, and forms.
- Touch targets are at least 44px where practical on touch layouts.
- Reduced motion is respected.
- Validate 375px, 768px, 1024px, 1440px, and wide desktop.
- No mobile horizontal scroll and no content hidden beneath sticky chrome.
- Loading states reserve space to avoid layout shift.

## Anti-Patterns

- Do not use maroon as large solid background color except in rare brand moments.
- Do not place cards inside cards.
- Do not add decorative orbs, noisy aurora backgrounds, or unreadable frosted panels.
- Do not use visible instructional text to explain ordinary controls.
- Do not add page-specific styling that bypasses semantic tokens.
- Do not make premium mean low-density; data-heavy workflows need density controls.
## Phase 2 Design-System Architecture (Implemented)

New tokens, primitives, and patterns shipped in Phase 2. All exports flow through @/components/foundation.

### Tokens delta (globals.css)

- --row-hover, --row-selected — table interaction tones (light & dark).
- --shadow-hover-lift — uniform 1px lift used by .hover-lift and KPI cards.
- --spark-1..5 — sparkline / chart palette (warm maroon, blue, green, gold, violet).
- .hover-lift utility — translateY(-1px) + premium shadow on hover, disabled by prefers-reduced-motion.
- .tabular-nums — convenience class for metric digits.

### Form primitives (oundation/forms)

- FormControl — label + required/optional + collapsible help + hint/error slots. Wrap any input.
- FormText, FormTextarea — labelled inputs forwarding refs and aria wiring.
- FormSelect<TValue> — typed shadcn-Select wrapper accepting a flat options array with optional descriptions.
- Stepper — horizontal/vertical multi-step indicator with motion-eased progress, supports navigation via onStepClick.
- DrawerForm — Sheet-based side panel with consistent header / scrolling body / footer chrome and width presets.
- AutosaveIndicator — idle/saving/saved/error pill with relative timestamp and retry affordance.

### Feedback primitives (oundation/feedback)

- InlineAlert — info/success/warning/danger non-blocking guidance with optional action and dismiss.
- ErrorState — full panel for failed loads, with retry; pair with EmptyState and Skeleton siblings.
- SuccessState — confirmation surface for completed flows with subtle one-shot motion.

### Page primitives (oundation/page)

- StickyPageHeader — sentinel-based sticky chrome that elevates on scroll without scroll listeners.
- PageTabs — animated underline that springs between active triggers; supports both link tabs and controlled tabs.
- InspectorLayout — main content + side inspector pane (docked on lg+, overlayed on smaller viewports).

### Dashboard primitives (oundation/dashboard)

- ChartContainer — themed echarts.ResponsiveContainer with title/description/toolbar slot and a11y igure semantics.
- Sparkline — axis-less area chart for trends inside cards/lists, palette via 	one={1..5}.
- AnimatedMetricCard — KPI card with rAF-based count-up (writes to a DOM ref, complies with eact-hooks/set-state-in-effect), tone-aware delta pill, optional inline sparkline, supports invertTrend for "lower is better" KPIs.
- ActivityFeed — vertical timeline with rail, tone-driven dots, staggered entrance.
- ProgressRing — compact circular progress with five tones; animates stroke offset only.

### Conventions

- All primitives respect useReducedMotion() and use initial={false} to stay hydration-safe.
- Use semantic tokens (g-surface-panel, 	ext-muted-foreground, g-status-success/10) — never raw Tailwind palette colours.
- For numbers in dashboards/tables, apply .tabular-nums so digits don't dance during count-up.
- Dependencies: echarts is now installed and used only inside oundation/dashboard/*.

### Anti-patterns added in Phase 2

- Do not import recharts directly in feature pages; go through ChartContainer.
- Do not animate alue props by triggering React renders per frame — write to refs.
- Do not wrap a FormControl around multiple inputs; one labelled input per control.
- Do not use InlineAlert for transient feedback (success after submit) — use Sonner toast.


## Phase 3 - Layout & Navigation Overhaul

### Route registry extensions (foundation/routing/route-registry.ts)

- AppModuleColor union: people | compliance | recruitment | learning | performance | rewards | platform.
- AppRouteDefinition gains four optional fields, all non-breaking:
  - moduleColor - module accent token used by shell, breadcrumbs, and badges.
  - commandable - opt out of the command palette (defaults to inclusion).
  - quickCreateHref - sibling create route surfaced as a Quick Create entry.
  - breadcrumbHint - short label override for breadcrumb compression.
- Population of these fields is deferred to module sweeps (P4-P8).

### Foundation primitives

- useLocalStorage<T>(key, initial) - SSR-safe, hydration-safe localStorage hook backed by useSyncExternalStore. Same setter signature as useState. Cross-tab updates flow through the storage event; same-tab cross-instance updates flow through an in-module pub/sub. Avoids set-state-in-effect anti-patterns.
- Breadcrumbs - lightweight breadcrumb trail. Accepts items prop or derives via buildPageBreadcrumb(usePathname()). Home icon, ChevronRight separators, aria-current=page on the leaf.

### Sidebar pinning (foundation/layout/sidebar-nav.tsx)

- Per-user pinned items persisted under prime-hr.sidebar.pins.v1 via useLocalStorage.
- Pinned section renders at top with a Star icon (brand-gold) when non-empty.
- Each item exposes a hover- and focus-revealed pin toggle (Pin / PinOff). Motion respects reduced-motion.
- All previous behavior preserved: collapsed mode, isComingSoon disable, active state via activeHref.

### Command palette overhaul (foundation/command/command-palette.tsx)

- Categorized sections in priority order: Pinned -> Recent -> Quick Create -> Navigation (grouped by navGroup).
- Quick Create entries derived from quickCreateHref on each AppNavItem.
- Recents persisted under prime-hr.command.recents.v1 (capped at 6).
- Pins read from the shared sidebar pins key, so pinning anywhere surfaces here too.
- Full keyboard navigation (Up/Down/Enter), highlight follows mouse, scrollIntoView on the active row.
- Body component is keyed on dialog open so local state resets on every reopen without setState-in-effect.
- Footer shows live result count and key hints.

### Conventions

- Foundation hooks live under src/components/foundation/hooks. Always SSR-safe; never assume window.
- All client effects must avoid setState in their body. Prefer useSyncExternalStore, derived values, key-based remounts, or rAF + DOM refs.
