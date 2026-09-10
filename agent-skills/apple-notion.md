---
name: apple-notion-web-design
description: Apply Apple.com and Notion.com-inspired web design judgment - visual design principles, typography, color, composition, UX/UI, and soft-skill process checks - whenever building, reviewing, or critiquing a website, landing page, portfolio, or UI mockup. Use this whenever the user asks for a site/page/component to "look clean," "look premium," "look minimal," references Apple or Notion as inspiration, or asks for a design review, style pass, or layout critique - even if they don't name this skill directly. Also use before generating any frontend-design artifact where visual polish matters, not just when explicitly requested.
---

# Apple × Notion Web Design

A condensed, opinionated design system for building sites that feel calm, premium, and content-first - synthesizing Apple.com's restraint/craft and Notion.com's clarity/warmth. Use this to make concrete decisions, not just vibes.

## Core philosophy

Apple and Notion sit on the same spectrum for different reasons:
- **Apple**: maximal restraint. Huge whitespace, one hero idea per screen, type as sculpture, motion that reveals rather than decorates, near-monochrome palettes broken only by the product itself.
- **Notion**: structured warmth. Grid-based clarity, friendly illustration accents, generous but not extravagant whitespace, a neutral base (near-black on off-white) with sparing brand-color pops, everything legible at a glance.

The synthesis: **one idea per section, generous negative space, a restrained palette, and typography that carries most of the hierarchy - decoration only where it clarifies.**

Before styling anything, ask: *what is the single thing this section should communicate, and what's the least visual noise needed to say it?*

## Typography (do this first - it's 70% of the "premium" feeling)

- Pick ONE primary typeface family. Apple uses SF Pro-style grotesques; Notion uses a humanist sans (Inter-like) for UI + a serif or display face sparingly for editorial moments. Don't mix more than 2 families.
- Practical body-copy choices: Inter, Roboto, or system-ui stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`). Reserve decorative/display type for hero headlines only.
- Build a tight type scale (e.g. 14 / 16 / 20 / 28 / 40 / 64px) - don't invent sizes ad hoc.
- Line-height: 1.5–1.6 for body, 1.1–1.2 for large display headlines.
- Weight does the hierarchy work Apple/Notion rely on: use 2–3 weights max (e.g. 400 regular, 600 semibold, and maybe 700 for hero) instead of adding more colors or borders to signal importance.
- Letter-spacing: slightly tight (-0.01 to -0.02em) on large display text, neutral on body.

## Color

- Base palette: near-black text on near-white/off-white background (never pure #000 on #FFF - use something like #1D1D1F on #FBFBFD, Apple's actual pair, or #191919 on #FFFFFF/#F7F6F3, Notion's).
- One accent color, used sparingly - CTAs, links, active states, small icon accents. Not for large fills.
- Avoid gradients unless it's a single soft, large-radius, low-contrast one behind a hero (Apple does this for product glows).
- Dark mode (if used): don't just invert - desaturate and warm the near-black slightly (#1D1D1F-ish, not #000000).
- Legibility check: body text should hit at least 4.5:1 contrast; never sacrifice this for aesthetic.

## Composition & spacing

- Whitespace is a design element, not the absence of one - when in doubt, add more margin before adding more content.
- Use an 8px base spacing unit (8/16/24/32/48/64/96/128) so rhythm stays consistent site-wide.
- One hero statement per fold: a headline + one supporting line + one CTA. Resist stacking multiple messages above the fold.
- Section rhythm: alternate density - a spacious hero, then a tighter feature grid, then spacious again. Constant density reads flat.
- Align everything to a grid (12-col is safe); asymmetry should be intentional, not accidental.
- Cards/containers: large corner radii (12–24px), soft 1px borders or barely-there shadows (`0 1px 2px rgba(0,0,0,0.04)` territory) - not heavy drop shadows.

## UI details that read as "premium"

- Buttons: generous padding (12–16px vertical), pill or 8–12px radius, one primary (filled, accent color) + one secondary (ghost/outline) style per screen - not five button styles.
- Micro-interactions: subtle hover lift/opacity/scale (transform: scale(1.02) or opacity 0.8) on 150–250ms ease-out transitions. Motion should feel like physical weight, not decoration.
- Icons: one icon set, one stroke weight, consistent sizing (16/20/24px grid).
- Forms: label above input, generous input height (44px+ for tap targets), clear focus states using the accent color as an outline/ring, not just a color change (for accessibility).
- Navigation: sticky, minimal, collapses gracefully on scroll/mobile; Notion-style breadcrumbs or Apple-style centered nav both work - pick one paradigm and stay consistent.

## Responsive & accessibility baseline (non-negotiable, not optional polish)

- Design mobile layout as its own composition, not a squeezed desktop - re-order content, don't just stack it.
- Tap targets ≥44×44px.
- Every interactive element needs a visible focus state.
- Don't rely on color alone to convey state (add icon/underline/weight too).
- Respect `prefers-reduced-motion` for any scroll-triggered or hover animation.

## Anti-patterns to catch in review

- More than 2 typefaces, more than 3 font weights in use, or more than 1 saturated accent color.
- Text-on-image with insufficient contrast or no scrim/overlay.
- Dense sections back-to-back with no breathing room between them.
- Shadows/borders used as the *primary* way to separate content instead of spacing.
- CTA buttons that don't clearly outrank secondary buttons visually.
- Centered body paragraphs (Apple/Notion both left-align body copy; center only short headlines/hero lines).

## How to use this when asked to build or review a UI

1. State the one idea per section before writing any markup/CSS.
2. Pick the type scale, spacing unit, and 1 accent color up front - write them down (e.g. as CSS custom properties) before styling components, so choices stay consistent.
3. Build the hero first - it sets the tone for every density/spacing decision after it.
4. When reviewing an existing design, check it against "Anti-patterns" above before giving subjective feedback.
5. If the user wants code, prefer semantic HTML + CSS custom properties for the tokens above (see `frontend-design` skill for stack-specific implementation constraints in this environment) - don't hardcode magic numbers scattered through the file.

## Quick reference: process/soft-skill checks worth applying mid-project

- Before pushing back on a stakeholder's request, restate their goal back to them and offer the design rationale with evidence, not just preference (see "Collaboration" ethos above).
- When scope-creeping on visual polish, ask: does this pixel change move a business/usability metric, or is it personal taste? Time-box exploration accordingly.