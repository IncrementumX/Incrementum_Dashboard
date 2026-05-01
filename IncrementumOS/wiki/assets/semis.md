---
status: active
created: 2026-04-29
updated: 2026-04-30
---

> **Source recency**: primary input is Citrini (2026-01-26, newest input). Situational-Awareness/Aschenbrenner and Amodei are not precisely dated in available extracts; treat as 2025-H2 vintage. Approximately 3 months stale on newest input as of 2026-04-30. HBM share scenarios and OEM capex guidance require live-data refresh. **Page status:** structural thesis and BESI positioning rationale current; specific share data and memory pricing require verification.

# Semis

Part of the **memory/chips** theme — third conviction tier, building. Current position: BESI (small-asymmetric). ASML on watchlist, no position.

---

## Thesis

*Eduardo's foundational notes (2025-10-12, 2025-12-15) place memory/chips at building tier (risk-first.md §4) without articulating a structural thesis for this theme. The spine of this page is Citrini (2026-01-26), Aschenbrenner/Situational-Awareness, and Amodei; Eduardo's voice enters only via risk-first.md §3 sizing-as-knowledge-proxy framing and §4 theme classification. A first-person Incrementum thesis is a known open item.*

The binding constraint on AI infrastructure is not compute — it is memory. [Citrini, 2026-01-26] As AI systems move toward long-context inference (100M+ tokens is Citrini's forward framing, not a current benchmark) and agentic architectures, HBM content per accelerator keeps rising: the NVIDIA Blackwell Ultra GB300 already carries $4k of HBM3E per unit, and a $40k GPU is rendered useless by a single failed memory stack. [Citrini, 2026-01-26] The HBM4E transition (2026-2027) to hybrid bonding creates a specific, time-bounded bottleneck in advanced packaging equipment where supply is structurally constrained and where BESI occupies a forward-looking share-progression scenario — not yet current dominance — at each of the three major memory OEMs. Memory supply is not responding to demand in the conventional cyclical fashion — DRAM players have canceled or delayed capacity expansion simultaneously for the first time, extending the constraint window. [Citrini, 2026] The investable thesis is not NVIDIA or TSMC (already consensus); it is the 2nd and 3rd-order supply chain — hybrid bonding equipment, advanced packaging, and testing — where the bottleneck physically lives.

**The demand-leg assumption (continued AI compute scaling) is contested — see Risks §AI Deflation Cascade and Open Questions §1.**

**Falsification condition:** Either of the following is sufficient to break the thesis: (i) AI compute scaling encounters a hard architectural ceiling that collapses hyperscaler capex before packaging/testing demand crystallizes; or (ii) memory OEMs simultaneously reverse their capacity discipline and glut the market before the HBM4E transition matures. The base case is that neither materializes before HBM4E volume monetization — the thesis is therefore a *race* between (a) hybrid bonding revenue ramp and (b) cyclical/demand reversal. The thesis weakens materially under either scenario; it does not require both to arrive simultaneously.

---

## Drivers

### Memory as the Hard Constraint

Per [Citrini, 2026-01-26]: "Hard constraint is not compute, it's memory." Memory supply is not responding to demand:

- Micron canceled and delayed DRAM expansion plans
- SK Hynix slowed HBM conversion
- Samsung moderated capex — first time in a decade

The result is a supply regime where HBM demand is "pushed to extremes" with a cautious capacity response. The effect cascades into commodity DRAM: DDR4 is now trading at a premium to DDR5 — a shortage signal severe enough to trigger panic buying in Q1 2026, with price increases expected through Q2-Q3. [Citrini, 2026] Legacy NAND is tighter still: global MLC NAND capacity is down -41.7% YoY in 2026 following Samsung's end-of-life announcement (final shipments June 2026). [Citrini, 2026]

### HBM4E / Hybrid Bonding Transition

HBM3E stacking currently uses TC-NCF or MR-MUF bonding. HBM4E (2026-2027) shifts toward hybrid bonding — direct copper-to-copper interconnect at tighter wiring pitch — which requires entirely different equipment and yields materially more process steps per wafer. The physics is precise: advanced packaging at this node drives 100-200% more process steps per wafer when HBM wafer starts grow ~50% annually. [Citrini, 2026-01-26]

**Three-way distinction (Citrini primary, [2026-01-26]):**

- **ASMPT (522 HK)** is the only true peer competitor to BESI in hybrid bonding. [Citrini, 2026-01-26] ASMPT is the *current* incumbent at SK Hynix: SK Hynix has approximately 50 TC bonders lined up for HBM4, with roughly half sourced from ASMPT, and is targeting ~100 total TC bonders — a meaningful portion expected from ASMPT. ASMPT also supplies hybrid bonding tools to TSMC and is in discussions with Samsung. ASMPT has a long-standing and deep relationship with SK Hynix. ASMPT's current SK Hynix share lead is a fact, not a forward projection.

- **BESI (BESI NA)** has a confirmed 30% share at Samsung for hybrid bonding equipment (Samsung's in-house Semes holds the remaining 70%); Samsung has confirmed hybrid bonding adoption in HBM4E with mature yields. BESI's SK Hynix and Micron positions are *forward-looking scenarios*, not current awards: it is possible BESI could secure more than 50-60% of SK Hynix's total hybrid bonding equipment demand and over 80% of Micron's, utilizing the data obtained from the Samsung collaboration to strengthen competitive positioning. [All shares: Citrini, 2026-01-26] Neither SK Hynix nor Micron awards have been confirmed in available sources as of 2026-04-30.

- **Hanmi Semiconductor (042700 KS)** currently holds ~90% share in HBM4 TCB (thermal compression bonding) equipment — the *legacy* technology being displaced. Hybrid bonding adoption (across all suppliers — BESI, ASMPT, and Samsung Semes in-house) will deal a significant blow to Hanmi's TCB share. [Citrini, 2026-01-26] The displacement threat is structural and comes from hybrid bonding as a technology, not from BESI specifically.

**Sizing implication of this three-way framing:** BESI's bull case is share *progression* across OEMs — from confirmed Samsung position into forward SK Hynix and Micron scenarios. ASMPT is the incumbent peer with stronger current SK Hynix relationship. This is a "one of two roughly equivalent picks with different current vs. forward share profiles" situation, not a "dominant supplier vs. also-ran" situation. This distinction is directly relevant to BESI-specific sizing.

### Advanced Packaging — CoWoS Overflow and Custom ASICs

TSMC doubled CoWoS capacity in both 2024 and 2025, targeting 140-150k wafers/month in 2026, but structural overflow persists — NVIDIA alone accounts for 63% of CoWoS demand [Citrini, 2026 — citing industry estimate; not TSMC-disclosed]. Custom ASIC programs (Google TPU, Meta, OpenAI custom silicon) compound the constraint: every new ASIC consumes additional packaging capacity at nodes that are already allocated. This demand is described as capacity-constrained "at least next year." [Citrini, 2026]

The chiplet transition amplifies this: moving from monolithic die to chiplet architecture means that every new ASIC program, every new accelerator generation, and every custom inference chip multiplies the packaging steps required per device. CoWoS-S and CoWoS-L overflow routes through OSATs: ASE (ASX US) handles 40-50% of TSMC's outsourced CoWoS-S volume. [Citrini, 2026]

### Subsystems — Early Revenue Recognition

Sub-systems are the "picks and shovels for the picks and shovels." [Citrini, 2026-01-26] All of the tools that AMAT, KLAC, TEL, LRCX and others ship are assembled from hundreds of subcomponents — vacuums, fluid delivery systems, wafer handling, gas boxes. Subsystem suppliers have a potential revenue recognition edge in the medium term: their systems are ordered, engineered, and delivered *ahead* of major fab equipment installs, meaning revenue recognition leads OEM tool revenue by quarters. As HBM wafer starts grow ~50% annually, the subsystem opportunity scales disproportionately — 50% more wafer starts translates to 100-200% more process steps per wafer, each requiring subsystem content. ICHR and UCTT are the specific subsystem-level suppliers named by [Citrini, 2026-01-26] with gas/fluid/vacuum exposure. Note: subsystem vendors are cyclical and derivative — when WFE corrects, they correct harder.

### Compute Scaling Context (AI Demand Leg)

[Situational-Awareness / Aschenbrenner] documents a compute scaling trajectory — GPT-2 to GPT-4 represents ~3,000-10,000x effective compute growth; the Situational-Awareness estimate for 2027 is 100,000x effective compute growth cumulative. These are one author's projections, not industry consensus. Aschenbrenner has institutional credibility considerations (former OpenAI; has a stake in the narrative). Treat as order-of-magnitude framing for demand trajectory, not as established facts or precise forecasts. If the scaling assumption is wrong — algorithmic efficiency substitutes for hardware scaling — the demand leg of this thesis compresses regardless of the supply story. See Risks §AI Deflation Cascade.

[Amodei] identifies chips and semiconductor equipment as active US geopolitical supply chain levers. This is directional framing — Amodei does not engage in semis-specific supply chain analysis.

---

## Risks / Invalidation

### Memory Cycle Glut (2027 Base Case — Citrini's Own Counter-Argument)

[Citrini, 2026-01-26] explicitly acknowledges: "Memory suppliers traditionally lean in → glut." The 2027 glut is Citrini's *own* bear case. The bull argument is that the cautious capacity response delays the cycle, not eliminates it. This must be held in tension — the thesis is a timing call on the window before conventional cyclical behavior reasserts. The underlying uncertainty (2027 glut base case but timing unconfirmed) is examined further in Open Questions §3.

### CXMT / China Foundry Ramp

CXMT is targeting volume HBM3 production in 2026 for Huawei, with electrochemical plating supplied by ACMR. [Citrini, 2026] CXMT is assessed as 3-4 years behind SK Hynix/Samsung at the high end (HBM3E/4E) [Citrini, 2026]; the trailing-edge timeline is less clear. The first-order risk is to the legacy-memory-scarcity leg of the trade. The second-order risk to the hybrid bonding thesis: if CXMT pressures trailing-edge revenue at SK Hynix/Samsung/Micron, the OEMs' capacity discipline at the leading edge may break as they fight to defend market share — accelerating the 2027 glut scenario.

### Intel Foundry — Alternative Packaging Routes

Intel's EMIB (2.5D) and Foveros (3D) packages are being used now to relieve TSMC CoWoS pressure. Intel's New Mexico facility is currently at 30% EMIB capacity and 150% Foveros. [Citrini, 2026] Citrini cites Intel targeting 100k wafers/month of 18A-P + 14A capacity by 2029-30. Acceleration of this timeline (yield breakthrough, customer commitment ahead of schedule) is the leading-indicator risk — more packaging capacity faster than the Citrini timeline implies. This is a broader "alternative packaging routes" risk that also includes Powertech's PiFO (a credible CoWoS-L alternative, with Meta reportedly showing interest) and FOPLP. If these alternatives qualify at scale, they compress the packaging bottleneck premium — which is part of the BESI/advanced packaging thesis.

### AI Deflation Cascade — Cross-Theme Interaction (Critical)

This is the risk that connects directly to Eduardo's worldview-level falsification condition. The worldview primary falsification condition is an AI-driven deflationary productivity boom strong enough to outrun US fiscal deterioration. If that scenario materializes:

- AI deflation accelerates white-collar job displacement faster than consensus → consumer credit stress → risk-off
- Equity multiples compress broadly, including semis infrastructure
- BESI and semis equipment names are equities first — they reprice in a risk-off environment even if the physical HBM4E transition is still occurring
- The semis thesis can be directionally right (compute keeps scaling) while the equity expression delivers a loss if multiple compression hits before earnings catch up

**Cross-theme correlation (G1 in risk-first.md):** In an AI-deflation cascade, semis equipment, uranium (via electricity demand reset), and energy infrastructure all reprice down together. The book's three core themes — metals, energy, memory/chips — are *not* independent in this scenario. If the Aschenbrenner/Amodei scaling assumption is wrong (algorithmic efficiency substitutes for hardware scaling), the demand leg compresses regardless of the supply story. Until G1 is actively managed (not just monitored) in sizing decisions, the semis allocation should assume worst-case correlation with the rest of the book — not zero correlation.

The asymmetry: semis can win even if hard assets perform well (compute infrastructure is not in tension with gold/commodity scarcity). But semis equities can lose in an Eduardo-macro-correct scenario if risk-off hits before the hybrid bonding transition fully monetizes. This is not a reason to avoid the theme — it is a reason to size it small-asymmetric until G1 is actively managed.

### Taiwan / Korea Concentration

90%+ of HBM4E production and advanced packaging is concentrated in Taiwan (TSMC, packaging OSATs) and Korea (SK Hynix, Samsung, Hanmi). A kinetic Taiwan scenario or Korea-adjacent disruption would simultaneously stress the physical supply chain and collapse equity multiples in the names most directly exposed. Geopolitical risk here is not diversifiable within the semis theme.

---

## Signals to Watch

1. **HBM pricing trajectory** — monthly spot and contract prices for HBM3E and HBM4. A sustained pricing plateau or decline before HBM4E ramp confirms the glut is arriving early.
2. **BESI hybrid bonding share progression** — SK Hynix award announcement (50-60% scenario) and Micron ramp confirmation (>80% scenario) are the two near-term binary catalysts for BESI specifically. Neither has been confirmed in available sources; both are forward-looking per [Citrini, 2026-01-26]. These catalysts *inform* knowledge depth — they are necessary but not sufficient for sizing up (see Implementation §Sizing rule).
3. **ASMPT SK Hynix relationship** — ASMPT is the current incumbent at SK Hynix. Monitor whether ASMPT's share at SK Hynix expands into the HBM4E hybrid bonding cycle or whether BESI's scenario displaces it.
4. **TSMC CoWoS utilization + overflow data** — whether the 140-150k wafers/month 2026 target is met or whether structural overflow forces ASE/Amkor to absorb a higher percentage than forecast.
5. **Hyperscaler capex guides** — Microsoft, Google, Meta, Amazon quarterly capex guidance. Deceleration vs. acceleration is the single most consequential macro signal for the entire semis supply chain. Citrini's 2028 scenario assumes $150-200B/quarter hyperscaler spend — this is a scenario figure, not a current run-rate, and not a prediction.
6. **DDR4/MLC NAND supply crunch resolution** — whether the panic-buying cycle extends into Q3-Q4 2026 or reverses. Monitors: spot DRAM pricing (DXI index), Macronix NOR pricing announcements.
7. **Intel 18A-P ramp status** — process node yield data and customer commitments. Intel achieving TSMC-competitive yields at scale ahead of the 2029-30 Citrini timeline is the packaging-capacity risk for the CoWoS bottleneck thesis.
8. **AI compute scaling — architectural signals** — if a major model release demonstrates substantial capability improvement with substantially less compute (algorithmic efficiency jump), it modifies the raw GPU-fleet demand estimate and compresses the demand leg. Monitor Anthropic, Google, and OpenAI training compute disclosures.

---

## Implementation

### Sizing rule (non-negotiable)

Per risk-first.md §3, Eduardo's knowledge level for this theme is "building." This maps to small-asymmetric, which means ≤5% portfolio weight. **Three conditions must all hold simultaneously to size up:**

1. **G1 actively managed** — cross-theme correlation (semis + uranium + energy) actively incorporated into gross exposure decisions, not just monitored.
2. **Knowledge depth: building → extensive** — achieved through dedicated research: BESI IR filings, competitor analysis (ASMPT), OEM capex cycle analysis, independent validation of share scenario.
3. **Thesis-specific catalysts confirmed** — SK Hynix tooling award public or near-confirmed; Micron hybrid bonding ramp verified against Micron IR filings or public capex commentary.

Any one condition alone is insufficient. Confirming a SK Hynix award removes one specific uncertainty but does not move knowledge to "extensive" and does not close G1. **The current small-asymmetric sizing is the correct expression of 'high upside, building knowledge.'**

### BESI (Current Position)

BESI is the most accessible Western-listed expression of the hybrid bonding bottleneck. The investment rationale:

- Equipment-layer exposure: BESI sells the picks-and-shovels for hybrid bonding, not the wafers or the finished GPUs. Revenue materializes when OEMs commit tooling budgets, which leads HBM4E volume ramp by 6-18 months.
- Forward share-progression scenario: BESI going from confirmed ~30% Samsung share into a potential SK Hynix 50-60% and Micron >80% scenario represents a multi-year revenue growth path not yet priced as consensus. **Each step of the share progression (Samsung confirmed → SK Hynix potential → Micron potential) is Citrini's forward-looking scenario as of 2026-01-26, not confirmed.** [Citrini, 2026-01-26]
- ASMPT is the peer competitor and current SK Hynix TC bonder incumbent. BESI's share progression at SK Hynix is a scenario that runs *against* ASMPT's current position — it is not yet a fait accompli.

**Sizing implication:** this bull case does not justify increasing BESI position until the three conditions in §Sizing rule are all met simultaneously.

**Thesis-specific catalysts to monitor (necessary but not sufficient for sizing up):**
- Confirm SK Hynix tooling award: public announcement or supply chain confirmation of BESI's hybrid bonding share at 50-60%
- Confirm Micron hybrid bonding ramp: Micron's introduction of hybrid bonding "similar to Samsung" verified against Micron IR filings or public capex commentary
- Verify BESI revenue guidance trajectory vs. Citrini's share scenario — do implied unit economics support the thesis size?

**Exit signal:** any reversal of memory OEM capex discipline (Micron, SK Hynix, or Samsung guiding capacity expansion) is a leading-indicator exit signal for the BESI position, regardless of BESI's own revenue trajectory. The thesis is a timing call; exits should be anticipatory, not reactive to BESI's stock price.

### ASML (Watchlist — No Position)

ASML is the EUV lithography chokepoint globally. Knowledge level: early. No position is correct at this knowledge level. This is not a "when I learn more I will buy ASML" commitment — it is a "until knowledge moves from early to partial, no position is correct, regardless of the business quality." The threshold for watchlist-to-position conversion is knowledge level reaching partial, not Eduardo's view of business quality improving.

### Equity Universe — Ranked by Bottleneck Proximity

Per [Citrini]'s framing: 2nd and 3rd-order beneficiaries outperform consensus (NVDA, foundries) because the bottleneck is not at the GPU or wafer level — it is in the back end.

**1st-order — hybrid bonding / advanced packaging equipment** (closest to the bottleneck):
- BESI (BESI NA) — Eduardo's current position; pureplay hybrid bonding; forward share-progression scenario
- ASMPT (522 HK) — the only true peer competitor to BESI in hybrid bonding [Citrini, 2026-01-26]; current SK Hynix TC bonder incumbent; also supplies TSMC and in Samsung discussions
- Hanmi Semiconductor (042700 KS) — current TCB leader; faces structural displacement by hybrid bonding as a technology (from BESI, ASMPT, and in-house suppliers); the thesis here is complex — a play on HBM4 TCB volume *before* hybrid bonding fully displaces it, not after

**1st-order — advanced packaging (CoWoS alternative):**
- Powertech (6239 TT) — memory back-end manufacturing + PiFO (a credible CoWoS-L alternative); Meta reportedly showing interest in PiFO; FOPLP ramp expected to show up in revenue around 2027. [Citrini, 2026-01-26] Powertech is both a potential beneficiary (CoWoS overflow) and a thesis-risk name (if PiFO qualifies broadly, it compresses the packaging bottleneck premium).

**2nd-order — testing and inspection** (structural demand growth, less single-technology concentration):
- FormFactor (FORM) — probe cards, known-good-die testing; NVIDIA requirement for full test before foundry integration drives unit demand
- Onto Innovation (ONTO) — wafer inspection; benefits from process step growth at HBM4E node
- Advantest (6857 JP) — memory test handlers; structural volume growth in HBM testing
- Teradyne (TER), Cohu (COHU), Aehr (AEHR) — testing adjacencies; diluted exposure relative to the three names above

**3rd-order — subsystems and deposition** (real demand but harder attribution; cyclical leverage to WFE cycle):
- ASM International (ASM NA) — ALD leadership; GAAFET transition driver; less direct memory bottleneck exposure
- ICHR, UCTT — specific subsystem names per [Citrini, 2026-01-26]; gas/fluid/vacuum exposure; early revenue recognition edge vs. OEM tool delivery
- KLA (KLAC) — inspection leader; real demand, but widely owned and coverage is consensus

**OSATs (CoWoS overflow beneficiaries):**
- ASE (ASX US) — 40-50% of TSMC CoWoS-S outsourced volume; liquid exposure to overflow
- Amkor (AMKR) — secondary OSAT; less direct TSMC relationship

**What to avoid conflating with this thesis:**
- NVIDIA (NVDA) and TSMC — 1st-order AI infrastructure; consensus positioning, full valuation, limited room for the bottleneck-thesis premium
- Memory OEMs (Micron, SK Hynix, Samsung) — direct memory-scarcity exposure; Citrini has been long since Jan 2024. Different thesis mechanics than equipment/packaging — commodity cycle exposure rather than equipment-share progression. Not avoided in principle, but not the same trade as BESI.
- Hyperscaler equities (MSFT, GOOGL, META) — AI compute consumers, not compute supply chain

### Cross-Theme Boundary

AI demand for electricity (data center power) is covered by the energy/worldview thesis — specifically the nuclear/uranium leg of the metals theme (see wiki/uranium). That link connects AI capex to uranium via electricity load. Do not double-count: on this page, AI is relevant only through semis equity exposure to the compute supply chain. The uranium-AI connection lives in uranium's Drivers section.

---

## Open Questions / Gaps

1. **AI demand sustainability if compute scaling laws plateau** — Situational-Awareness/Aschenbrenner's 100,000x effective compute by 2027 estimate and Amodei's inference cluster projections are one author's projections, not industry consensus. If algorithmic efficiency gains (smaller models, test-time compute, architectural jumps) substitute for raw hardware scaling, hyperscaler capex growth could decelerate even if AI capability continues improving. This would compress the timeline for the memory bottleneck thesis without invalidating the hybrid bonding transition already underway.

2. **China alternative supply chain timeline** — CXMT trailing-edge HBM ramp is 3-4 years behind on leading-edge [Citrini, 2026]; the trailing-edge timeline is less clear. A China domestic HBM3-equivalent supply chain that satisfies Huawei by 2027-28 would relieve one demand vector from SK Hynix and Samsung, which could soften pricing before the HBM4E transition matures. The second-order path (CXMT pressure on OEM capacity discipline) is the less-obvious risk — see Risks §CXMT.

3. **Memory glut timing (2027 base case but uncertain)** — Citrini names 2027 as the base-case glut year. Whether the cautious capacity response by memory OEMs delays, shortens, or eliminates the conventional cycle is the central empirical question. Monitoring: quarterly capex guidance from Micron, SK Hynix, Samsung — any reversal toward expansion is the early warning. See also Risks §Memory Cycle Glut.

4. **BESI deeper research before sizing up** — The share progression at SK Hynix and Micron is forward-looking per Citrini. Before any size increase from the current small-asymmetric level: (i) validate BESI's financial position and revenue trajectory against IR filings, (ii) confirm the SK Hynix tooling award is public or near-confirmed, (iii) assess whether BESI's current market cap already prices in the Micron >80% scenario, (iv) assess ASMPT's current SK Hynix position and trajectory — the BESI bull case runs against ASMPT's incumbent relationship. This is a known research gap — sizing up without closing it would violate the sizing-as-knowledge-proxy rule.

5. **ASML — when does watchlist convert to position?** — ASML is the most defensive and widely recognized name in the semis equipment universe (EUV monopoly, geopolitical moat). The knowledge gap is understanding ASML's specific exposure to the HBM4E vs. leading-edge logic cycles, and whether the entry timing is better before or after the SK Hynix/Micron hybrid bonding confirmation. Not actionable until knowledge level moves from "early" to "partial."

6. **Exit framework for a timing-call thesis** — The thesis is explicitly a timing call (window before glut). Implementation has entry rationale and sizing rules, but exit logic beyond the leading-indicator exit signal (OEM capex reversal) is underdeveloped. A timing call needs anticipatory exit criteria beyond price stops — what does "the window is closing" look like in observable signals 6-12 months before the glut manifests?
