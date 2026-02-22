# Voltverashop — Complete Visual System Design

This document defines the visual design system for the Voltverashop MLM platform: brand identity, color palette, typography, spacing, components, and implementation so the product stays consistent across all surfaces (landing, dashboards, admin, KYC, reports).

---

## 1. Overview

### 1.1 Purpose

- **Single source of truth** for colors, type, spacing, and component patterns.
- **Consistency** across Landing, User Dashboard, Admin Dashboard, Founder/Franchise views, KYC, and reporting.
- **Accessibility** via contrast, focus states, and semantic use of color.
- **Implementation** via CSS variables, Tailwind, and Shadcn/ui with minimal divergence.

### 1.2 Design Principles

- **Clarity:** Information hierarchy and readable text on all backgrounds.
- **Trust:** Professional, calm green palette; avoid harsh or playful tones.
- **Efficiency:** Familiar patterns (cards, tables, tabs) so users find actions quickly.
- **Responsiveness:** Mobile-first; layouts and touch targets scale appropriately.

---

## 2. Brand Identity

### 2.1 Logo & Mark

- **Primary mark:** Shopping bag with leaf icon (custom CSS: `.shopping-bag`, `.leaf-icon`, `.leaf`).
- **Sidebar/compact:** Smaller bag mark (`.sidebar-brand`, `.sidebar-handle`, `.sidebar-leaf-icon`).
- **Colors:** Bag uses brand gradient (`#8BC34A` → `#689F38`); leaf and center circle white; handle outline `#8BC34A`.
- **Usage:** Landing hero, login card, sidebar; do not stretch or recolor the mark.

### 2.2 Brand Colors (Primary Palette)

| Token        | Hex       | HSL (approx)     | Usage |
|-------------|-----------|------------------|--------|
| **Volt Light** | `#8BC34A` | hsl(88, 47%, 56%)  | Primary actions, links, brand blocks, gradients (start) |
| **Volt Dark**  | `#689F38` | hsl(88, 38%, 44%)  | Hover states, gradients (end), borders on primary |
| **Volt Gray**  | `#666666` | —                 | Secondary text, icons (when not on white) |

- **Gradient (135°):** `linear-gradient(135deg, #8BC34A 50%, #689F38 50%)` — used for hero, login panel, sidebar brand block, key CTAs.
- **Light surface gradient:** `linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)` for subtle backgrounds (`.volt-gradient-light`).

---

## 3. Color System

### 3.1 Semantic Tokens (CSS Variables)

All interactive and surface colors are driven by CSS variables so light/dark and future themes stay consistent.

#### Light mode (`:root`)

| Variable | Role | Typical value (light) |
|----------|------|------------------------|
| `--background` | Page/surface | `hsl(0, 0%, 100%)` |
| `--foreground` | Primary text | `hsl(240, 10%, 3.9%)` |
| `--card` / `--card-foreground` | Card surface and text | White / dark gray |
| `--popover` / `--popover-foreground` | Popovers, dropdowns | White / dark gray |
| `--primary` / `--primary-foreground` | Buttons, links, focus ring | Green `hsl(88, 47%, 56%)` / white |
| `--secondary` / `--secondary-foreground` | Secondary buttons, subtle surfaces | Light gray / dark gray |
| `--muted` / `--muted-foreground` | Disabled/secondary text | Light gray / mid gray |
| `--accent` / `--accent-foreground` | Hover states, highlights | Light gray / dark gray |
| `--destructive` / `--destructive-foreground` | Errors, delete, reject | Red / white |
| `--border` | Borders, dividers | Light gray |
| `--input` | Input borders | Light gray |
| `--ring` | Focus ring | Same as primary green |
| `--radius` | Default border radius | `0.5rem` |

#### Dark mode (`.dark`)

- Backgrounds use `hsl(240, 10%, 3.9%)`; foreground `hsl(0, 0%, 98%)`.
- Primary remains green; destructive and borders use darker variants.
- All semantic tokens are overridden in `.dark` so no component logic change is required.

#### Custom Volt tokens

- `--volt-light`, `--volt-dark`, `--volt-gray` — used for custom UI (e.g. gradients, badges) and align with Tailwind `volt-light`, `volt-dark`, `volt-gray`.

### 3.2 Chart Colors

- `--chart-1` … `--chart-5`: Green, teal, navy, gold, orange — used for charts and data viz so they stay on-brand and distinguishable.

### 3.3 Status Colors (Semantic)

Use for status badges and alerts only; do not use for primary actions.

| Status   | Background (light) | Text (light) | Use case |
|----------|--------------------|--------------|----------|
| Success  | `bg-green-100`     | `text-green-800` | KYC approved, success toasts |
| Warning  | `bg-yellow-100`    | `text-yellow-800` | Pending, caution |
| Error    | `bg-red-100`       | `text-red-800`   | Rejected, errors, destructive |
| Info     | `bg-blue-100`      | `text-blue-800`  | Informational (optional) |

---

## 4. Typography

### 4.1 Font Stack

