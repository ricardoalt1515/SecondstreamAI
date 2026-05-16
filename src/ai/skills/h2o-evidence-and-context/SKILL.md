---
name: h2o-evidence-and-context
description: Read the case file in a single integrated pass and produce the contextual picture the downstream skills need — sub-stream decomposition, lens classification, evidence extraction, customer behaviour read, and the active flag inventory. Replaces v2's separate segmentation-router, water-evidence-interpretation, solution-lens-light, and compliance-and-safety-flagging skills. One pass, one integrated output, depth scaled to deal stage. Trigger at the start of every substantive turn that involves new evidence (case file upload, new document, customer email, call recap) or any opportunity-advancing request. Skip for focused conversational questions that don't reference new evidence. Always produces the integrated context record; never blocks downstream skills. Lean — depth scales with stage (Lead/Qualify run light, Position/Propose run deep).
---

# Evidence and context — read the case file once, produce the integrated picture

Your job is to read the case file (and any new uploads / recaps / emails since the last turn) and produce in **one integrated pass** the contextual picture the downstream skills need to position and render the Field Brief.

You replace four v2 skills with one. The architectural rationale is: those four skills' separate structured outputs were rarely consumed independently — they all fed into positioning's integrated reasoning. Producing them as four separate structured artefacts cost reasoning rounds that didn't add value at the final output. v3 does the integrated read once.

## Stage-conditional depth

How deep you go is conditional on the deal stage (which `h2o-stage-and-gaps` will refine after this skill runs — but you can usually tell from the case file whether the opportunity is early or late). The discipline:

- **Lead / Qualify** — light pass. Decompose sub-streams, classify lenses, extract the load-bearing facts (parameter exceedances, regulatory driver, decision-maker landscape, key hazards). Don't catalogue every datum in the case file; surface what changes the field agent's next conversation.
- **Scope / Position** — medium pass. As above plus competitive-positioning evidence, evidence of customer's procurement vehicle, evidence of phase-2 readiness.
- **Propose / Close** — deep pass. As above plus negotiation-relevant detail (term-sheet signals, customer-side concerns surfaced, internal alignment signals).

If the stage is unclear when you start, default to **Qualify-depth** unless the evidence base obviously supports going deeper. Most opportunities you see will be Qualify or early Scope.

## When to run

At the start of any substantive turn that involves new evidence:

- Case file uploaded for the first time
- New document (SDS, eDMR, lab report, RFI, call recap, customer email) uploaded mid-opportunity
- The field agent describes evidence verbally that hasn't been captured yet ("I just got off the call, here's what they said...")
- Any explicit Field Brief generation request (re-read the case file in case anything has changed)

**Skip this skill for focused conversational questions** that don't reference new evidence ("what's the F006 exposure here?" / "is this a CWSRF candidate?" / "how big is this deal directionally?"). The agent answers from the existing context record without re-running this skill.

## What you produce — the integrated context record

A single structured record with these named components, produced in this order:

### 1. Sub-stream decomposition

The opportunity broken into distinct sub-streams (one customer can have multiple — e.g., Prairie has acid/metals pretreatment compliance, legacy cyanide safety, PFAS source control). For each sub-stream:

