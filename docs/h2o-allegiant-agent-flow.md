# H2O Allegiant Agent — Flujo de comportamiento

**Propósito:** Documento explicativo para entender CÓMO se comporta el agente en cada turno, qué dispara cada artifact, cómo recibe el usuario los PDFs y qué tools necesita el agente.

**Fuente:** `H2O Allegiant Discovery Agent v2/` (system prompt + 9 skills + reference Prairie). Todo lo que dice este doc viene del spec, no de invención.

**Relacionado:** `docs/h2o-allegiant-agent-prd.md` (alcance del producto), `docs/agent-audit-and-artifact-plan.md` (plan técnico/PRs).

---

## 1. Principio rector — entender esto primero

El agente NUNCA pide más evidencia antes de entregar. **Siempre entrega un Field Brief.** Lo que cambia es la confianza (HIGH / MEDIUM / LOW) y el contenido, no si entrega o no.

Si el field agent dice "tenemos un cliente de metales en algún lado del Midwest, todavía no hablé con ellos" → el agente igual produce un Field Brief, con confianza LOW, sizing en rangos amplios, y action #1 hardcoded a "schedule discovery call".

Esto se llama **lean-forward discipline** (system prompt líneas 72-73):
> *"Always take a position on proposed approach, deal size, anchor, kill risks, and next action. Confidence labels mark uncertainty; hedging language does not. Never 'deferred until evidence supports.' Never 'premature to size.'"*

**Implicación de diseño:** la UI nunca tiene que mostrar estados como "esperando más información". El agente siempre tiene algo que entregar.

---

## 2. Qué pasa cuando un usuario abre un thread nuevo

```
Usuario abre /c/[new-thread-id]
        │
        ▼
Empty state — Suggestions:
  - "Summarize this case file"
  - "Walk me through this NPDES permit"
  - "Build me a Field Brief for [customer]"
        │
        │ Usuario hace 1 de 3 cosas:
        │   (a) Sube archivo(s): case file PDF, NPDES, eDMR, call recap
        │   (b) Pega texto: resumen de llamada, extracto de permiso
        │   (c) Escribe contexto: "tenemos un industrial finisher en Ohio..."
        ▼
Mensaje enviado al agente
```

**El agente NO hace onboarding.** No te pregunta tu nombre, no te explica qué hace, no te pide que cargues archivos antes de empezar. El primer mensaje del usuario es el disparador del primer turn completo.

---

## 3. El loop de cada turno — la operating sequence de 9 skills

Cada turno del agente corre ESTAS 9 skills, **siempre en este orden**:

```
┌─────────────────────────────────────────────────────────────┐
│                    TURN START                               │
│         (user envía mensaje con/sin archivos)               │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  1. h2o-segmentation-router                                 │
│     ↓ Descompone el problema en sub-streams                 │
│     ↓ Identifica role profile (env manager, plant supt...)  │
│     ↓ Asigna lens primaria (industrial-discharge, reuse...) │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  2. h2o-water-evidence-interpretation                       │
│     ↓ Lee documentos, extrae facts estructurados            │
│     ↓ Mantiene working memory del thread                    │
│     ↓ Surface conflicts: framing del cliente vs evidencia   │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  3. h2o-solution-lens-light                                 │
│     ↓ Read especialista por sub-stream                      │
│     ↓ Top diagnostic Q's, data needs, gotchas, sizing       │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  4. h2o-compliance-and-safety-flagging  [ALWAYS-ON]         │
│     ↓ Inventory de flags (75-flag catalogue)                │
│     ↓ Severity ratchet: STOP / SPECIALIST / ATTENTION       │
│     ↓ Emite header always-on con stop-flags si los hay      │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  5. h2o-discovery-gap-analysis                              │
│     ↓ Required vs Nice-to-have gaps por sub-stream          │
│     ↓ Top 3 opportunity-level questions                     │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  6. h2o-deal-stager                                         │
│     ↓ Clasifica stage actual: Lead/Qualify/Scope/Position/  │
│       Propose/Close                                         │
│     ↓ Confidence label + advance criteria + regression flag │
│     ↓ NUNCA bloquea — siempre devuelve un stage             │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  7. h2o-positioning                                         │
│     ↓ Commit a posición defendida (7 componentes):          │
│       1. Customer-behaviour read                            │
│       2. Recommended approach                               │
│       3. Win-win argument (3 párrafos)                      │
│       4. Cost-of-alternative table (BATNA 5yr, MANDATORY)   │
│       5. Deal-size sensitivity                              │
│       6. Primary win frame                                  │
│       7. Kill risks (2-3 ranked)                            │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  8. h2o-field-brief                                         │
│     ↓ Compose Field Brief (PDF + markdown) DESDE positioning│
│     ↓ NO re-razona — consume positioning verbatim           │
│     ↓ ¿Pidió follow-on? Genera también Playbook /           │
│       Analytical / Proposal Shell                           │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
                    Turn output:
            (a) Text response al chat
            (b) PDF(s) streameado(s) al panel
            (c) Markdown mirror(s) descargable(s)
```

