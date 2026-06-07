# Design System

## Overview

The UI is built from a small set of shared patterns that every page uses consistently: `ModulePageShell` as the page wrapper, gradient KPI cards for metrics, CSS custom properties for theming, and a compact component library under `components/ui/`.

---

## `ModulePageShell` — Page Wrapper

Every feature page is wrapped in `ModulePageShell`. It handles the page header and provides a consistent container:

```tsx
<ModulePageShell
  title={nav("Maintenance Reports", "سجلات الصيانة")}
  subtitle={nav("Log machine downtime and spare parts used", "تسجيل توقف الآلات وقطع الغيار المستخدمة")}
  icon={<Wrench size={22} />}
  actions={
    <Button size="sm" onClick={openNew}>
      <Plus size={14} className="me-1" /> Add
    </Button>
  }
>
  {/* page content */}
</ModulePageShell>
```

**Props:**

| Prop | Type | Purpose |
|---|---|---|
| `title` | string | Bold heading (already localized) |
| `subtitle` | string | Muted subtitle below heading |
| `icon` | ReactNode | Icon shown left of title |
| `actions` | ReactNode | Buttons shown top-right (optional) |
| `children` | ReactNode | Main page content |

`ModulePageShell` itself is wrapped inside `AppScaffold` via the routing tree, so the sidebar and top bar are already present — the shell only adds the in-page header.

---

## Gradient KPI Cards

All pages display summary statistics using gradient cards. The pattern is consistent across all 29 engineer and accountant pages:

```tsx
<div style={{
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: ".75rem",
  marginBottom: "1.25rem"
}}>
  {[
    { label: nav("Total Records", "إجمالي السجلات"), value: 42, gradient: "linear-gradient(135deg,#3b82f6,#1d4ed8)" },
    { label: nav("Pending",       "قيد المعالجة"),   value: 7,  gradient: "linear-gradient(135deg,#f59e0b,#d97706)" },
    { label: nav("Resolved",      "محلول"),          value: 35, gradient: "linear-gradient(135deg,#10b981,#059669)" },
  ].map(k => (
    <div key={k.label} style={{
      borderRadius: 14,
      padding: "1rem 1.1rem",
      background: k.gradient,
      color: "#fff",
      boxShadow: "0 4px 12px rgba(0,0,0,.15)"
    }}>
      <p style={{ margin: 0, fontSize: ".72rem", fontWeight: 600, opacity: .85, textTransform: "uppercase", letterSpacing: ".06em" }}>
        {k.label}
      </p>
      <p style={{ margin: ".25rem 0 0", fontSize: "1.7rem", fontWeight: 900, lineHeight: 1.1 }}>
        {k.value}
      </p>
    </div>
  ))}
</div>
```

**Standard gradient palette:**

| Semantic | Gradient |
|---|---|
| Primary / Total | `linear-gradient(135deg, #3b82f6, #1d4ed8)` — blue |
| Warning / Pending | `linear-gradient(135deg, #f59e0b, #d97706)` — amber |
| Success / Done | `linear-gradient(135deg, #10b981, #059669)` — green |
| Danger / Critical | `linear-gradient(135deg, #ef4444, #dc2626)` — red |
| Purple / Analytics | `linear-gradient(135deg, #8b5cf6, #7c3aed)` — purple |
| Cyan / Info | `linear-gradient(135deg, #06b6d4, #0891b2)` — cyan |
| Slate / Neutral | `linear-gradient(135deg, #94a3b8, #64748b)` — slate |

For conditional values (e.g. Net Profit is positive or negative), the gradient is chosen dynamically:
```tsx
gradient: value >= 0
  ? "linear-gradient(135deg,#10b981,#059669)"
  : "linear-gradient(135deg,#f87171,#dc2626)"
```

---

## CSS Custom Properties (Theming)

`src/index.css` defines all design tokens as CSS variables. Light theme values are in `:root`, dark theme values are in `[data-theme="dark"]`:

