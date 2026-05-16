---
name: h2o-allegiant-brand
description: H2O Allegiant visual identity system — colour palettes (primary brand, functional accents, chart tertiary), typography (Inter / Inter Tight / JetBrains Mono with Helvetica fallback), callout components (gate callout, flag callout, strategic insight, why-it-matters, theme header), cover block templates (Ideation, Analytical, Playbook), and table styles (comparison, decision-maker matrix, solution fit). Consumed by h2o-discovery-reporting to render the five-tier output (Snapshot + Ideation/Analytical/Playbook PDFs + Markdown annex). Not a primary user-facing skill — never triggered by user intent; only loaded by h2o-discovery-reporting when rendering PDFs. Read SKILL.md first for rationale and usage; then import primitives from brand.py.
---

# H2O Allegiant brand system

## What this skill is for

This is the **visual identity primitive provider** for `h2o-discovery-reporting`. It is not user-triggered. The reporting skill loads `brand.py` when rendering PDFs and consumes the primitives defined here — colours, fonts, callout components, cover templates, table styles.

The design rationale lives in this SKILL.md. The Python implementation lives in `brand.py`. The reporting skill imports from `brand.py` directly:

```python
from brand import (
    BRAND_NAVY, BRAND_BLUE, BRAND_CYAN,
    GATE_OPEN, GATE_CONDITIONAL, GATE_CLOSED,
    FLAG_STOP, FLAG_SPECIALIST, FLAG_ATTENTION, FLAG_CLEAR,
    register_fonts, get_styles,
    gate_callout, flag_callout, strategic_insight_callout,
    why_it_matters_callout, theme_header,
    ideation_cover, analytical_cover, playbook_cover,
    COMPARISON_TABLE_STYLE, DECISION_MAKER_MATRIX_STYLE, SOLUTION_FIT_TABLE_STYLE,
    CHART_PALETTE,
)
```

## Design brief

H2O Allegiant is a US wastewater Discovery Agent for BD reps. The brand register the visuals should hit:

- **Professional** — these are internal handover documents for senior BD reps and their managers. They need to read as serious analytical work, not as marketing collateral.
- **Tech** — the agent is AI-led, the analysis is structured, the rendering is modern. The aesthetic should signal current-decade software, not corporate-stuffy.
- **Water-coded** — the colour palette is a two-blue family from the logo (deep indigo navy + bright sky blue) plus a pale cyan highlight. The visuals should feel like the brand they belong to.

Three reasonable mental references for the register: Linear's documentation, Stripe's docs, Notion's published exports. Clean, opinionated, modern. Not enterprise-PowerPoint, not consumer-app-cheerful.

## Colour palette — three tiers

### Tier 1 — Primary brand colours

Drawn from the logo directly. These appear in headers, accents, and brand-identity moments.

| Token | Hex | Use |
|---|---|---|
| `BRAND_NAVY` | `#03045E` | Allegiant wordtext, primary section headers, footer text, gate/flag callout text on light backgrounds |
| `BRAND_BLUE` | `#0090F0` | H2O wordtext, droplet body, links, secondary accents, theme headers in Playbook |
| `BRAND_CYAN` | `#ADFDFF` | Droplet highlight, light background for strategic-insight callout, very subtle accent |

### Tier 2 — Functional accents

Used for gate-status traffic-light and flag-severity callouts. These are **never** primary brand colours — they are functional indicators with deliberate associations (red = stop, amber = caution, green = ready, slate = neutral).

| Token | Hex | Use |
|---|---|---|
| `GATE_OPEN` | `#15803D` | OPEN gate callout (all criteria met, ready for Assessment) |
| `GATE_CONDITIONAL` | `#D97706` | OPEN-with-conditions or CONDITIONALLY-OPEN gate callout |
| `GATE_CLOSED` | `#B91C1C` | CLOSED gate callout |
| `FLAG_STOP` | `#B91C1C` | Stop-flag callout (matches GATE_CLOSED — same severity weight) |
| `FLAG_SPECIALIST` | `#D97706` | Specialist-flag callout |
| `FLAG_ATTENTION` | `#CA8A04` | Attention-flag callout (yellow-gold) |
| `FLAG_CLEAR` | `#64748B` | "No flags" callout — neutral slate, not green (green is reserved for gate OPEN) |
| `MUTED_TEXT` | `#64748B` | Evidence tags, footnotes, captions, less-important metadata |
| `BODY_TEXT` | `#0F172A` | Body copy, full opacity, near-black with cool tone (matches navy family) |
| `LIGHT_BG_NAVY` | `#E8E9F4` | Very light navy tint, for callout backgrounds |
| `LIGHT_BG_CYAN` | `#F0FDFF` | Very light cyan tint, for strategic-insight callout background |
| `BORDER_NEUTRAL` | `#CBD5E1` | Subtle borders for tables and callouts |

### Tier 3 — Chart accent palette

Seven colours designed to coexist as series colours in charts. Use only in data visualisations; do not use as primary brand or functional accents. Order matters — use in sequence for chart series.

