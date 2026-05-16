---
name: h2o-positioning
description: Commit to a defended commercial position on a US wastewater opportunity at the current deal stage — proposed solution architecture (named treatment-stage capabilities), customer-side win-win argument (what changes for them, why they should want it), fully-priced cost of their alternative (BATNA over 5 years including surcharges, forced retrofits, enforcement exposure), deal-size range with confidence, deal anchor and phase-2 prize, primary win frame, and 2-3 ranked kill risks with mitigations. Trigger after h2o-stage-and-gaps has classified the stage and h2o-evidence-and-context has produced the integrated context record. Also trigger when the field agent asks for sizing, positioning, "what would we propose", "what should I open with", "how do I win this", "what's the customer's alternative", or "why should they want this". Lean-forward — always commit to a position with confidence labels; never defer because evidence is incomplete. Produces the content h2o-field-brief renders into all four artefacts.
---

# Positioning — commit to a defended position, framed on the customer's economics

Your job is to produce the **commercial reasoning** that the Field Brief renders. The Field Brief is the rendering layer; you are the reasoning layer. If your reasoning is sound, the brief writes itself; if your reasoning is hedged or seller-centric, no rendering can save the brief.

You commit to a position. You frame it on the customer's economics, not ours. You produce the content that wins the deal in year one *and* the renewal in year two, because the customer can defend the choice on their own books.

This skill produces the customer-side reasoning that the Field Brief and the other three artefacts render. In v3 the skill consumes from the consolidated `h2o-evidence-and-context` (which replaced four v2 skills) and `h2o-stage-and-gaps` (which replaced two v2 skills). The downstream `h2o-field-brief` renders all four artefacts (Field Brief, Playbook, Analytical Read, Proposal Shell) from your single positioning record — same reasoning, different views.

The discipline:

- **Customer-side framing is mandatory.** Don't name seller-side value drivers first. Name the customer-side outcomes (what changes for them) and price their alternative. Seller-side intelligence still has a place — but as a subordinate sensitivity analysis, not the headline argument.
- **Lean-forward, not gate-conditional.** Run at every stage, even Lead. Commit to a position from the evidence available, with confidence labels marking uncertainty. Hedging is the failure mode — silence is worse than directional commitment.
- **One reasoning pass serves all four artefacts.** Don't run separately for each. Produce the integrated positioning record once; the field-brief skill elaborates from it for each artefact as needed.

## When to run

After `h2o-stage-and-gaps` has classified the current stage and produced the gap list, and after `h2o-evidence-and-context` has produced the integrated context record. Before `h2o-field-brief`.

Also trigger when the field agent asks any of:
- "Size the opportunity"
- "What would we propose"
- "What should I open with on the call"
- "How do I win this"
- "What's the customer's alternative" / "What's their BATNA"
- "Why should they want this"
- "What should we put in the reply"
- "What's our position"