- **Lens** (one of: municipal-wet-weather / industrial-discharge / advanced-reuse / nrw / biosolids-residuals / stormwater-ms4 / decentralized-onsite)
- **Sub-case** within the lens (e.g., `industrial-discharge / categorical-pretreatment-compliance`)
- **Role profile** — the customer-side roles in scope for this sub-stream (e.g., environmental manager, plant superintendent, corporate EHS for Prairie's acid/metals sub-stream)
- **One-sentence description** of what this sub-stream is, in evidence terms

When sub-stream decomposition is ambiguous, default to the smaller number of sub-streams (one is fine; force a split only when the evidence supports it).

### 2. Evidence extraction — load-bearing facts only

The facts from the case file that change the field agent's next conversation. Not everything in the documents; just the facts that matter. Per sub-stream where relevant:

- **Parameter exceedances or operational facts** (e.g., "WW-01 24-hour composite: hex chrome 3.4×, nickel 3.1×, zinc 3.0×, cyanide 1.72× local limits")
- **Regulatory driver** (e.g., "indirect discharger to municipal POTW under 40 CFR Part 433")
- **Hazard pathways** (e.g., "documented EQ-tank pH 4.2 + legacy cyanide line = active HCN-evolution pathway")
- **Specific evidence anchors** that positioning will use for sizing (mass loading observed, flow estimates, treatment-train configuration mentioned)
- **Documented decision-maker statements or framings** (e.g., "customer's email frames as 'three abnormal events'")

If the evidence base has a key detail the field agent has *not yet supplied*, name it as a gap rather than inventing it. ("Plant flow rates not yet in evidence — sizing range widens accordingly.")

### 3. Customer behaviour read

One paragraph (3-5 sentences). The interpretive read — what the customer's posture, language, or offer-shape reveals about how they see the situation. This is the single highest-value output of this skill. Examples:

- "Customer frames the discharge events as 'three abnormal events' but the WW-01 composite shows exceedances on seven of nine parameters — the 'events' framing serves the upcoming compliance conversation as much as the operational reality."
- "Two of three lens decision-makers are absent from these calls — operations and finance leads haven't been in the room. Without them, every conversation reaches a 'we'll need to check with X' wall."
- "Utility director frames everything as 'rate impact' — that's the lens the board reads through; messaging needs to anchor on rate-stability, not technology novelty."

This read seeds positioning's primary win frame and the Field Brief's Section 1 insight box.

### 4. Active flag inventory

Flags surfaced by the evidence base, with severity and status. Categories from v2 preserved:

- **STOP flags** (red) — active safety hazard, regulatory crisis-level exposure, criminal-liability tail. Examples: HCN evolution pathway, imminent NOV exposure, OSHA reportable.
- **SPECIALIST flags** (amber) — material risk that requires deliberate handling but isn't crisis-level. Examples: pending regulatory horizon (PFAS rule), single-source-vendor risk, decision-maker absence.
- **ATTENTION flags** (yellow) — watch but not currently actionable. Examples: stale evidence in the case file, ambiguous regulatory boundary.

For each flag: severity, one-sentence description, evidence basis. The Field Brief renders STOP flags above the cover block; SPECIALIST flags inform kill-risk reasoning in positioning; ATTENTION flags surface in the Analytical Read only.

## Stop conditions — when you're done

Stop when:

- All sub-streams in the evidence base have been decomposed and lensed
- Each sub-stream has its load-bearing facts extracted
- The customer behaviour read is one paragraph (not more)
- The flag inventory is complete relative to evidence — don't fabricate flags to look thorough

**Do not continue elaborating** to produce structured context the downstream skills haven't asked for. Positioning consumes what this skill produces; if positioning later needs more, it will request a re-read.

## Discipline

- **Read the case file once.** Don't re-extract evidence on every sub-stream. Build a single map of the evidence in working memory; reference it across sub-streams.
- **Don't reproduce the case file.** Extract facts; don't summarise paragraphs. The field agent already has the case file.
- **Roles, not names.** Decision-makers as roles ("the environmental manager," "the corporate EHS approver"). Never invent names.
- **Lens cheat-sheet ranges are the unit economics floor.** Don't anchor on specific dollar figures from the case file unless they're documented; otherwise reason from the lens.
- **Surface conflicts.** When the customer's framing and the evidence disagree, name the conflict in the customer behaviour read. The disagreement is usually where the deal is won or lost.
- **Don't classify the stage here.** That's `h2o-stage-and-gaps`. You produce evidence and context; the stager classifies based on the integrated picture.

## Handoff

Your output is the integrated context record. It's consumed by:

- `h2o-stage-and-gaps` — uses sub-stream decomposition and evidence base to classify stage and surface gaps
- `h2o-positioning` — consumes the customer behaviour read, sub-stream decomposition, lens classifications, and flag inventory to produce the positioning record
- `h2o-field-brief` — surfaces STOP flags above the cover block, uses the customer behaviour read for Section 1's insight box

## What this skill does NOT do

- Does not classify the deal stage — that's `h2o-stage-and-gaps`
- Does not produce sizing or commercial reasoning — that's `h2o-positioning`
- Does not produce gap analysis (Required vs Nice-to-have) — that's `h2o-stage-and-gaps`
- Does not render the Field Brief — that's `h2o-field-brief`
- Does not run on every conversational turn — only when there's new evidence or an opportunity-advancing request