**Importante:** Skills 1-7 son **razonamiento puro** del modelo. No emiten tools. Producen estructura interna que la siguiente skill consume. Solo skill 8 (`h2o-field-brief`) llama a tools para emitir artifacts.

---

## 4. La decisión crítica — ¿este turn produce PDF o solo responde?

No todo turno produce un artifact. Esto es lo que distingue uno de otro:

### Turnos que SÍ disparan un nuevo Field Brief

- Usuario sube case file, RFI, call recap, NPDES, eDMR
- Usuario escribe "give me the brief", "what should I do here", "send me the brief", "field brief please"
- Llega evidencia que cambia el stage (ej: nuevo eDMR muestra exceedances → puede subir de Lead a Qualify)
- Llega evidencia que cambia la positioning (ej: customer dijo que la competencia metió oferta de $300K → cambia kill risks)
- Nuevo flag emerge (ej: cyanide line + low pH detectados → STOP flag HCN evolution)

### Turnos que NO disparan PDF (conversational turns)

- Pregunta técnica focal: *"¿qué exposición F006 hay en este caso?"* → responde con texto + flag header, nada más
- Pregunta de proceso: *"¿qué viene después?"* → responde leyendo el brief actual, no genera nuevo
- Customer color: *"acabamos de hablar con el POTW director, dijo que el city council aún no votó"* → puede o no afectar stage; si no afecta, solo confirma el stage actual en una línea
- Aclaraciones sobre el brief existente: *"¿por qué el #1 kill risk no es PFAS?"* → explica con texto, no re-render

**Regla operacional:** el agente decide internamente si el turn cambió stage o positioning. Si SÍ → renderiza. Si NO → responde texto con el flag header always-on + una línea con el stage actual.

---

## 5. Triggers de cada artifact (verbatim del spec)

### Field Brief — siempre se produce
Implícito en cualquier turn opportunity-advancing. El usuario no tiene que pedirlo. **El único que llega solo.**

### Playbook — on-demand
Trigger phrases:
- *"Give me the playbook"*
- *"Questions for tomorrow's call"*
- *"What should I ask"*
- *"How do I run the conversation"*

**Qué es:** 11 themes de preguntas stage-aware, 1-2 páginas, voice interrogativa. Reference tool para LLEVAR a la llamada con el cliente.

### Analytical Read — on-demand
Trigger phrases:
- *"Send to my manager"*
- *"Full write-up"*
- *"Detailed analytical version"*
- *"Long-form for the file"*

**Qué es:** 9 secciones evidence-tagged, 4-8 páginas. El brief en versión larga, con citas explícitas a la evidencia. Para escalar al jefe.

### Proposal Shell — on-demand
Trigger phrases:
- *"Draft the proposal"*
- *"Proposal shell please"*
- *"What should we put in the reply"*
- O automático cuando el customer compartió un RFP o invitó a proponer

**Qué es:** 7 secciones, 3-6 páginas, voice formal. **El ÚNICO artifact customer-facing.** Es scoping seed — el equipo de proposal lo toma desde ahí, no es proposal final.

### Si el trigger es ambiguo
Si el field agent dice *"I need more detail"* (puede significar Analytical o pregunta conversational), el agente **pregunta para aclarar antes de producir**. No produce el artifact equivocado.

---

## 6. Cómo recibe el usuario el PDF en la app

Acá es donde el spec del Claude Project (que dice `present_files` + `/mnt/user-data/outputs/`) se traduce a nuestra arquitectura.

### Durante el streaming (live preview)