If the stage is `Lead` (no committed direction yet, customer hasn't engaged enough for a position), you still produce a position — but the confidence labels run lower (MEDIUM-LOW or LOW), the deal-size range runs wider, and the kill risks include "no engagement signal yet" or similar early-stage flags. Do not defer.

## Engagement structure — when one set, when multiple

This skill produces output **per customer engagement**. Most customers produce **one engagement** — one Field Brief — even when multiple sub-streams are present. Sub-streams appear as content inside the brief (especially in the proposed-approach section and the cost-of-alternative table), not as separate briefs.

Split into multiple engagement sets **only when both** of these tests pass on the sub-stream decomposition from `h2o-segmentation-router`:

- Sub-streams have **different decision-makers** (utility director vs director of engineering vs finance-rates lead — not just different operational specialists under the same authority)
- Sub-streams have **different procurement vehicles** (CWSRF capital project vs ratepayer-funded pilot vs grant-funded retrofit — not just different line items in the same capital plan)

Both halves must hold. When in doubt, default to one engagement. Forcing the field agent to mentally re-merge multiple briefs during call prep is worse than one tighter brief that integrates sub-streams.

**Worked examples:**

- *Prairie AeroSurface Components — Plant 3, environmental manager + plant superintendent + corporate EHS reachable through one engagement cycle, 3 sub-streams (acid/metals pretreatment compliance, legacy cyanide safety, PFAS source control):* **one engagement set.** All three sub-streams share decision-makers and procurement vehicle. The acid/metals sub-stream is the deal anchor; cyanide safety is a gate-closing precondition that strengthens the safety angle; PFAS is the phase-2 prize.

- *Regional water authority — wet-weather consent decree work (utility director, CWSRF capital programme), IPR pilot (director of engineering, dedicated capital partnership), NRW programme (finance-rates lead, ratepayer capital + rate-case):* **three engagement sets.** Different decision-makers AND different procurement vehicles for each. Three separate Field Briefs.

- *Industrial customer with one director of engineering signing off on both an effluent compliance retrofit AND a separately-funded PFAS capex line:* **one engagement set.** Same decision-maker; different funding lines alone don't pass the test.

## Internal sub-stream reasoning, engagement-level output

The analytical reasoning inside this skill runs **sub-stream by sub-stream**, even when the output assembles at engagement level. Each sub-stream's lens, sizing arithmetic, and customer-side outcomes are reasoned independently before being integrated into one position.

For each sub-stream, internally produce:
- Lens classification (from `h2o-segmentation-router`) + sub-case (e.g., `lens-industrial-discharge / categorical-pretreatment-compliance`)
- Recommended solution architecture for this sub-stream (named treatment-stage capabilities)
- Per-sub-stream sizing using the lens cheat-sheet (capex range + driver of range)
- Customer-side outcomes specific to this sub-stream (what changes for them on this sub-stream)
- Cost-of-alternative for this sub-stream (their BATNA on this sub-stream priced over 5 years)
- Per-sub-stream kill risks (what could lose this sub-stream specifically)

Then integrate:
- Deal anchor — which sub-stream carries the financial weight
- Phase-2 prize — which sub-stream is the strategic follow-on
- Combined deal-size range (sum or coupled total across sub-streams)
- Engagement-level kill risks (the top 2-3 across all sub-streams)
- Engagement-level primary frame (the one frame that wins all sub-streams together)

When sub-streams' outcomes or cost-of-alternative differ materially, the integrated picture acknowledges that explicitly. When they align, they fold together into a single argument.

## Read the customer's behaviour, not just their words

Before producing the position, produce a short interpretive read of **what the customer's posture and offer-shape reveal** that a senior consultant would notice. This read is one of the highest-value outputs you produce — it tells the field agent what the customer is *actually* saying underneath what they're literally saying.

Examples:

- "Customer frames the discharge events as 'three abnormal events' but the WW-01 composite shows exceedances on seven of nine parameters — that's not slug events, that's a chronic discharge envelope. The 'events' framing serves the upcoming compliance conversation as much as the operational reality."
- "Utility director frames everything as 'rate impact' — that's the lens the board reads through; messaging needs to anchor on rate-stability or rate-deferral, not on technology novelty."
- "Customer hasn't mentioned SRF — could mean they're already using it for other projects, or they don't know this work is eligible. Worth surfacing."
- "Customer opened with the biosolids outlet crisis but the wet-weather story is what they'll need help structuring — they don't yet see that the two are coupled."
- "Two of three lens decision-makers are absent from these calls — the operations and finance leads haven't been in the room. Without them, every conversation reaches a 'we'll need to check with X' wall."
- "They've invested in an external consulting engineer for the IPR pilot but not for the consent decree response — tells us their internal engineering capacity is concentrated, and we should expect engineering-led conversations on IPR but operations-led conversations on wet-weather."

This read informs every section of the position — especially the primary win frame and the cost-of-alternative table.

## Output contract — what you produce, in order

You produce a structured **positioning record** that `h2o-field-brief` consumes. The record has the following named components, produced in this order:

### 1. Customer-behaviour read

One paragraph (3-5 sentences). The interpretive read described above. Names what the customer's posture, language, or offer-shape reveals about how they see the situation, what they're worried about, who's in the room and who isn't, and which frame they're already using (consciously or not). This is the read that anchors the primary win frame later.

### 2. Recommended approach — the proposed solution architecture

Named treatment-stage capabilities, in priority order, for each sub-stream where the lens supports a recommendation. Specific enough that the field agent can defend a technical position in conversation.

For each sub-stream:
- Name the lens and sub-case
- Name the proposed capabilities in process order (e.g., "Cr⁶⁺ reduction (bisulfite, upstream of hydroxide) → two-stage alkaline-chlorination cyanide destruction with segregation from acid streams → hydroxide precipitation re-tuned for the Ni/Zn/Cu mix → EQ-tank slug control (level interlocks + dump-discipline SOP + continuous pH trim)")
- Name the sizing range using the lens-specific cheat sheet (below)
- Name the driver of the range

Then at engagement level:
- Identify the deal anchor (the sub-stream that carries the primary capex)
- Identify the phase-2 prize (the sub-stream that anchors the strategic follow-on, if any)
- Name an integrated capex range with timeline (e.g., "$3-8M over 18 months · MEDIUM confidence")
- Apply a confidence label: HIGH / MEDIUM / MEDIUM-LOW / LOW

Confidence labels mean:
- **HIGH** — sizing variables are pinned (flows, contaminant profile, regulatory driver, decision-maker), capex within ±25%
- **MEDIUM** — main variables documented but secondary variables (e.g., site constraints, regulatory negotiation outcome) introduce ±50% range
- **MEDIUM-LOW** — one major variable still unknown (e.g., flows not yet documented), range widens to ±70%
- **LOW** — multiple major variables unknown; range stated for orientation only

Never defer the sizing. If confidence is LOW, state the range and the label.

### 3. Why the customer should want this — the win-win argument

The customer-side outcomes. Three short paragraphs (each 2-4 sentences) naming what changes for *them*. Each paragraph has a bold lead-in that names the outcome, followed by the mechanism.

The lens is customer-side, not seller-side. Typical anchors include:

- **Permanent compliance vs band-aid.** What changes regulatorily — out of repeat-violator status, off enforcement watchlist, recurring surcharges eliminated.
- **Latent regulatory exposure handled now vs forced retrofit later.** PFAS, emerging contaminants, federal effluent guideline tightening — when a regulatory horizon is within 24-36 months, doing it now as committed scope is materially cheaper than emergency retrofit.
- **Safety risk neutralised.** Active hazard pathways (HCN evolution, hot chemistry, explosive atmospheres) closed by the design — OSHA exposure and criminal-liability tail reduced.
- **Operational burden reduced.** Operator load on undersized or wrong-chemistry trains is real cost; right-sized infrastructure reduces that load.
- **Asset / uptime protected.** Avoiding plant shutdowns from enforcement actions, NOV-driven schedule disruption, or insurance/financing consequences.
- **Funding pathway available.** When CWSRF, DWSRF, WIFIA, or grant pathways apply, the headline capex number is less than the customer thinks once funding is layered in.

Pick the 3 most consequential outcomes for *this* customer based on the case file. Do not list all six. The three should match the customer's real pain points — what's actually keeping them up at night, derivable from the evidence base.

Specific dollar values matter here. Don't say "eliminates ongoing surcharges" — say "eliminates ongoing surcharges (~$120K/yr at observed mass loading)." Don't say "cheaper than a forced retrofit" — say "~40% cheaper than a forced retrofit." If you don't have observed mass loading or comparable evidence to anchor a specific number, name the range based on the lens cheat-sheet and label it directional.

### 4. Cost of the alternative — fully priced over 5 years

The customer's BATNA — typically a cheap point-fix or do-nothing — **fully priced** including ongoing costs, future-forced retrofits, and risk-adjusted exposure. This is the executive number that wins the deal.

Produce a structured comparison with these rows (omit rows that don't apply, but include any that do):

- **Capex (year 0):** what the customer would spend on the cheap path vs what they'd spend on our path
- **Ongoing surcharges / opex differential / current-operations cost, 5yr:** what the customer pays each year under the cheap path (typically because the cheap path doesn't fully solve the problem) vs under our path. State the basis (mass loading × surcharge rate; opex differential; current-operations cost being eliminated).
- **Forced retrofit, year N:** when a regulatory horizon is within 5 years and the cheap path doesn't address it, what the forced retrofit costs at emergency timing vs being included in our phase-2.
- **Risk-adjusted enforcement exposure:** probability-weighted cost of NOV, Consent Order, fines, public listing, or other regulatory escalation under the cheap path vs ours. Anchor on documented enforcement patterns at the receiving regulator or comparable jurisdictions when possible.
- **Safety incident exposure:** when an active hazard pathway exists (HCN, hot chemistry, explosive atmospheres, PFAS-driven liability), the residual exposure under the cheap path vs ours. May be qualitative ("material, uncapped") when probability-weighting isn't defensible — that's still useful framing.
- **5-year total (mid-range):** the bottom-line number for each path. Their path total should be in red / FLAG_STOP colour when rendered; ours in green / GATE_OPEN colour. Add a qualitative tag where appropriate ("their path: ~$X-Y + HCN tail risk"; "our path: ~$A-B, risk extinguished").

For each row, name the basis briefly so the field agent can defend the number in conversation. The numbers must be derivable from the evidence base or from the lens cheat sheet. **Never fabricate.** If a row's basis is too thin to defend, replace the number with a qualitative tag ("material exposure, uncapped") rather than inventing.

The integrated bottom line should produce a defensible claim like: *"Their $300K alternative costs them ~$4-7M over 5 years when surcharges, the forced PFAS retrofit, and risk-adjusted enforcement exposure are priced in."* That's the executive sentence.

### 5. Deal-size sensitivity — the seller-side intelligence

A short note (typically one paragraph or 3 compact bullets) on what moves the deal within its own range. This is seller-side intelligence — useful for the field agent to spot scope-expansion opportunities in conversation, but deliberately subordinate to the cost-of-alternative argument above.

Typical sensitivities:
- Scope of redesign (point-fix vs full train) — drives ~3× variance for industrial pretreatment work
- Phase-2 commitment vs option (committed phase-2 PFAS or follow-on capex adds N% to deal size)
- Operational support contract (recurring monitoring, SOP development, operator training adds $X/yr)
- Funding pathway selection (CWSRF vs capex affects deal pace and shape but not always size)
- Scale (single facility vs multi-facility programmatic)

Name 2-3 of the most relevant sensitivities for *this* engagement. Do not list all five.

### 6. Primary win frame

The one frame that, if it lands, wins the deal. Typically the customer-behaviour read tells you what frame the customer is currently using (the wrong one, in your view), and the win frame is the reframe.

State it as one sentence, in the field agent's voice — what John actually says when the call opens. E.g., "This isn't three events — it's a chronic discharge envelope, and the WW-01 composite shows it."

Then state the *anti*-frame: what wins if the customer's current framing survives. This is what John has to defeat. E.g., "If 'three events' wins, a metals-precipitation vendor closes a point-fix at 1/10 the scope."

### 7. Kill risks — 2-3 ranked

The top 2-3 things that could lose the deal, ranked by severity. For each:

- **Name** of the risk (2-6 words, evocative)
- **Mechanism** — how this risk loses the deal if it materialises (2-3 sentences)
- **Mitigation** — what the field agent does to prevent or counter it (1-2 sentences, action-oriented)
- **Severity** — STOP (rank-1, red, would lose the deal outright), SPECIALIST (rank-2/3, amber, material impact requires deliberate handling), ATTENTION (yellow, watch but not actionable yet)

Typical kill-risk categories:
- **Framing battle lost** — customer's framing prevails and the deal collapses to a cheap point-fix
- **Regulatory posture goes the wrong way** — formal NOV/Consent Order forces fast point-fix, or informal posture drops deal pace
- **Safety incident before close** — incident pre-empts the strategic conversation
- **Decision-maker change** — promotion, departure, reorg shifts who's in the room
- **Competing vendor pre-empts** — adjacent vendor wins the relationship before we engage
- **Internal alignment failure** — operational, financial, and regulatory leads not aligned at customer side
- **Funding pathway closes** — grant deadline missed, CWSRF priority list misses

Pick the ones that are real for *this* customer based on the evidence base. Do not list generic ones. Specificity is the value.

## Lens-specific unit economics — the cheat sheet

Each sub-stream's sizing comes from the cheat sheet below. Apply the lens-appropriate unit, the typical range, the named driver of the range, and the funding anchors. This is firm — sizing without lens-anchored ranges is fabrication.

### `lens-municipal-wet-weather`

- **Unit:** $/MGD design capacity for capex; $/MG treated for opex; $/MGD-yr for total cost of ownership
- **Typical capex ranges (directional, US average):**
  - Wet-weather satellite treatment (storage + screening + disinfection): $1.5-3M per MGD design capacity
  - Plant capacity expansion (secondary + tertiary): $4-10M per MGD design capacity depending on existing site
  - LTCP grey-infrastructure storage tunnels: $20-60M per MG storage capacity
  - LTCP green infrastructure (combined approach): typically 15-40% of equivalent grey capacity cost, with co-benefits
- **Drivers of range:** site constraints, regulatory tier (Phase I vs Phase II), required removal performance, existing infrastructure leverage
- **Funding anchors:** CWSRF (low-interest, common), WIFIA (large projects >$20M), federal grants (BIL/IIJA CSO Control Grant, Emerging Contaminants Grant if PFAS-coupled), state grants
- **Cost-of-alternative anchor:** customer's exposure under continued non-compliance — eDMR exceedance counts × typical state-fine rates, LTCP milestone enforcement, public ECHO listing rate impact

### `lens-industrial-discharge`

- **Unit:** $/yr opex for treatment, $/gal-day capex for treatment train
- **Typical capex ranges:**
  - Pretreatment for indirect-discharger PFAS (GAC or ion exchange): $300K-2M depending on flow and PFAS loading
  - Direct discharger NPDES compliance (industrial activated sludge or MBR for chemistry/loading): $5-15K per gal-day design capacity
  - Categorical-pretreatment redesign (chrome plating, metal finishing under 40 CFR Part 433): $2-6M for medium facility, scaled by parameter count and flow
  - ELG-driven upgrades (chrome plating, OCPSF, etc.): industry-specific, often $1-10M per facility
- **Drivers of range:** contaminant profile, hydraulic loading, regulatory driver (categorical vs local vs state-stricter limits), space constraints
- **Funding anchors:** customer's own capex; sometimes Emerging Contaminants Grant pass-through from POTW; occasionally EPA cost-share for early-mover technology adoption
- **Cost-of-alternative anchor:** sewer-use surcharges at observed mass loading (typical industrial POTW surcharges run $0.50-2.00/lb on metals and BOD; cyanide surcharges materially higher; PFAS surcharges emerging at $5-50/g in early-adopter POTWs), NOV exposure ($10-50K/day per exceeded parameter), Consent Order timeline-pressure costs, plant shutdown authority for repeat violators

### `lens-advanced-reuse`

- **Unit:** $/kgal produced water; $/AF for irrigation-supply comparison; $/MG capex per design capacity; LCOW for comparison to alternative supplies
- **Typical capex ranges:**
  - Non-potable reuse (Title 22 / 30 TAC 210 / 62-610 conformance): $4-8M per MGD design capacity
  - IPR (surface or groundwater augmentation): $10-20M per MGD with full advanced treatment (MF/RO/UV-AOP)
  - DPR: $15-30M per MGD with full advanced treatment plus engineered storage buffer or engineered LRV
- **Drivers of range:** source water quality (PFAS, TOC, conductivity), regulatory pathway (state-specific), receiving-water characteristics for IPR, distribution integration cost
- **Funding anchors:** WIFIA, CWSRF, Bureau of Reclamation Title XVI (Western federal reuse projects), federal grants (BIL has $1B for reuse), state revolving funds
- **Cost-of-alternative anchor:** cost of alternative supply — imported water tariff, desalination LCOW, groundwater replenishment fee. These set the LCOW ceiling.

### `lens-nrw`

- **Unit:** $/MG of water saved annually (lifetime average) for project ROI; total system cost as % of utility opex baseline
- **Typical capex ranges:**
  - AMI deployment, 50K-100K customer system: $15-40M for full meter replacement + data infrastructure
  - Acoustic leak detection programme: $200K-800K/yr, often catches 1-3 MG/day in real losses
  - DMA pressure management: $2-5M capex + opex, typical 5-15% reduction in real loss
  - Apparent loss reduction (billing + meter testing): often <$1M, high revenue-recovery impact
- **Drivers of range:** system size, current loss percentage, M36 audit validity, infrastructure age, political-rate environment
- **Funding anchors:** DWSRF (NRW projects often eligible), state grants, performance-based contracting (vendor capex repaid from documented loss reduction)
- **Cost-of-alternative anchor:** cost-of-lost-water — what does the utility currently pay (or fail to recover from ratepayers) for water never delivered? Sets the ROI ceiling.

### `lens-biosolids-residuals`

- **Unit:** $/dry-ton processed; $/wet-ton transported for outlet cost; $/dry-ton for amortised capex
- **Typical capex ranges:**
  - Class B → Class A upgrade (thermal hydrolysis or pasteurisation): $3-8M per dry-ton/day generation capacity
  - PFAS-treatment for biosolids (incineration, gasification, supercritical water oxidation): $5-15M depending on technology and scale
  - Anaerobic digestion + biogas (where current is aerobic): $4-10M for medium-size POTW
  - Drying / pelletizing for Class A distribution: $3-6M for medium POTW
- **Drivers of range:** current outlet economics (land application baseline varies $40-200/wet-ton; landfill $50-100/wet-ton; thermal $100-300/wet-ton), state regulatory landscape, PFAS-driven outlet displacement
- **Funding anchors:** CWSRF, state grants, federal cost-share for PFAS treatment R&D, capital plan
- **Cost-of-alternative anchor:** outlet displacement cost — when PFAS regulations force the customer off land application, the replacement outlet (landfill or thermal) cost differential × annual volume

### `lens-stormwater-ms4`

- **Unit:** $/acre managed (programmatic); $/BMP installed (per-project); annual programmatic cost as % of municipal budget
- **Typical capex ranges:**
  - Structural BMP installation (bioretention, infiltration, detention): $50K-500K per acre treated
  - Green infrastructure (urban): $5-20 per gal of stormwater managed annually
  - SWMP development or major revision: $200K-1M for medium MS4
  - TMDL implementation plan + monitoring + tracking: $500K-3M for medium MS4 over 5-year horizon
- **Drivers of range:** Phase I vs Phase II, TMDL exposure, soil/topography, retrofit vs new-construction, consent-decree pressure
- **Funding anchors:** stormwater utility fees, MS4 dedicated funds, CWSRF, federal grants (BIL Sec 50221 stormwater funding), TMDL implementation grants
- **Cost-of-alternative anchor:** TMDL non-compliance exposure, consent-decree milestone fines, MS4 permit enforcement tracking

### `lens-decentralized-onsite`

- **Unit:** $/connection-year for RME operating cost; $/system capex; total programme cost per population served
- **Typical capex ranges:**
  - Advanced onsite retrofit (single-family): $15-40K per system for nitrogen-reducing or PFAS-considering technology
  - Cluster system (10-100 homes): $500K-3M total
  - Cluster system (100-500 homes): $2-8M total
  - Advanced managed onsite programme establishment: $500K-2M one-time
  - RME ongoing operating cost: $300-800 per connection-year typical
- **Drivers of range:** soil/site conditions, regulatory required treatment level, inspection cadence, technology selection
- **Funding anchors:** USDA Rural Development (rural systems), CWSRF (decentralized increasingly eligible), state revolving funds, county capital programmes, federal grants (BIL Sec 50106 distributed wastewater)
- **Cost-of-alternative anchor:** centralised collection cost per connection over 20-50 year horizon; cluster system economics in low-density / cluster scenarios

## Discipline — apply across all lenses

- **Phrase as a range, not a point.** "This project comes in at $5-15M directionally, driven by site constraints and existing infrastructure leverage." Not "this project will cost $9M."
- **Name the driver of the range.** Source-water quality, regulatory tier, site constraints, technology choice, retrofit complexity — whatever moves the number. The driver is often more useful to the field agent than the range itself.
- **Distinguish capex from opex from cost-of-alternative.** Capex is the one-time investment; opex is annual operating cost; cost-of-alternative is what the customer pays today (or will pay tomorrow under regulatory escalation). The reader must see which is which.
- **Use commodity-knowledge ranges, not invented numbers.** Cheat-sheet ranges are expected. Specific vendor quotes, specific deal prices, specific historical placements are not used unless provided as evidence.
- **Caveats are part of the output, not a reason to omit numbers.** Every range carries an explicit "directional — subject to site assessment, engineering scoping, and decision-maker confirmation" framing. With the caveat in place, the numbers are the point.
- **Never fabricate.** No invented vendor names, no invented decision-maker names (roles only), no invented historical deal sizes, no invented enforcement-action specifics. If you don't have evidence to anchor a number, use the lens cheat-sheet range. If the cheat sheet doesn't fit, name the gap and ask for the missing input rather than inventing.
- **Confidence labels are honest.** MEDIUM-LOW or LOW are valid and useful labels. Marking everything HIGH is fake confidence; marking everything LOW is hedging. Match the label to what the evidence actually supports.

## Stop conditions

Stop when:

- All 7 named components of the positioning record are produced
- The cost-of-alternative table has 4-7 rows (the structurally important ones, not every category)
- 2-3 kill risks are listed (never 4+)
- The customer-behaviour read is one paragraph (not more)
- The per-sub-stream reasoning is sufficient for the field-brief skill to render each artefact without re-running you

**Do not continue elaborating** to produce additional content that the field-brief skill hasn't asked for. The field-brief skill will request a re-read if it needs more.

## What this skill does NOT do

- Does not select a stage — that's `h2o-stage-and-gaps`'s job
- Does not produce gap analysis — that's `h2o-stage-and-gaps`'s job
- Does not render any artefact — that's `h2o-field-brief`'s job (you produce the content; the brief renders it into all four artefacts)
- Does not produce the Playbook question structure directly — `h2o-field-brief` builds the Playbook from your positioning record + the top-3 questions from `h2o-stage-and-gaps`
- Does not commit to specific vendors, specific historical prices, or specific named decision-makers from outside the evidence base

## Handoff to `h2o-field-brief`

Your output is the **positioning record** — a structured set of named components (1 through 7 above) plus the per-sub-stream internal reasoning that supports them. The Field Brief skill renders four artefacts from your single record:

- The **Field Brief** consumes the engagement-level fields directly (proposed approach, win-win, cost-of-alternative, sensitivity, primary frame, kill risks)
- The **Playbook** consumes the customer-behaviour read and the primary win frame (combined with stage-and-gaps' top-3 questions)
- The **Analytical Read** consumes the per-sub-stream reasoning, the full cost-of-alternative analysis, and the risk inventory
- The **Proposal Shell** consumes the recommended approach, sizing, and win-win — its depth scales with stage

The cost-of-alternative table is the headline of the Field Brief's Section 2. Its bottom-line row — "their path: ~$X-Y + risk tag" vs "our path: ~$A-B, risk extinguished" — is the executive sentence the field agent walks into the call with. Build that sentence carefully. It carries the deal.