| Position | Token | Hex | Description |
|---|---|---|---|
| 1 | `CHART_BLUE` | `#0090F0` | Brand blue (matches BRAND_BLUE) |
| 2 | `CHART_TEAL` | `#0D9488` | Teal — pairs with blue |
| 3 | `CHART_SLATE` | `#475569` | Slate grey — neutral series |
| 4 | `CHART_PURPLE` | `#7C3AED` | Soft purple — for distinct categories |
| 5 | `CHART_GOLD` | `#CA8A04` | Muted gold (matches FLAG_ATTENTION) |
| 6 | `CHART_CORAL` | `#E11D48` | Soft coral — for negative/decline indicators |
| 7 | `CHART_FOREST` | `#15803D` | Forest green (matches GATE_OPEN) |

`CHART_PALETTE` is a list of these seven in order. When more than seven series are needed, recycle from the start with a slightly reduced opacity.

## Typography

### Font stack

Three fonts, each with a fallback:

| Token | Primary | Fallback | Use |
|---|---|---|---|
| `HEADING_FONT` | Inter Tight | Helvetica-Bold | Section headers, theme headers, cover titles |
| `BODY_FONT` | Inter | Helvetica | Body copy, callout content, table cells |
| `MONO_FONT` | JetBrains Mono | Courier | Evidence tags `[ER-001]`, document IDs, code, structured data |

### Font registration

`register_fonts()` in `brand.py` attempts to register Inter, Inter Tight, and JetBrains Mono from a standard system path (`/usr/share/fonts`, `~/.fonts`, or `./fonts` in the working directory). If the font files are not found, it falls back to reportlab's built-in Helvetica and Courier — the styling still works, just visually plainer.

The fallback is deliberate: production deployments should install the Inter and JetBrains Mono font families; development environments can run without them.

### Type scale

| Style | Size | Weight | Use |
|---|---|---|---|
| `h1` | 18pt | Bold | PDF cover title |
| `h2` | 14pt | Bold | Section headers (numbered sections) |
| `h3` | 11pt | Bold | Sub-section headers (A/B/C) |
| `body` | 10pt | Regular | Body copy, bullets |
| `body_bold` | 10pt | Bold | Section lead sentences in Analytical |
| `body_italic` | 10pt | Italic | Closing caveats, framing lines |
| `mono_small` | 9pt | Regular | Evidence tags, document IDs |
| `caption` | 9pt | Regular | Captions, table footnotes, muted metadata |
| `cover_subtitle` | 11pt | Italic | PDF cover subtitle |
| `strategic_insight` | 13pt | Italic | Strategic insight callout (centred) |

Line spacing: 1.25 for body, 1.15 for headers, 1.4 for callouts.

## Callout components

### `gate_callout(state, content)`

Coloured-bar callout for the h2o-qualification-gate status. Renders at the top of Ideation and Analytical covers.

- **Bar colour**: `GATE_OPEN` / `GATE_CONDITIONAL` / `GATE_CLOSED` depending on `state`
- **Background**: very light tint of the bar colour (5-8% opacity)
- **Border**: 1pt in the bar colour
- **Layout**: 4pt-wide vertical bar on the left, then content padded 8pt
- **Content**: title in bold (e.g., "QUALIFICATION GATE — OPEN") followed by content text

Usage:
```python
gate_callout("OPEN", "All seven criteria met across all sub-streams in this engagement. Proposed: advance to Assessment.")
gate_callout("CONDITIONALLY-OPEN", "Sub-streams A and B open; sub-stream C closed on stop-flag X.")
gate_callout("CLOSED", "Sub-stream D fails criterion 2 — NPDES fact sheet not obtained.")
```

### `flag_callout(severity, content, flags_list)`

Coloured-bar callout for the consolidated flag header from `h2o-compliance-and-safety-flagging`. Renders at the top of Ideation and Analytical covers (below the gate callout). Always present; reads "No active flags" if `flags_list` is empty.

- **Bar colour**: `FLAG_STOP` / `FLAG_SPECIALIST` / `FLAG_ATTENTION` / `FLAG_CLEAR` depending on highest active severity
- **Content**: title bar plus a structured list of flags with severity, ID, evidence pattern (one line each)

Usage:
```python
flag_callout("STOP", "Active flags affecting this engagement", [
    ("csflag-consent-decree-milestones-missed", "STOP",
     "NPDES references active decree; annual compliance report not obtained"),
    ("csflag-pfas-biosolids-ban-ignored", "STOP",
     "Customer continues land application; state status unclear; September outlet cutoff"),
])

flag_callout("CLEAR", "No active flags affecting this engagement", [])
```

### `strategic_insight_callout(text)`

Centred italic in a bordered box with light cyan background (`LIGHT_BG_CYAN`). Renders at the end of Ideation and Analytical PDFs. The single-sentence closing line from `h2o-commercial-shaping`.

- **Layout**: centred, italic, 13pt
- **Background**: `LIGHT_BG_CYAN`
- **Border**: 1pt `BRAND_BLUE`
- **Padding**: 12pt all sides

### `why_it_matters_callout(items)`

Small callout at the end of each Playbook theme. Light grey background with a thin brand-blue accent line at the top as visual anchor (replaces the emoji that an earlier draft used).