```
┌─────────────────────────────────────────────────────────────┐
│  CHAT (left)                  │  ARTIFACT PANEL (right)     │
│                               │                             │
│  > Acabo de subir el case     │  [Field Brief ▼]            │
│    file de Prairie.           │  ─────────────────────────  │
│                               │  [STOP] HCN evolution       │
│  Agent:                       │  pathway active...          │
│    "Voy a procesarlo..."      │                             │
│    [streaming dots]           │  ─────────────────────────  │
│                               │  PRAIRIE AEROSURFACE        │
│                               │  Qualify · 2026-05-14       │
│                               │                             │
│                               │  [INSIGHT BOX appearing...] │
│                               │  > Customer frames it as    │
│                               │  > "three abnormal events"  │
│                               │  > The composite shows...   │
│                               │                             │
│                               │  Section 1: What this is    │
│                               │  [streaming text...]        │
└───────────────────────────────┴─────────────────────────────┘
```

**El usuario ve el brief CONSTRUIRSE** sección por sección mientras el agente razona. Cada sección aparece atómicamente — primero el insight box, después el body. No hay "wait, generating PDF...". El panel arranca con la cover block + flag header + después las 4 secciones en orden.

### Después de que termina el stream

El panel queda persistido. Arriba aparecen dos botones:
- **[↓ PDF]** → llama a `GET /api/threads/[id]/artifacts/field-brief/pdf` → descarga directa
- **[↓ Markdown]** → llama a `GET /api/threads/[id]/artifacts/field-brief/md` → descarga directa

### Cuando piden un follow-on (Playbook por ejemplo)

```
Usuario: "give me the playbook"
        │
        ▼
Agente corre operating sequence (skills 1-7 ya tienen contexto cacheado)
        │
        ▼
Skill 8 detecta el trigger → genera Playbook one-shot (no streaming sección por sección)
        │
        ▼
ARTIFACT PANEL ahora tiene 2 tabs:
  [Field Brief] [Playbook ●nuevo]
        │
        ▼
Usuario hace click en Playbook → ve el contenido en panel
Usuario hace click en [↓ PDF] del Playbook → descarga
```

Los follow-ons NO se streamean sección por sección porque el agente ya tiene toda la info del positioning. Se generan one-shot y aparecen completos.

### Si el usuario recarga la página

Al montar el thread, el cliente hace una query a `Artifact` por `threadId`. Si hay artifacts persistidos, hidrata el panel con todos los tabs. El usuario abre el thread mañana y ve el mismo brief que tenía ayer.

---

## 7. Las tools concretas que tendrá el agente

De las 9 skills, **solo 1 emite tools** (skill 8 = `h2o-field-brief`). Las demás son razonamiento puro del modelo — producen estructura interna que la siguiente skill consume vía el contexto de la conversación.

### Tools que registramos en el `ToolLoopAgent`:

| # | Tool | Purpose | Streaming pattern | Cuándo se llama |
|---|---|---|---|---|
| 1 | `proposeFieldBriefCover` | Emite cover block + always-on flag header | Streamed first (1 call) | Siempre en opportunity-advancing turns |
| 2 | `proposeFieldBriefSection1` | What this is — situation + reframe + insight | Streamed (1 call) | Siempre, después de #1 |
| 3 | `proposeFieldBriefSection2` | What we'd propose — approach + win-win + cost-of-alternative + sensitivity + insight | Streamed (1 call, payload grande) | Siempre, después de #2 |
| 4 | `proposeFieldBriefSection3` | What could kill it — kill risks | Streamed (1 call) | Siempre, después de #3 |
| 5 | `proposeFieldBriefSection4` | Do this next — 3 actions | Streamed (1 call) | Siempre, después de #4 |
| 6 | `proposePlaybook` | Playbook completo (11 themes) | One-shot (1 call, payload completo) | Solo cuando trigger phrase de Playbook |
| 7 | `proposeAnalyticalRead` | Analytical Read completo | One-shot (1 call, payload completo) | Solo cuando trigger phrase de Analytical |
| 8 | `proposeProposalShell` | Proposal Shell completo | One-shot (1 call, payload completo) | Solo cuando RFP / trigger phrase |

**Total: 8 tools en el agente.**

**Skills 1-7 NO son tools.** El modelo razona internamente con la información de su system prompt (system prompt v2 + 9 skill descriptions + knowledge base injection). Cuando llega a skill 8, decide qué tools llamar basándose en:
- Si es opportunity-advancing → llama las 5 de Field Brief en orden
- Si además detectó trigger phrase de follow-on → llama también la tool correspondiente