- **Primary:** Segoe UI (via Google Fonts), fallback: Tahoma, Geneva, Verdana, sans-serif.
- **CSS:** `--font-segoe: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`.
- **Body:** `font-family: var(--font-segoe)` applied in `@layer base` to `body`.

### 4.2 Type Scale

| Use | Class / Token | Weight | Notes |
|-----|----------------|--------|--------|
| Page title | `text-2xl`–`text-3xl` | 600–700 | Card titles, dashboard headings |
| Section title | `text-xl` | 600 | Section headers |
| Card title | `text-2xl font-semibold` (CardTitle) | 600 | Consistent with Shadcn Card |
| Body | `text-base` (default) | 400 | Main content |
| Small / secondary | `text-sm text-muted-foreground` | 400 | Descriptions, captions |
| Labels | `text-sm font-medium` | 500 | Form labels, table headers |
| Buttons | `text-sm font-medium` | 500 | All button variants |
| Overline / micro | `text-xs text-muted-foreground` | 400 | Timestamps, IDs |

### 4.3 Line Height & Letter Spacing

- Card titles: `leading-none tracking-tight` (per Shadcn).
- Body: default line height; avoid long lines (max-width on reading containers if needed).

---

## 5. Spacing & Layout

### 5.1 Spacing Scale

Use Tailwind’s default scale (4px base): `1` (4px), `2` (8px), `3` (12px), `4` (16px), `5` (20px), `6` (24px), `8` (32px), `10` (40px), `12` (48px), etc.

### 5.2 Common Patterns

- **Card padding:** `p-6` for CardHeader/CardContent/CardFooter; `pt-0` for content/footer after header.
- **Section spacing:** `space-y-4` or `space-y-6` between sections on a page.
- **Form groups:** `space-y-2` between label and input; `space-y-4` between fields.
- **Page padding:** `p-4` on mobile; `p-6` or `p-8` on desktop.
- **Gap in flex/grid:** `gap-4` or `gap-6` for card grids and button groups.

### 5.3 Border Radius

- **Global:** `--radius: 0.5rem`; Tailwind: `rounded-lg` = `var(--radius)`, `rounded-md` = `calc(var(--radius) - 2px)`, `rounded-sm` = `calc(var(--radius) - 4px)`.
- **Marketing/landing:** `rounded-3xl` for hero cards and large panels.
- **Buttons:** `rounded-md`.
- **Badges/pills:** Use default or `rounded-full` for pill style.

### 5.4 Shadows

- **Cards:** `shadow-sm` (default Card).
- **Modals/dropdowns:** `shadow-lg` or `shadow-xl`.
- **Landing card:** `shadow-2xl` for prominence.
- **Brand bag:** `box-shadow: 0 10px 30px rgba(139, 195, 74, 0.3)`; sidebar: `0 5px 15px rgba(139, 195, 74, 0.3)`.

---

## 6. Component Patterns

### 6.1 Buttons

- **Variants:** default (primary), secondary, destructive, outline, ghost, link.
- **Sizes:** default `h-10 px-4 py-2`, `sm`, `lg`, `icon` (e.g. `h-10 w-10`).
- **Primary:** `bg-primary text-primary-foreground hover:bg-primary/90` — uses brand green.
- **Focus:** `ring-2 ring-ring ring-offset-2`; never remove focus outline.
- **Disabled:** `opacity-50 pointer-events-none`.

### 6.2 Cards

- **Structure:** Card (container) → CardHeader (optional) → CardTitle + CardDescription → CardContent → CardFooter (optional).
- **Style:** `rounded-lg border bg-card text-card-foreground shadow-sm`.
- **Content spacing:** `space-y-1.5` in header; `p-6 pt-0` for content and footer.

### 6.3 Forms

- **Label:** Label component with `text-sm font-medium`.
- **Input:** border uses `--input`; focus ring `--ring`; consistent height (e.g. `h-10`).
- **Error state:** border destructive + error message in `text-destructive` or `text-red-600`.

### 6.4 Badges

- **Default:** secondary variant for neutral tags.
- **Status:** use semantic background/text classes (e.g. `bg-green-100 text-green-800` for Approved) with small icon when needed (CheckCircle, XCircle, Clock).

### 6.5 Tables & Data

- Use Shadcn Table; header row with `text-sm font-medium`; zebra or hover for density.
- Numeric data right-aligned when appropriate; use `text-muted-foreground` for secondary columns.

### 6.6 Tabs

- TabsList with TabsTrigger; active state with primary or underline per Shadcn tabs.
- Use for dashboard sections (e.g. Overview, Team, KYC, Products) to keep one content area and switch context.

### 6.7 Navigation

- **Sidebar:** Collapsible on small screens; brand block at top (Voltverashop logo); nav items with icons + labels; active state with primary or accent background.
- **Top bar:** User menu, notifications, optional breadcrumbs; height consistent (e.g. 56px).

---

## 7. Page-Level Layouts

### 7.1 Landing / Auth

