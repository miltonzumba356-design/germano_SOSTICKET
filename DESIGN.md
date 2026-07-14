---
name: SOS Ticket Design System
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#4a4455'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#7b7487'
  outline-variant: '#ccc3d8'
  surface-tint: '#732ee4'
  primary: '#630ed4'
  on-primary: '#ffffff'
  primary-container: '#7c3aed'
  on-primary-container: '#ede0ff'
  inverse-primary: '#d2bbff'
  secondary: '#8127cf'
  on-secondary: '#ffffff'
  secondary-container: '#9c48ea'
  on-secondary-container: '#fffbff'
  tertiary: '#524b5e'
  on-tertiary: '#ffffff'
  tertiary-container: '#6b6376'
  on-tertiary-container: '#ece1f8'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#eaddff'
  primary-fixed-dim: '#d2bbff'
  on-primary-fixed: '#25005a'
  on-primary-fixed-variant: '#5a00c6'
  secondary-fixed: '#f0dbff'
  secondary-fixed-dim: '#ddb7ff'
  on-secondary-fixed: '#2c0051'
  on-secondary-fixed-variant: '#6900b3'
  tertiary-fixed: '#e9def5'
  tertiary-fixed-dim: '#cdc2d9'
  on-tertiary-fixed: '#1e1929'
  on-tertiary-fixed-variant: '#4a4456'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-padding: 24px
  gutter: 16px
---

## Brand & Style
The design system is engineered for a high-velocity technical support environment, blending the accessibility of modern chat applications with the systematic rigor of project management tools. The brand personality is professional yet approachable, prioritizing clarity, speed of resolution, and a sense of calm under pressure.

The visual style is **Modern Corporate with Glassmorphic accents**. It utilizes a clean, airy aesthetic characterized by generous whitespace, soft depth, and a refined color palette. To differentiate from standard enterprise software, this design system employs subtle translucency in persistent navigational elements and high-precision typography to ensure the interface feels sophisticated and lightweight.

## Colors
The color strategy focuses on functional hierarchy. The **Violet Primary** is used for critical actions and brand presence, while the **Purple Secondary** provides accents. 

Messaging surfaces use distinct tonal backgrounds to separate roles: **Light Purple (#F3E8FF)** for client messages to create a sense of ownership, and **Light Gray (#F1F5F9)** for technician responses to denote objective authority. Status badges utilize a high-visibility semantic palette to allow support agents to scan ticket lists rapidly.

## Typography
This design system pairs **Hanken Grotesk** for headings to provide a sharp, contemporary tech-forward feel, with **Inter** for all body and UI copy to maximize legibility during long-form technical reading. **JetBrains Mono** is reserved for ticket IDs, technical logs, and snippets.

Headlines use a tighter letter-spacing to maintain a structured appearance, while body text uses standard spacing for optimal flow. Label styles are set in medium weights to ensure they remain legible even at small scales in dense sidebars.

## Layout & Spacing
The layout follows a **structured fluid grid** with defined sidebars. On desktop, the interface is split into a 280px navigation sidebar, a 360px ticket list column, and a flexible main chat area. 

A strict 4px/8px rhythm is applied to all components. Internal card padding should default to 24px (lg) for a spacious, high-end feel, while chat bubbles use 12px horizontal and 8px vertical padding to maintain the density expected in communication tools.

## Elevation & Depth
Depth is created through a combination of **Glassmorphism** and **Ambient Shadows**. 

1.  **Level 0 (Base):** The background (#F8FAFC) remains flat.
2.  **Level 1 (Cards):** Ticket items and message bubbles use a `shadow-sm` (1px offset, 2px blur, 0.05 opacity) to lift slightly off the base.
3.  **Level 2 (Headers/Sidebars):** Top navigation and sidebars use a backdrop-blur (12px) with 80% opacity and a subtle 1px border (#E5E7EB) to create a sense of persistent orientation.
4.  **Level 3 (Modals/Popovers):** Floating elements use `shadow-md` for significant separation.

## Shapes
The shape language is defined by the **18px radius**, which is applied to all primary containers, message bubbles, and cards. This generous rounding softens the technical nature of the application, making it feel more like a modern consumer app than a legacy enterprise tool. Smaller elements like buttons and input fields should scale down to a 10px-12px radius to maintain visual harmony.

## Components

### Buttons
Primary buttons use a solid Violet (#7C3AED) fill with white text. Secondary buttons use a white background with a subtle border and Violet text. All buttons have a height of 40px and a 10px corner radius.

### Chat Bubbles
- **Client:** Background #F3E8FF, text #111827. Aligned right.
- **Technician:** Background #F1F5F9, text #111827. Aligned left.
- Both use an 18px border radius. When multiple messages are sent in a row, the "middle" messages reduce their corner radius on the tail side to 4px to group them visually.

### Status Badges
Badges are pill-shaped with a 12px font-size (Label-sm). They use a light background (10% opacity of the status color) with high-contrast text of the same hue to ensure accessibility and aesthetic integration.

### Input Fields
Search bars and chat inputs use a white background, 1px border (#E5E7EB), and 12px radius. Focus states should be indicated by a 2px Violet glow and a border-color shift to Primary.

### Cards
Ticket list cards use #FFFFFF background and an 18px radius. They feature a `shadow-sm`. Active ticket states are indicated by a 4px solid Violet left-border, rather than a full color change.