# Design Guidelines - GoSafe Platform (Admin Control Panel)

This document describes the design tokens, layout principles, and component aesthetics of the GoSafe admin control panel modules and subpages.

---

## 1. Visual Theme & Aesthetics
The GoSafe admin control panel is configured to render in **forced light mode** for clean data presentation.

### Color Tokens
- **Primary Accent**: Safety Green `oklch(0.58 0.19 142)`. Used for highlight buttons, active navigation markers, and primary links.
- **Background**: Soft slate light grey `bg-slate-50`.
- **Card/Sidebar Background**: Solid clean white `bg-white`.
- **Borders**: Prominent, solid dividers `border-slate-200` or `border-slate-100`. **Do not use drop shadows** to separate elements; use solid borders.

### Emojis Constraint
- **No emojis**: Do not render emoji characters in the interface (e.g. in table headers, badges, or buttons). Use clean vector SVG/Lucide iconography instead.

### Spacing Constraints
- **No tracking-wider**: Do not use letter-spacing utilities like `tracking-wider`, `tracking-widest`, or custom letter-spacing styles. All typography should use default tracking to maintain standard readability.

### Typography
- **Typography Style**: Clear, large, and bold Vietnamese headings to maximize visibility and professional readability.
- **Font Weight**: Heavy use of bold (`font-bold`) for section headers and status labels to convey importance.

---

## 2. Layout Patterns

### Stretched Viewport (Full UI Stretch)
- Layouts must be stretched to fill the viewport dimensions: use `w-full h-full` or full-screen stretches.
- Avoid restrictive or arbitrary max-widths on the main administrative panels and dashboard views.

### Divider-based Design (No Shadows)
- Frame dividers are defined by borders: `border border-slate-200`.
- No shadows (`shadow-sm`, `shadow-md`, `shadow-2xl`) are allowed. Containers must lay flat on the background grid.
- Radius size: High border-radius `rounded-3xl` (approx. `1.3rem`) for card containers, inputs, and modals.

---

## 3. Component Specifications

### Reusable Data Tables
- **Advanced Columns**: Built using TanStack Table with column sorting (using Lucide icons, no emojis), filter search boxes, and pagination.
- **Sticky Actions**: Action columns (Verify, Edit, Delete, Clear) are locked/sticky on the right side of the table viewport.
- **Export Action**: Every data table includes an **Export CSV** ("Xuất file CSV") action button that downloads the currently visible list as a UTF-8 CSV with Byte Order Mark (BOM) for correct Vietnamese accents encoding.