- **Title**: "Why it matters" in bold, brand navy text (no emoji, no decorative glyphs)
- **Items**: bulleted list of 2-4 short implications
- **Background**: very light grey (`#F8FAFC`)
- **Accent**: 1.5pt brand-blue line above the title

### `theme_header(number, title, framing_line)`

Playbook theme header with cycling accent colour. Each theme gets a different accent from the chart palette so themes are visually distinguishable when flipping through.

- **Theme number**: large (20pt) in chart palette colour for that theme
- **Title**: 14pt bold in `BRAND_NAVY`
- **Framing line**: italic 11pt in `MUTED_TEXT`

Theme number → accent colour mapping cycles through `CHART_PALETTE` positions 1-7, with themes 8-11 reusing positions 1-4 at reduced opacity (60%).

## Cover block templates

Three cover templates, one per PDF artefact. Each takes a header line, title, subtitle, and engagement-level metadata (sub-streams covered, label), plus the gate and flag callouts (Ideation and Analytical only; Playbook has no callouts).

### `ideation_cover(header_line, title, subtitle, substreams, gate_state, gate_content, flag_severity, flag_content, flags_list)`

- Header line at top (small, muted)
- Title large bold (e.g., "Ideation Brief — Wet-weather + biosolids cluster")
- Subtitle italic ("A consultant's first read — help you see the opportunity")
- Sub-streams covered (one line, small muted)
- Gate callout
- Flag callout
- Then the content begins

### `analytical_cover(...)`

Same structure as Ideation cover with different title ("Analytical Read — ...") and subtitle ("The evidenced case behind the ideation").

### `playbook_cover(header_line, title, subtitle, substreams, orientation_line)`

Cover without gate/flag callouts (Playbook is a tool, not a record). Includes the orientation line: "The killer questions are in Theme 11. The questions you need to ask first are in Theme 1."

## Table styles

Three pre-defined reportlab `TableStyle` objects for the most common table types in the reports.

### `COMPARISON_TABLE_STYLE`

For side-by-side comparison tables (sub-stream vs sub-stream, time-period vs time-period, before vs after).

- Header row: `BRAND_NAVY` background, white text, bold
- Body rows: alternating `#FFFFFF` and `#F8FAFC` (zebra stripe)
- Grid: 0.5pt `BORDER_NEUTRAL`
- Changed-value cells: caller can override with `('BACKGROUND', cell, BRAND_CYAN)` for visual emphasis
- Padding: 6pt all sides

### `DECISION_MAKER_MATRIX_STYLE`

For the role × decision-domain matrix in the Analytical's Section 4.

- Header row: `BRAND_NAVY` background, white text
- Header column: `LIGHT_BG_NAVY` background, `BRAND_NAVY` text
- Body cells: white background, cell content can be ✓ / ⊘ / — / "engaged" / "scheduled" / "not yet"
- Grid: 0.5pt `BORDER_NEUTRAL`

### `SOLUTION_FIT_TABLE_STYLE`

For the solution-options × sub-stream fit table in the Analytical's Section 3.

- Header row: `BRAND_NAVY` background, white text
- Body rows: white background
- Fit-indicator cells (✓ / borderline / ✗) use coloured background: `GATE_OPEN` light tint for ✓, `GATE_CONDITIONAL` light tint for borderline, `GATE_CLOSED` light tint for ✗

## Usage rules

- **Never define colours or fonts directly in `h2o-discovery-reporting`.** Always import from `brand.py`. If a needed primitive isn't there, add it to `brand.py` first, then consume it.
- **Brand navy and brand blue are not interchangeable with functional accents.** Headers and brand identity use navy/blue/cyan; gate status uses green/amber/red; flag severity uses red/amber/yellow-gold/slate.
- **The chart palette is for data viz only.** Don't use chart palette colours as primary brand elements.
- **Font fallback is acceptable but production deployments should install Inter and JetBrains Mono.** The reporting skill works with Helvetica/Courier fallback; the visual register is just plainer.
- **Callout backgrounds should always be very light tints** (5-8% opacity equivalent). Saturated backgrounds dominate the eye and undermine readability of the body text inside.
- **Strategic-insight callout uses `LIGHT_BG_CYAN`** — this is the only place cyan appears as a background. Reserve it for that moment of emphasis.

## What this skill never does

- **Does not render PDFs itself.** It provides primitives; the reporting skill renders.
- **Does not define content.** Content comes from upstream skills; brand defines presentation.
- **Does not override the reporting skill's structural decisions.** Section ordering, content selection, output tier are reporting decisions; the brand skill provides the visual primitives those decisions render through.
- **Does not change colours or fonts per-opportunity.** The brand system is fixed across all H2O Allegiant outputs. The reporting skill cannot override.
- **Does not appear in agent chat output.** This skill operates only at PDF rendering time. The agent never references "brand" in user-facing communication.

## File structure

```
h2o-allegiant-brand/
├── SKILL.md          (this file)
└── brand.py          (Python module — colours, fonts, callouts, styles)
```

`h2o-discovery-reporting` imports primitives from `brand.py` directly. No other skill consumes this one.