**No necesitamos:** `proposeSegmentation`, `proposePositioning`, `proposeDealStage`, etc. Esos viven en el thinking del modelo, no en tools observables.

---

## 8. Cómo cambia el comportamiento por stage

El stage determina qué emphasis tiene el brief y qué acciones recomienda. La estructura de 4 secciones NO cambia, pero el contenido sí.

| Stage | Emphasis del brief | Qué pregunta el agente (si pregunta) | Action #1 típico |
|---|---|---|---|
| **Lead** | "¿Vale la pena perseguir esto?" Sizing directional, kill risk #1 = "no engagement signal" | "¿Tienen un problema real? ¿Podemos conseguir una conversación?" | Schedule discovery call |
| **Qualify** | Reframing del framing del cliente. Win-win. Pricing del alternative. Naming kill risks. *(Prairie está acá)* | "¿Detalle del case file? ¿Driver regulatorio? ¿Decision-makers por role?" | Reframing call. Pull ECHO record. |
| **Scope** | Refinar arquitectura de la propuesta. Sharpen cost-of-alternative. Confirmar boundaries de scope. | "¿Qué se construiría? ¿Fases? ¿Envelope de capital?" | Scoping confirmation. Vendor competitive flush. |
| **Position** | **Cost-of-alternative es existencialmente importante acá.** Es donde se gana o se pierde el deal. | "¿Hay alternativas competidoras? ¿Cuál es el envelope de presupuesto?" | Invitar formal proposal. Diferenciación competitiva. |
| **Propose** | Incluye Proposal Shell si se pidió. Recomienda scope, terms, anchors de value-prop. | "¿Feedback de procurement/legal?" | Negociar terms. Confirmar approval path. |
| **Close** | Estrategia de cierre — pricing posture, concesiones a sostener, kick-off readiness. | "¿Mobilization readiness? ¿Contrato ejecutado?" | Ejecutar contrato. Prep kick-off. |

### Confidence ceilings por stage

- **Lead / Qualify:** cap en MEDIUM (no podés tener HIGH confidence con tan poca evidencia)
- **Scope:** alcanza MEDIUM
- **Position / Propose / Close:** puede alcanzar HIGH cuando la evidencia lo soporta

LOW se queda en LOW. **Nunca se suaviza a MEDIUM porque "lee mejor".**

---

## 9. Casos especiales que importan en el UX

### Caso A — Evidencia mínima (Lead + LOW)

Usuario: *"Tenemos un industrial finisher en Ohio que mencionó problemas de discharge en una conferencia."*

Agente:
- Stage = Lead, confidence = LOW
- Field Brief se produce igual
- Cost-of-alternative table usa rangos del lens cheat sheet (no números inventados; tags qualitative cuando no hay base: *"material exposure, uncapped"*)
- Kill risk #1 = "no engagement signal yet"
- Action #1 = "Schedule discovery call dentro de 7 días"
- Todos los números con label LOW

### Caso B — Conversational turn (sin re-render)

Usuario: *"¿Cuál es el surcharge típico de hex chrome en un POTW del Midwest?"*

Agente:
- Responde con texto: *"En POTWs del Midwest con local limits de Cr⁶⁺ a 0.5 mg/L, los surcharges típicos van de $X a $Y por kg de exceedance. Eso es del lens cheat sheet — directional, depende de la categoría tarifaria de la utility."*
- Suelta el flag header always-on (si hay stop flags)
- Termina con: *"Currently at Qualify stage."*
- **No re-renderiza el brief.** El panel queda con el último brief intacto.

### Caso C — Stage regression

Usuario: *"El environmental manager se fue y entró uno nuevo."*

Agente:
- `h2o-deal-stager` detecta regression trigger = decision-maker change
- Stage actual sigue siendo Qualify (no se evapora), pero con regression flag
- Brief se re-renderiza con dos cambios:
  1. En el cover block, debajo del metadata: *"Regressed from Qualify — decision-maker change."*
  2. Action #1 cambia de "advance" a "re-engagement": *"Schedule discovery call con el nuevo environmental manager. Re-establish the chronic-envelope reframe. Thursday."*
- Primary win frame cambia: en vez de "win the deal", es "re-engage on the reframe"

El field agent ve INMEDIATAMENTE que esta es una conversación de re-engagement, no un nuevo advance.

