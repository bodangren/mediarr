---
version: 2.0.0
name: Mediarr "Near-Zero" (Tesla Inspired)
colors:
  primary: "#ffffff"
  background: "#000000"
  surface: "#000000"
  success: "#ffffff"
  warning: "#ffffff"
  danger: "#E82127"
typography:
  body-md:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
spacing:
  base: 8px
rounded:
  none: 0px
  full: 9999px
---

# Mediarr Design System: "Near-Zero"

## Overview
"Near-Zero" is a radical subtraction of the traditional user interface. Inspired by the minimalist instrumentation of high-performance electric vehicles, it treats the screen as a single, continuous plane of glass. There are no cards, no borders, and no generic "modern" gradients. The interface is invisible until it is needed.

## Core Principles
- **Radical Subtraction:** If a pixel does not convey information or enable action, it is deleted. No "surface ramps," no divider lines.
- **Near-Zero UI:** Controls exist in a state of dormancy (0% to 10% opacity) until hovered or focused.
- **The "Object" Priority:** The media itself (Posters, Backdrops) is the primary structural element. The UI wraps around the content, never the other way around.
- **OLED First:** Backgrounds are absolute black (`#000000`). Depth is achieved through light and reflection (subtle highlights), not gray backgrounds.
- **Massive Interaction:** Large touch/click targets with generous negative space.

## Colors

### The Void
A pure black foundation that disappears on OLED displays.

| Token | Hex | Usage |
| :--- | :--- | :--- |
| `void` | `#000000` | Universal background and surface |
| `glass` | `rgba(255,255,255,0.05)` | Contextual overlays (with backdrop-blur) |
| `highlight` | `#1a1a1a` | Active focus indicator (extremely subtle) |

### Materiality
White light on black glass.

| Token | Hex | Usage |
| :--- | :--- | :--- |
| `text-high` | `#ffffff` | Primary data and headings |
| `text-low` | `#666666` | Labels and secondary info |
| `accent-red` | `#E82127` | Cyber Red: Destructive actions only |
| `accent-silver` | `#a1a1a1` | Metadata and inactive states |

## Typography

### Font Families
- **Sans:** `Inter, system-ui, sans-serif` (Precision Grotesque)
- **Mono:** `JetBrains Mono` (Technical identifiers only)

### Type Scale
Hierarchy is achieved through extreme size variance, not color.

| Token | Size | Weight | Usage |
| :--- | :--- | :--- | :--- |
| `hero` | 48px | 700 | Primary focal point |
| `headline` | 24px | 500 | Section titles |
| `body` | 14px | 400 | Standard info |
| `meta` | 10px | 600 | Uppercase technical data |

## Geometry & Physics

### Shape
- **Corner Radius:** `2px` for small objects, `24px` for large containers (molded feel).
- **Borders:** PROHIBITED. Use negative space or 1px `glass` highlights only.
- **Motion:** Instant response with 100ms ease-out transitions.

## Component Specifications

### Buttons
- **Ghost (Default):** Transparent background, `text-low` color. Becomes `text-high` on hover.
- **Action:** Solid white background, black text. No borders.
- **Destructive:** Cyber Red text, transparent background.

### Inputs
- **Underline only:** 1px white bottom border that appears only on focus. Otherwise invisible.

### Navigation
- **Floating:** Navigation elements float above the "void" with no containers.

## Do's and Don'ts

### Do
- Use absolute black `#000000`.
- Let content (posters) bleed to the edges of their containers.
- Use massive padding (32px+).
- Hide scrollbars entirely.

### Don't
- Use gray backgrounds (`#121212`, etc.).
- Use borders to separate content.
- Use shadows to create depth.
- Use icons with circles or boxes around them.