- **Background:** Full viewport `volt-gradient` (green gradient) with optional soft blur orbs (`bg-white/10`, `blur-3xl`).
- **Card:** Centered, `bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl`; split layout (form + brand/illustration) on large screens.
- **Form side:** Volt gradient or white; primary CTA green.

### 7.2 User Dashboard

- **Shell:** Sidebar + main content; main has padding and scroll.
- **Above fold:** Key metrics (wallet, BV, status) in cards or a compact strip.
- **Sections:** Cards for KYC, team, products, purchases; tabs where multiple sub-views exist.

### 7.3 Admin / Founder / Franchise

- Same shell as user dashboard; different nav items and data.
- Tables for user list, KYC queue, reports; filters and actions in header or toolbar.
- Use destructive variant only for irreversible actions (e.g. reject, delete); confirm where appropriate.

### 7.4 KYC

- **User:** Upload cards per document type; status badges (Pending/Approved/Rejected); clear CTAs for “Replace” or “View”.
- **Admin:** List by status (Pending/Rejected/Approved); per-user document list with approve/reject and optional reason.

---

## 8. Motion & Animation

- **Transitions:** `transition-colors` on buttons and interactive elements (already in button).
- **Accordion:** Use Shadcn accordion keyframes (`accordion-down` / `accordion-up`).
- **Toasts:** Use Toaster component; keep motion subtle (slide/fade).
- **Loading:** Skeleton or spinner in brand green where a dedicated loader is shown; avoid flashy motion.

---

## 9. Iconography

- **Library:** Lucide React; consistent size in buttons: `[&_svg]:size-4`.
- **Usage:** One icon per primary action where it adds clarity (e.g. Upload, CheckCircle, XCircle, Clock for KYC status).
- **Color:** Inherit text color or use `text-muted-foreground` for secondary icons; primary for primary actions.

---

## 10. Responsive & Accessibility

### 10.1 Breakpoints

- Use Tailwind defaults: `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px, `2xl` 1536px.
- **Mobile-first:** Base styles for mobile; add `sm:`, `md:`, `lg:` for larger layouts (e.g. sidebar visible on `lg`, hidden on smaller).

### 10.2 Touch Targets

- Buttons and links at least 44px height or padding on touch devices; icon-only buttons `h-10 w-10` minimum.

### 10.3 Focus & Contrast

- All interactive elements must have visible focus (ring); primary ring uses `--ring` (green).
- Text on background: ensure contrast ≥ 4.5:1 (WCAG AA); muted text slightly lower but still readable.
- Status colors: ensure badge text on badge background passes contrast.

---

## 11. Implementation Reference

### 11.1 Files

| Concern | Location |
|--------|----------|
| CSS variables (light/dark), Volt utilities, base body font | `client/src/index.css` |
| Tailwind theme (colors, radius, fontFamily, keyframes) | `tailwind.config.ts` |
| Button variants/sizes | `client/src/components/ui/button.tsx` |
| Card structure | `client/src/components/ui/card.tsx` |
| Shadcn components | `client/src/components/ui/*` |
| Logo / bag mark | `client/src/components/VoltverashopLogo.tsx` + `.shopping-bag` / `.sidebar-brand` in `index.css` |

### 11.2 Adding New Screens

- Reuse `Card`, `Button`, `Badge`, `Tabs`, `Table` from `@/components/ui`.
- Use semantic colors via Tailwind (`bg-primary`, `text-muted-foreground`, etc.) rather than hardcoding hex.
- Use `volt-gradient` or `volt-gradient-light` only where brand emphasis is intended (hero, sidebar brand, key CTAs).
- Keep status feedback to green/yellow/red semantic usage defined in §3.3.

### 11.3 Theming Checklist

- [ ] New tokens added to `:root` and `.dark` in `index.css` if needed.
- [ ] Tailwind `theme.extend` updated in `tailwind.config.ts` if new utilities are desired.
- [ ] No raw hex for primary/secondary/background/foreground; use variables or Tailwind semantic names.
- [ ] Focus states and contrast checked for new components.

---

## 12. Summary

| Area | Standard |
|------|----------|
| **Brand** | Green gradient (#8BC34A / #689F38); bag+leaf mark; Segoe UI |
| **Colors** | CSS variables for all surfaces and states; status = green/yellow/red semantic |
| **Type** | Segoe UI; scale from `text-xs` to `text-3xl`; CardTitle = 2xl semibold |
| **Spacing** | Tailwind scale; card `p-6`; form `space-y-2` / `space-y-4` |
| **Radius** | `--radius` 0.5rem; marketing cards `rounded-3xl` |
| **Components** | Shadcn/ui + existing button/card/badge/tabs/table patterns |
| **Layouts** | Mobile-first; sidebar + main; landing = gradient + centered card |
| **Motion** | Subtle transitions; no heavy animation |
| **A11y** | Visible focus ring; contrast; 44px touch targets |

This visual system design should be treated as the single reference for the “complete design” of Voltverashop; new features and pages should align with it unless explicitly overridden by product decision.