### Caso D — Stop-flag aparece

Usuario sube case file que documenta cyanide line + EQ tank con pH bajo.

Agente:
- `h2o-compliance-and-safety-flagging` detecta HCN evolution pathway → severity STOP
- El header always-on en el chat dice: *"[STOP] HCN evolution pathway active — chronic low EQ-tank pH + legacy cyanide line. Material safety exposure."*
- En el brief: stop-flag callout aparece ARRIBA del cover block en page 1, con borde rojo
- En Section 3 (kill risks), HCN incident antes del cierre es uno de los kill risks

Stop-flags no se pueden suprimir ni silenciar. Siempre arriba de todo.

---

## 10. Worked example completo — Prairie AeroSurface

Este es el caso validado del spec. Te muestra el flujo completo end-to-end.

**Input del field agent:**
> *"Subí el case file de Prairie AeroSurface. Cliente aerospace finisher, indirect discharger al POTW de la ciudad. La environmental manager dice que tuvieron 'three abnormal events' en el último mes. Adjunto el WW-01 24-hour composite analítica."*

**Lo que hace el agente (interno, no visible al usuario):**

1. **Segmentation router:** Un solo sub-stream — "Categorical pretreatment compliance at Prairie Plant 3". Primary lens: industrial-discharge / categorical-pretreatment. Role profile: environmental-ehs-manager + plant-superintendent.

2. **Evidence interpretation:** Extrae el WW-01 composite. Cross-check contra 40 CFR Part 433 limits. **Detecta conflict:** customer dice "events", pero 7 de 9 parámetros exceedan → patrón de chronic discharge, no slug events.

3. **Solution lens light (industrial-discharge):** Treatment train recomendado — Cr⁶⁺ reduction + cyanide destruction segregated + hydroxide precipitation re-tuning + EQ-tank slug control. Sizing del lens cheat sheet: $2-4M capex. Phase-2 prize: PFAS source-control en chromate conversion line ($1-3M, 12-18 meses).

4. **Compliance flagging:** STOP flag — HCN evolution pathway (cyanide line + low pH documented). ATTENTION flag — PFAS regulatory horizon.

5. **Gap analysis:** Required gaps — ECHO record del POTW, formal vs informal enforcement stance, corporate approval hierarchy para capex $3-8M. Top 3 questions del nivel opportunity.

6. **Deal stager:** Stage = **Qualify**, confidence = MEDIUM. Advance criteria → "Customer agrees to engage on the work itself (scoping discussion, site visit, or paid scoping)". No regression.

7. **Positioning:** Commits los 7 componentes:
   - **Customer-behaviour read:** "Customer frames as 'three events' but composite shows chronic envelope. Reframing es el deal."
   - **Recommended approach:** Treatment train de la skill 3, $2-4M capex + phase-2 PFAS $1-3M.
   - **Win-win argument (3 párrafos):** (a) Permanent compliance vs band-aid, elimina ~$120K/yr surcharges. (b) PFAS handled antes del retrofit forzado en 24-36 meses, ~40% más barato hacerlo ahora. (c) HCN risk neutralized, OSHA exposure reducido.
   - **Cost-of-alternative table:**
     ```
     Cost component       │ Their path ($300K point-fix) │ Our proposal
     ─────────────────────┼──────────────────────────────┼──────────────
     Initial capex        │ $300K                        │ $3-7M
     Surcharges 5yr       │ ~$600K                       │ $0 (compliant)
     PFAS forced retrofit │ $1.5-2.5M                    │ included
     Enforcement exposure │ $500K-1.5M (risk-adj)        │ $0
     HCN incident expos.  │ Uncapped                     │ Resolved
     ─────────────────────┼──────────────────────────────┼──────────────
     5-yr total (RED)     │ $4-7M+                       │ $3-7M (GREEN)
     ```
   - **Deal-size sensitivity:** Footer italic — "Within our range, sensitivity is +$1M on scope clarification (PFAS phase coupling)."
   - **Primary win frame:** "Esto no son tres events — es un chronic envelope. Nuestro redesign de $3-7M fully priced es el mejor path del customer."
   - **Kill risks (3 ranked):**
     1. (RED) Framing battle — "events" gana, deal colapsa a point-fix de $300K. *Mitigation: Thursday reframe call, presentar composite analytics primero.*
     2. (AMBER) POTW enforcement va hot/cold sin advertencia.
     3. (AMBER) HCN incident antes del close.

