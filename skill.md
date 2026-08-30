---
name: reenart-design
description: Design system and interface guidelines for ReenArt Studio — a fine-art gallery/portfolio site. Synthesized from bergside/awesome-design-skills (editorial + refined design tokens), vercel.com/design/guidelines (Web Interface Guidelines), and Leonxlnx/taste-skill (anti-slop frontend taste, installed at .agents/skills/).
sources:
  - https://github.com/bergside/awesome-design-skills (skills/editorial, skills/refined)
  - https://vercel.com/design/guidelines
  - https://github.com/Leonxlnx/taste-skill (npx skills add Leonxlnx/taste-skill → .agents/skills/design-taste-frontend, high-end-visual-design, minimalist-ui, redesign-existing-projects)
---

# ReenArt Design Skill

## Design Read
A solo fine-art painter's portfolio and storefront. Audience: art collectors deciding whether to trust and pay a stranger online. The existing site already committed to a language — dark background, serif display type (Georgia/Playfair-adjacent), gold (`#c9a84c`) accent, generous whitespace, uppercase tracked-out micro-labels. That's an **editorial / gallery** read, not a SaaS or agency read.

Per taste-skill's dial system, this project should sit at:
- `DESIGN_VARIANCE: 4` — restrained, not artsy-chaotic. The paintings are the chaos; the chrome should be quiet.
- `MOTION_INTENSITY: 3` — subtle fades only. Nothing that competes with looking at art.
- `VISUAL_DENSITY: 2` — art-gallery airy. This is explicitly the "1 = Art Gallery" end of taste-skill's density dial — lean into it, don't fight it.

**Do not** drift toward generic SaaS/AI-slop defaults (centered gradient hero, glassmorphism cards, purple-to-blue gradients, Inter everywhere). Every existing style choice (serif type, gold-on-black, uppercase label rhythm) should be reinforced, not replaced, when adding new UI.

## Typography (from editorial + refined tokens, adapted to existing site fonts)
- Display/serif for headings and prices — already in place via `font-serif` class; keep it there, don't let admin-added UI (dashboard, checkout) drift into a different typeface family.
- Micro-labels stay uppercase, tracked-out, small (`text-[10px] tracking-widest`) — this is the site's signature rhythm, apply it consistently to any new label.
- Use **typographic curly quotes** ("") in copy, never straight quotes.
- Use the **ellipsis character** (…) not three periods (...) — e.g. "Preparing…" not "Preparing...".
- Use `font-variant-numeric: tabular-nums` on prices and any numeric column (painting price lists, invoice tables) so digits align.
- Format currency consistently: 0 or 2 decimal places, never mixed, on the same page.

## Color & Contrast
- Keep the existing dark theme (`#0d0d0d`/near-black background, `#c9a84c` gold accent) as the single source of truth — don't introduce a second accent color.
- Increase contrast on `:hover`/`:active`/`:focus` relative to resting state (a link that's barely visible at rest should become clearly visible on interaction).
- Never rely on color alone for status (e.g. "available" vs "sold" badges) — already doing this correctly with text labels + color, keep it that way for any new status UI.
- `color-scheme: dark` should be set on `<html>` (already done) so native form controls and scrollbars render correctly in dark mode.

## Spacing & Layout
- 8pt baseline rhythm, consistent with the editorial token set already informing the site's Tailwind spacing scale.
- Verify responsive coverage at mobile, laptop, and ultra-wide — not just the two sizes most recently tested.
- Prefer flex/grid/intrinsic sizing over measuring anything in JS.

## Interaction & Accessibility (Vercel Web Interface Guidelines — apply project-wide)
- Every interactive element needs a visible `:focus-visible` ring — audit modals (payment, inquiry) and admin dashboard buttons for this; several currently rely on `:hover` only.
- Minimum 44px touch target on mobile for anything currently under 24px (check the small icon-only buttons in the admin image thumbnail controls — delete ✕, reorder ◀▶).
- Never use `transition: all` — list only the properties actually animating (audit existing `transition-all` usages, e.g. `hover:opacity-75 transition-opacity` is fine, but any bare `transition-all` should be scoped).
- Disable submit buttons only *during* submission, never before — already correct in the payment/contact forms (`disabled={isPaying}` etc.), keep this pattern for any new form.
- Focus the first validation error on submit; show errors adjacent to their field — payment form already does inline errors, extend this to shipping-address field-level validation instead of one generic banner.
- Respect `prefers-reduced-motion` for the `animate-fade-in` utility used throughout — currently unconditional.
- Icon-only buttons (the admin thumbnail ✕, ◀, ▶) need a descriptive `aria-label`, not just a `title` attribute.
- Use `aria-live="polite"` on the toast notification in the admin dashboard so screen readers announce success/error without stealing focus.

## Forms (payment, checkout, contact, admin)
- Keep submit buttons enabled until the request starts, then show a spinner *with the original label retained* where possible ("Processing…" is fine — it retains the intent).
- Add a short show-delay (~150–300ms) before showing any loading spinner, so fast responses don't flicker a spinner in and out.
- Set `inputmode` appropriately: `numeric` for PIN/ZIP code fields, `email` for email fields (currently plain `type="text"`/`type="email"` without `inputmode` hints on mobile).
- Placeholder examples should look like real examples, not generic text — already mostly true ("e.g. 110001"), keep this standard for any new field.

## Anti-patterns to actively avoid (from taste-skill's Anti-Default Discipline)
- No purple/blue AI-gradient hero treatments — this site's hero already correctly uses real painting photography instead, keep that.
- No glassmorphism-everywhere — the one blurred glass toolbar (nav backdrop-blur) is enough; don't spread the effect to cards/modals.
- No infinite-loop micro-animations for decoration — motion should be purposeful (page transitions, toasts), never ambient.
- No generic three-equal-cards layout for the gallery grid if it can instead reflect the actual variance in painting aspect ratios — a strict grid is fine here (it's genuinely appropriate for a gallery), just don't force uniform crops that fight the art.

## How to use this file
When making any UI change to this codebase, check it against the three dials and the Interaction & Accessibility checklist above before considering the change done. This file is the merge of three external sources — re-fetch `https://vercel.com/design/guidelines` periodically, since Vercel updates it; the design-skill tokens and taste-skill folder in `.agents/skills/` are pinned to what was fetched on 2026-08-26.
