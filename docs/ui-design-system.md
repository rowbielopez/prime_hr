# CSU PRIME-HR — UI Design System

## Design Goal

Prime-HR targets a **modern, clean, professional** aesthetic suitable for a government HRIS. The interface must be:
- Usable by non-technical HR staff without training documentation
- Accessible on desktop and mobile
- Consistent across all modules (no module should look like a different product)
- Visually calm — government/office context, not flashy

---

## Component Library

- **Base UI:** shadcn/ui components from `src/components/ui/`
- **Layout primitives:** `src/components/foundation/` (PageHeader, ContentSection, etc.)
- **Domain UI:** `src/components/features/<domain>/`

> Always check if a component already exists before creating a new one.

---

## Layout Rules

- Use consistent page padding and max-width from the existing layout.
- All protected pages use the sidebar + header shell from `src/app/(protected)/layout.tsx`.
- Page content starts with `<PageHeader title={...} subtitle={...} breadcrumb={...} />`.
- Use `<ContentSection>` (or equivalent) for card-style content blocks.
- Never use raw `div` wrappers for page sections when a foundation component exists.

---

## Button Rules

- Use `<Button>` from `src/components/ui/button`.
- Variants: `default` (primary actions), `outline` (secondary), `ghost` (tertiary/icon), `destructive` (delete/archive).
- Always disable buttons during pending transitions (`disabled={isPending}`).
- Destructive buttons must have a confirmation dialog before executing.
- Loading state: show spinner or change label to "Saving…", "Deleting…", etc.

---

## Modal / Dialog Rules

- Use `<Dialog>` from `src/components/ui/dialog`.
- All dialogs need: `<DialogHeader>`, `<DialogTitle>`, `<DialogDescription>`.
- Destructive confirmation dialogs: clearly state what will be deleted/changed.
- Keep dialogs focused — one action per dialog.
- Dialog footer: Cancel (outline) + Confirm (default or destructive).

---

## Datatable Rules

- Use the existing `AdminDataTable` or equivalent pattern for all data tables.
- All tables must have: search input, column filters (where applicable), pagination.
- Empty state: show a helpful message (not a blank page or "no data" without context).
- Loading state: show skeleton rows while data is loading.
- Row actions: consistent "View", "Edit", "Archive", "Delete" pattern.

---

## Form Rules

- All form fields need a `<Label>` linked to the input.
- Required fields should be marked clearly.
- Validation errors: display inline below the field using the existing error message pattern.
- Loading state: disable all fields and submit button while saving.
- Success/error feedback: use `toast.success()` / `toast.error()` via `sonner`.
- Helper text: add `<p className="text-sm text-muted-foreground">` below fields where clarification is needed.

---

## Card Rules

- Use `<Card>` / `rounded-lg border bg-card p-4 shadow-sm` pattern from existing pages.
- Section cards: `<h2 className="text-base font-semibold">` for the card title.
- Avoid nesting cards more than one level deep.

---

## Badge / Status Rules

- Use `<Badge>` from `src/components/ui/badge`.
- Status colors:
  - Active / verified / completed: green variant
  - Draft / in-progress / pending: blue or yellow variant
  - Inactive / separated / failed: gray or muted variant
  - Returned / rejected / destructive: red variant
- Status labels must match the labels defined in constants (e.g., `PDS_STATUS_LABELS`).

---

## Toast / Alert Rules

- Use `sonner` for all toast notifications (`toast.success()`, `toast.error()`, `toast.warning()`).
- Toast messages: short (max 2 lines), actionable, friendly.
- Do not show raw error messages from the database — translate to user-friendly text.
- Destructive action toasts: confirm what was deleted/changed.

---

## Loading and Empty State Rules

- Loading: show a loading skeleton (not a blank screen).
- Empty state: show a helpful empty state with an icon and action if applicable.
  Example: "No employees found. Add your first employee to get started." + Add button.
- Never show a raw `undefined` or `null` on screen.

---

## Responsive Rules

- All pages must work on desktop (1280px+) and tablet (768px+). Mobile is a nice-to-have.
- Use Tailwind responsive prefixes: `md:`, `lg:` for layout shifts.
- Tables: on small screens, consider horizontal scroll rather than breaking the layout.
- Forms: stack fields vertically on mobile (`grid-cols-1 md:grid-cols-2`).

---

## Accessibility Rules

- All interactive elements must be keyboard-focusable.
- Use semantic HTML: `<button>` for buttons, `<a>` for links, `<form>` for forms.
- Color contrast must meet WCAG AA minimum.
- Avoid conveying information through color alone — also use labels/icons.
- All images and icons used as actions must have `aria-label` or `title`.

---

## Styling Rules

- Do not write one-off inline styles or arbitrary Tailwind overrides without a comment explaining why.
- Prefer Tailwind utility classes from the design token set (colors, spacing, typography).
- Do not use `style={{ ... }}` unless absolutely unavoidable.
- If you need a new reusable style, add it as a utility class or component variant, not inline.