```css
:root {
  --bg-primary:       #ffffff;
  --bg-surface:       #f8fafc;
  --bg-surface-2:     #f1f5f9;
  --text-primary:     #0f172a;
  --text-secondary:   #64748b;
  --border-default:   #e2e8f0;
  --accent:           #6366f1;    /* indigo */
  --accent-hover:     #4f46e5;
}

[data-theme="dark"] {
  --bg-primary:       #0f172a;
  --bg-surface:       #1e293b;
  --bg-surface-2:     #334155;
  --text-primary:     #f1f5f9;
  --text-secondary:   #94a3b8;
  --border-default:   #334155;
  --accent:           #818cf8;
  --accent-hover:     #6366f1;
}
```

Components reference these via `var(--accent)`, `var(--text-secondary)`, etc. Switching themes is instant — just toggling the `data-theme` attribute on `<html>`.

---

## `ThemeContext` + `LocaleContext`

**ThemeContext:**
- Persists `"light"` / `"dark"` in localStorage key `plasticon_theme`
- On mount, reads the preference and applies `document.documentElement.setAttribute("data-theme", theme)`
- `ThemeToggle` component (sun/moon icon) calls `toggleTheme()`

**LocaleContext:**
- Persists `"en"` / `"ar"` in localStorage key `plasticon_locale`
- On mount, applies `document.documentElement.setAttribute("dir", locale === "ar" ? "rtl" : "ltr")`
- `LocaleSwitch` component (EN/AR button) calls `setLocale()`
- RTL layout is handled automatically by Tailwind's `rtl:` variant and CSS logical properties (`me-` instead of `mr-`, `ps-` instead of `pl-`)

---

## Component Library — `components/ui/`

| Component | File | Purpose |
|---|---|---|
| `<Button>` | `button.tsx` | Styled button with `size` and `variant` props |
| `<Card>` | `card.tsx` | Surface container with border and shadow |
| `<Badge>` | `badge.tsx` | Status pill/chip |
| `<Input>` | `input.tsx` | Controlled text input |
| `<EmptyState>` | `empty-state.tsx` | Full-page "no records" placeholder |
| `<PageHeader>` | `page-header.tsx` | Title + subtitle layout block |
| `<TableShell>` | `table-shell.tsx` | Responsive scrollable table wrapper |

### Button Variants
```tsx
<Button size="sm" variant="outline">Cancel</Button>
<Button size="sm">Save</Button>
<Button size="sm" variant="destructive">Delete</Button>
```

---

## Form Pattern

All add/edit forms appear inside a `<Card>` inline above the data list (no modals). The card has `border-2 border-[var(--accent)]` to distinguish it visually.

```tsx
{showForm && (
  <Card className="p-5 mb-6 border-2 border-[var(--accent)]">
    <div className="flex items-center justify-between mb-5">
      <h3>New Record</h3>
      <button onClick={() => setShowForm(false)}><X size={18} /></button>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
      {/* form fields */}
    </div>
    <div className="flex gap-2 pt-2 border-t border-[var(--border-default)]">
      <Button size="sm" onClick={handleSave} disabled={saving}>Save</Button>
      <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
    </div>
  </Card>
)}
```

---

## Utility CSS Classes

Defined in `index.css` and used directly in JSX:

| Class | Purpose |
|---|---|
| `.input` | Styled `<input>` or `<select>` element |
| `.label` | Field label above an input |
| `.spinner` | Circular loading indicator |
| `.auth-alert` | Info/success alert box |
| `.auth-alert--error` | Error alert box |

---

## Record Card Pattern

Data lists use CSS Grid cards instead of tables. Each record card follows this structure:

```tsx
<Card className="p-0 overflow-hidden flex flex-col">
  {/* Colored header strip */}
  <div style={{ background: coloredBg, borderBottom: `2px solid ${color}20`, padding: "12px 16px" }}>
    <p className="font-bold text-sm">{record.title}</p>
    <span style={{ background: color + "20", color, borderRadius: 20, padding: "1px 8px" }}>
      {statusLabel}
    </span>
    {/* Edit + Delete buttons (hidden for Admin) */}
  </div>
  {/* Body with details */}
  <div className="p-4 flex-1 flex flex-col gap-2.5">
    {/* fields */}
  </div>
</Card>
```

The colored header strip uses the same gradient/color palette as the KPI cards so the visual language is consistent throughout the page.
