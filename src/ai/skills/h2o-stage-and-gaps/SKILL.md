---
name: h2o-stage-and-gaps
description: Classify the current deal stage (Lead → Qualify → Scope → Position → Propose → Close) and produce the stage-conditional gap list — what's Required to advance to the next stage and what's Nice-to-have. Replaces v2's separate h2o-deal-stager and h2o-discovery-gap-analysis skills. Always returns a stage and always advances; never blocks downstream skills. Handles regression as a first-class case. Surfaces stage tension when evidence is ambiguous. Trigger after h2o-evidence-and-context. Also trigger when the field agent asks "what stage is this", "what do we need to advance", "did this deal stall", or "what's missing". Confidence-labelled output (HIGH / MEDIUM / LOW). Feeds the stage badge on the Field Brief and the advance criteria that calibrate Section 4's actions.
---

# Stage and gaps — classify the stage, name what's missing to advance

Your job is to (a) classify where the deal is in the BD pipeline and (b) name what's Required to advance to the next stage versus what's Nice-to-have. v3 merges these because gap analysis is intrinsically stage-conditional — Required at Qualify is different from Required at Position.

You replace v2's separate `h2o-deal-stager` and `h2o-discovery-gap-analysis` skills. The architectural rationale: the gap list is calibrated against the advance criteria, so producing them as one integrated output cuts a reasoning round without losing fidelity.

## When to run

After `h2o-evidence-and-context` has produced the integrated context record. Before `h2o-positioning`.

Also trigger when the field agent asks any of:

- "What stage is this" / "Where are we in the deal"
- "What do we need to advance" / "What's missing"
- "Is this ready to propose" / "Can we close this"
- "Has this stalled" / "Did the deal regress"
- "What's the next step" (when about pipeline progression)

## Stage classification — the model

Six stages, always-advance pattern (no OPEN/CLOSED gate). Stages can regress as a first-class case.

### Lead
Inbound interest with limited detail; one-way information flow; identifiable customer but unidentified decision-makers; no documented case file. **Advances to Qualify** when a real conversation produces a case file or shared evidence with at least one decision-maker identified by role.

### Qualify
Documented problem statement; lens classification supported by evidence; decision-makers identified by role; the field agent has enough to position. *Most common starting stage.* **Advances to Scope** when the customer agrees to engage on the work itself — agreeing to a scoping discussion, site visit, or paid scoping engagement.

### Scope
Customer engaged on the work. Conversation is about *what* would be built. Solution architecture being discussed; budget envelopes or capital cycle surfaced; procurement vehicle identifiable. **Advances to Position** when the customer is comparing alternatives (us vs other vendors, us vs internal options, us vs the cheap-path approach).

### Position
Competing for the deal. Customer evaluating alternatives. Cost-of-alternative argument is existentially important here. **Advances to Propose** when the customer commits to evaluating a formal proposal (shortlisted, invited to sole-source, asked to respond to RFP).

### Propose
Formal proposal on the table. Pricing, scope, terms, contract structure being negotiated. **Advances to Close** when the customer signals commercial intent to award (verbal, written, LOI, evaluation-committee recommendation, Board/Council approval).

### Close
Final negotiation and execution. Award signalled. No further advance — deal becomes operational.

## Regression — first-class case

A deal can move backwards. When evidence supports regression, classify the *current* stage and name the regression explicitly. Common patterns:

- Decision-maker change (engaged decision-maker leaves, promoted, replaced)
- Competitor pre-empts (adjacent vendor captures budget or relationship)
- Budget freeze (capital cycle reprioritises or freezes)
- Regulatory pivot (driver that motivated the deal changes)
- Framing battle re-lost (customer's framing reasserts itself)
- Stall (no engagement for 60-90 days industrial / 6+ months municipal)

When regression occurs, name: prior stage reached, current stage post-regression, trigger, re-engagement criteria (distinct from new-deal advance — re-engagement usually requires direct outreach, sometimes via a different decision-maker).

## Stage tension

When evidence supports two adjacent stages and you can't pick cleanly, classify the more conservative stage as primary and name the tension. Use sparingly — only when the evidence genuinely supports both, not as a hedge.

## Gap analysis — stage-conditional

For each sub-stream, list gaps in two categories:

### Required (blocks advancement to the next stage)
The specific things that need to happen for the deal to move forward. Concrete, testable, action-shaped.

At **Lead**: who is the decision-maker(s)? What is the actual problem? Is there a real opportunity here or just inbound noise?

At **Qualify**: confirming flows / mass loading / specific operational facts that pin sizing. Confirming the customer's regulatory posture (NOV received, Consent Order pending, informal warning). Naming the corporate-level approver for the deal size we're proposing. Confirming the customer is willing to engage on the work itself.

At **Scope**: confirming the procurement vehicle (CWSRF / capex / grant / P3 / EaaS). Confirming budget envelope alignment. Confirming who else (vendors, internal alternatives) is in the conversation. Confirming the phase-2 horizon and customer awareness.

At **Position**: confirming the customer's evaluation criteria. Confirming our differentiator from the named or implied competitors. Confirming the customer's decision deadline.

At **Propose**: confirming all term-sheet anchors (pricing structure, schedule, risk-sharing, payment terms). Confirming who signs and on what authority.

At **Close**: contract redlines, mobilisation readiness, kick-off scheduling.

### Nice-to-have (would improve positioning, pricing, or optionality)
Things that would strengthen the deal but don't block advancement. Stage-conditional; typically:

- Historical performance data from comparable customer sites
- Funding-pathway-fit analysis (CWSRF priority list eligibility, grant deadlines)
- Operator skill-level / training context (informs ongoing-support sizing)
- Competitive intelligence (what specific named competitor proposed last time)
- PFAS speciation detail (informs phase-2 sizing precision)

## Output contract — what you produce

A single structured **stage and gaps record** with these components, in this order:

### 1. Primary stage
One of: `Lead` / `Qualify` / `Scope` / `Position` / `Propose` / `Close`.

### 2. Confidence label
`HIGH` / `MEDIUM` / `LOW`.

### 3. Stage signals
3-6 bullet items naming the specific evidence that placed the deal at this stage. The field agent uses this to sanity-check the classification.

### 4. Stage tension note (when applicable)
When MEDIUM confidence is driven by genuine ambiguity between two adjacent stages, name both and what would resolve it.

### 5. Regression flag (when applicable)
Prior stage reached, current stage, trigger, re-engagement criteria.

### 6. Required gaps — per sub-stream
What blocks advancement. Concrete and testable. These feed Field Brief Section 4's actions.

### 7. Nice-to-have gaps — per sub-stream
What would strengthen the deal. These feed the Analytical Read's "open Discovery agenda."

### 8. Top 3 opportunity-level questions
The three highest-leverage questions to put to the customer in the next conversation. Drawn from the Required gap list, ranked by what would most advance the deal. These feed the Playbook's primary theme and the Field Brief's action #1.

### 9. Stage-specific risk anchors
1-3 risk anchors specific to this stage (e.g., framing battle at Qualify, competitor pre-empt at Scope, decision-maker change at Position). These feed positioning's kill-risk reasoning.

## Stop conditions

Stop when:

- Primary stage is classified with a confidence label
- Required gaps are listed (most opportunities have 2-5 Required gaps per sub-stream; if you're listing 10+, you're treating Nice-to-have as Required)
- Top 3 questions are named
- Stage-specific risk anchors are named (1-3 per stage)

**Do not continue elaborating** to produce additional context. Positioning consumes what this skill produces.

## Discipline

- **Always return a stage.** Never "between stages" without picking one as primary.
- **Required vs Nice-to-have is a real distinction.** Required blocks advancement; Nice-to-have improves the deal. If you're tempted to put everything in Required, you're not separating them correctly.
- **Top 3 questions are *opportunity-level*** — they apply to the customer-side conversation, not the analytical inquiry. "What's the city's enforcement posture?" is a top-3 question; "what's the EQ-tank pH baseline?" is a Nice-to-have Discovery question.
- **Confidence labels are honest.** LOW stays LOW.
- **Stage classification reflects where the deal is; gap analysis reflects what's missing.** A deal at Qualify with a clean gap list advances to Scope; a deal at Qualify with an open gap stays at Qualify until the gap closes.

## Handoff

Your output is consumed by:

- `h2o-positioning` — uses stage (for confidence ceiling on sizing), stage signals (for the customer behaviour read continuation), Required gaps (for the primary win frame), top 3 questions (for the Playbook), stage-specific risk anchors (for kill-risk reasoning)
- `h2o-field-brief` — uses stage (for the stage badge), regression flag (for the cover block note), Required gaps and top 3 questions (for Section 4's actions), advance criteria (calibrating action #1 as stage-advancing)

## What this skill does NOT do

- Does not produce sizing — that's `h2o-positioning`
- Does not produce solution architecture — that's `h2o-positioning`
- Does not produce flag inventory — that's `h2o-evidence-and-context`
- Does not render any artefact — that's `h2o-field-brief`
- Does not block downstream skills. Even at Lead with LOW confidence, positioning and field-brief run normally with appropriately conservative output.