8. **Field Brief render:** Compone las 4 secciones consumiendo positioning verbatim:
   - **Page 1:** Cover block (logo, Qualify badge amber, Prairie name, fecha) + Section 1 (insight: "Customer frames it as three events..." + body) + Section 2 (insight: "Cr⁶⁺/CN destruction + EQ control, $3-7M. **Their $300K point-fix costs them $4-7M over 5yr when surcharges, PFAS retrofit, and enforcement are priced in.**" + recommended approach + win-win 3 párrafos + **cost-of-alternative table** + sensitivity footer)
   - **Page 2:** Anchor header (small logo + Prairie + Qualify + "continued") + Section 3 (3 kill-risk cards) + Section 4 (3 action cards):
     - Action 1 (blue rank box, "Thursday"): Reframe call con environmental manager. Lead con WW-01 composite.
     - Action 2 (blue rank box, "by Friday"): Pull ECHO record del POTW para confirmar enforcement posture.
     - Action 3 (blue rank box, "by Monday"): Identify corporate EHS approver — likely VP-level para capex $3-8M.

**Output al usuario:**

- Chat message: *"Field Brief produced. Prairie at Qualify stage. **Their $300K alternative costs them ~$4-7M over 5 years when surcharges, forced PFAS retrofit, and enforcement exposure are priced in; we're at $3-7M risk-extinguished.** STOP flag active on HCN evolution pathway — addressed in kill risks."*
- Panel: Field Brief renderiza section by section en el panel lateral, con botones de download al final.

**Lo que el field agent se lleva:** Una posición defendida. Caminando hacia la reunión del jueves sabe exactamente qué decir, qué evidencia presentar primero (composite analytics), qué números defender ($4-7M vs $3-7M), y cuáles son los kill risks que tiene que monitorear.

---

## 11. Lo que el agente NUNCA hace (verbatim del system prompt)

1. ❌ Diferir artifacts porque la evidencia es delgada. **El Field Brief siempre se produce.**
2. ❌ Producir Playbook / Analytical / Proposal Shell proactivamente. **On-demand only.**
3. ❌ Producir un Field Brief **sin** la análisis de cost-of-alternative. Win-win argument + BATNA pricing son mandatory.
4. ❌ Emitir determinaciones regulatorias finales.
5. ❌ Nombrar decision-makers, funders, vendors o competidores específicos. **Solo categorías y roles.**
6. ❌ Cotizar firm prices o inventar specifics. Solo lens-specific directional ranges.
7. ❌ Suavizar LOW confidence a MEDIUM. Honesty wins.
8. ❌ Producir collateral customer-facing. Internal BD handover (excepto Proposal Shell, que SÍ es customer-facing por diseño).
9. ❌ Saltearse el always-on flag header.
10. ❌ Silenciosamente downgrade severity de flags.
11. ❌ Dejar que la sensitivity seller-side overshadow la cost-of-alternative customer-side. La customer-side es el headline; sensitivity es el footer.
12. ❌ Inventar contenido que no esté en el positioning record upstream. Si positioning no produjo un kill risk, el brief no lo fabrica.

---

## 12. TL;DR del flujo

1. Usuario abre thread, sube/escribe lo que tenga.
2. Agente corre las 9 skills en orden cada turn.
3. Skills 1-7 razonan, skill 8 emite tools que streamean el Field Brief al panel lateral, sección por sección.
4. Si el usuario pidió un follow-on (Playbook / Analytical / Proposal Shell), skill 8 también llama esa tool y aparece como tab nuevo en el panel.
5. Usuario descarga PDF o markdown con un click cuando quiere.
6. Próximo turn, el agente ve el mensaje nuevo, decide si es opportunity-advancing (re-renderiza brief) o conversational (solo responde texto + flag header + stage line).
7. Stage regression se trata first-class — banner en el cover, action #1 muta a "re-engagement", primary win frame se ajusta.
8. Stop-flags siempre arriba de todo, no se pueden silenciar.

El agente siempre toma una posición. Nunca difiere. Confidence labels dicen la verdad sobre cuánta tiene.

Eso es el flujo. La arquitectura técnica (tools concretas, modelo DynamoDB, endpoints, etc.) está en `agent-audit-and-artifact-plan.md`. El alcance y user stories están en `h2o-allegiant-agent-prd.md`. Este doc es solo el comportamiento.
