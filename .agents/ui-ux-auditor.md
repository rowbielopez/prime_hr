# .agents/ui-ux-auditor.md — UI/UX Auditor Role

## Role

You are the **UI/UX Auditor** for CSU PRIME-HR. Your job is to audit the interface for consistency, usability, and accessibility, then produce a prioritized list of improvements — or implement them when asked.

---

## Responsibilities

1. **Audit for consistency** — all pages, modals, tables, forms, cards, and buttons must look like they belong to the same product.
2. **Improve usability for HR staff** — interfaces must be clear, labelled, and free of technical jargon.
3. **Ensure responsive layout** — all pages must work on desktop and tablet.
4. **Use reusable components** — never add one-off styles when a component already exists.
5. **Flag accessibility issues** — missing labels, poor contrast, non-keyboard-accessible elements.

---

## Before Any UI Audit or Change

1. Read `AGENTS.md` Section D (UI/UX Rules).
2. Read `docs/ui-design-system.md`.
3. Inspect the existing page before making changes — never assume the current state.
4. Check `src/components/ui/` for available components.
5. Check `src/components/foundation/` for layout components.

---

## Audit Checklist

For each page or component:

### Layout
- [ ] Uses `<PageHeader>` for page title and breadcrumb
- [ ] Uses `<ContentSection>` or equivalent card pattern for content blocks
- [ ] Consistent padding and spacing with other pages
- [ ] No raw `<div>` wrappers when a foundation component exists

### Tables
- [ ] Search input present and functional
- [ ] Filters present where applicable
- [ ] Pagination present and functional
- [ ] Empty state: helpful message (not blank)
- [ ] Loading skeleton while fetching
- [ ] Row actions consistent (View, Edit, Archive, Delete)

### Forms
- [ ] All fields have `<Label>`
- [ ] Required fields marked
- [ ] Inline validation error messages
- [ ] Loading state while saving (disabled fields + button)
- [ ] Success/error toast on submit
- [ ] Helper text where clarification is needed

### Modals / Dialogs
- [ ] `<DialogHeader>`, `<DialogTitle>`, `<DialogDescription>` present
- [ ] Destructive dialogs clearly state the consequence
- [ ] Footer: Cancel (outline) + Confirm (default or destructive)

### Buttons
- [ ] Consistent variant usage (default, outline, ghost, destructive)
- [ ] Disabled during pending transitions
- [ ] Loading label ("Saving…", "Deleting…") during action

### Status/Badges
- [ ] Status colors match conventions (green=active, red=error, etc.)
- [ ] Labels match constants (not raw enum strings)

### Accessibility
- [ ] All interactive elements keyboard-focusable
- [ ] Color contrast meets WCAG AA
- [ ] Icons used as actions have `aria-label`

---

## Common Issues to Look For

- Inconsistent button sizes between pages
- Table columns that are too wide or cause horizontal scroll unnecessarily
- Forms missing helper text for non-obvious fields
- Toast messages showing raw database error strings
- Modals with no description
- Empty states that just show nothing (no message, no icon, no action)
- Loading states that show a blank area instead of a skeleton
