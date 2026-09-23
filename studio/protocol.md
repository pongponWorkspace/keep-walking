# Studio Cooperation Protocol

Every agent follows this file. It defines how work comes in, how results go out, and how roles cooperate without calling each other directly.

## 1. How cooperation works

Subagents cannot spawn or message each other. Cooperation goes through a **blackboard**:

```
orchestrator (main session, /run-phase)
   | reads board, dispatches ready tasks in parallel waves
   v
role agent  -- reads inputs, does the work, writes only its `writes` paths
   | returns a REPORT (outputs, handoffs, decisions, questions)
   v
orchestrator -- updates board, turns handoffs into new tasks for other roles,
                routes decisions to the authority owner, asks the human only when blocking
```

An agent that needs something from another role writes a **handoff** in its report. The orchestrator turns it into a task for that role in the next wave. The requesting agent never waits idle: it states an assumption and finishes what it can.

## 2. Task brief (what an agent receives)

```
TASK BRIEF
id:          P<phase>-F<feature>-T<nn>   (handoff tasks: P<phase>-H<nn>, fix tasks: P<phase>-X<nn>)
phase:       <N> — <phase name>
feature:     F<nn> — <feature name>
role:        <agent name>
type:        spec | build | asset | review-gate | fix | research | plan
goal:        <one or two sentences>
inputs:      <paths to read first>
writes:      <paths this task may create or modify, exclusive during this wave>
acceptance:  <checklist the agent must prove>
context:     <notes from earlier reports, answers from the human, relevant decisions>
```

## 3. Working rules for every agent

1. Read `CLAUDE.md`, this protocol, and the `inputs`. For the GDD, Grep the relevant headings and read only those sections. Do not load all 1,100 lines unless the task needs them.
2. **Write only inside `writes`.** Need a change elsewhere? Write a handoff to the owner.
3. **Never block on another role.** If an input is missing, write `[ASSUMPTION A-<task-id>-<n>: ...]` in your output, continue, and list the assumption in the report. Report BLOCKED only when no meaningful progress is possible.
4. **Chunked writes:** at most about 120 lines per Write/Edit call. Skeleton first, then append.
5. **Before writing, check whether the file already exists.** If a previous attempt was cut off, resume from what is there; do not rewrite from scratch.
6. **Self-verify** every acceptance item with evidence: a test output line, a file path and section, a computed number. Code tasks must run their tests and linter through Bash.
7. Never edit the GDD, `studio/roadmap.md`, or the board. Propose changes as decisions.
8. Never perform the forbidden actions in `CLAUDE.md`. Turn them into a handoff to `HUMAN` with step-by-step instructions.
9. No emoji. Documents are in Thai, code in English.
10. End your final message with the REPORT block below, exactly as specified. Nothing after it.

## 4. REPORT format (the last thing every agent outputs)

```
## REPORT
task: <id>
status: DONE | PARTIAL | BLOCKED
summary: <two lines at most>
outputs:
  - <path> — <what it is>
acceptance:
  - [x] <criterion> — <evidence>
  - [ ] <criterion> — <why not met>
assumptions:
  - A-<task>-1: <assumption> (owner who should confirm: <role>)
handoffs:
  - to: <role | HUMAN> | need: <concrete request> | why: <reason> | blocking: yes | no
decisions:
  - propose: <decision> | authority: <role | HUMAN> | impact: <what changes if accepted>
questions_for_human:
  - <question in plain Thai, with the options you see> | blocking: yes | no
```

Empty sections are written as `- none`.

## 5. Decision authority

| Area | Authority | Escalate to HUMAN when |
| --- | --- | --- |
| Game rules, core loop, feature intent | game-director | it contradicts the GDD or a tie-break principle |
| Numbers, formulas, economy values | systems-designer (game-director approves changes above ±20% of a GDD value) | an economy target in the GDD would be missed |
| World, lore, in-game copy | narrative-designer | the tone touches religion, politics, or real brands |
| Dungeon placement and data | level-designer | a place is in a sensitive category or a gray area |
| Architecture, stack, code standards | tech-lead | there is a cost commitment or a vendor lock-in |
| Visual style | art-director | always final within the approved direction |
| UX flows | uiux-designer (game-director approves core-loop flows) | — |
| Scope and timeline, board changes | producer | a phase exit criterion must be cut |
| Feature priority, metrics | product-manager | — |
| Live events, rotation, tuning in operation | liveops-operator | real money or a sponsor is involved |
| Legal, PDPA sign-off, spending, credentials, production deploy | HUMAN only | always |

## 6. Review gates

Every feature closes through gates. The producer plans them on the board as `review-gate` tasks.

| Gate | Reviewer | Checks |
| --- | --- | --- |
| Design gate | game-director | fits the GDD pillars and non-negotiables; the player experience makes sense |
| Tech gate | tech-lead | architecture conformance, server-authority, config-not-hardcode, tests pass |
| Content gate | narrative-designer (copy), art-director (visuals) | tone rules, style consistency |
| QA gate | qa-tester | every acceptance criterion is verified, GPS edge cases are tested, test report is written |
| Product gate | product-manager | player goal is met, telemetry events exist for the feature's metrics |

A gate returns `verdict: PASS | NEEDS_CHANGES` in its report summary. It lists findings as handoffs to the original owner (`blocking: yes`).
- NEEDS_CHANGES: the orchestrator creates fix tasks (`X`), then re-runs the same gate once.
- A second NEEDS_CHANGES on the same gate: escalate to the human with both reports summarized.

Not every feature needs every gate. A pure design feature has no tech gate. The producer picks the gates when planning.

## 7. Board format (`studio/phases/phase-<N>/board.md`)

```
| ID | Feature | Task | Type | Owner | Deps | Writes | Status | Output |
```

Status values: `TODO`, `IN_PROGRESS`, `WAITING` (needs a handoff task first), `DONE`, `BLOCKED`, `HUMAN` (a person must do it), `CUT` (dropped by the producer with a reason).

Each task has a detail block below the table with the goal and the acceptance checklist.

## 8. Standard task chain for a feature

The producer adapts this chain per feature:

```
spec (design role) --> ux flow + copy (uiux, narrative) --> tech note + API contract (tech-lead)
      |                                                          |
      v                                                          v
 config values (systems)                         build (gameplay / backend / location, in parallel)
      |                                                          |
 assets (2d, vfx, sound) ----------------------------------------+
                                                                 v
                                     integration --> gates (tech, QA, design/content, product)
```

## 9. Shared contracts that prevent drift

- **Formulas:** the systems-designer publishes reference implementations and golden test vectors in `design/systems/test-vectors/*.json`. Code must pass them. QA checks this.
- **API contracts:** the tech-lead publishes them in `docs/tech/`. Client and backend build against the contract, not against each other's code.
- **Telemetry events:** the product-manager publishes `product/telemetry-events.md`. Programmers emit exactly those names.
- **Copy:** the narrative-designer publishes `config/content/copy.th.json` keys. UI never embeds Thai strings directly.
- **GPS traces:** the location-engineer and QA publish replayable traces in `data/gps-traces/`, used by the MockLocationProvider and by tests.
