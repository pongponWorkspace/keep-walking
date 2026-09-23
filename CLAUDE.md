# GPS Dungeon Bangkok — Studio Workspace

A co-op, location-based web game set in real public places in Bangkok and its vicinity (ปริมณฑล). Players walk in real parks, markets and attractions ("dungeons"). Rewards are only granted for real movement.

This workspace is run by an **AI studio of 18 role agents** (`.claude/agents/`) coordinated by the main session through the commands in `.claude/commands/`. Agents cooperate through files, not by calling each other.

## Source of truth

| What | Where | Rule |
| --- | --- | --- |
| Game design (GDD) | `เกม GPS Dungeon กรุงเทพฯ — Design Document.md` | **Read-only for every agent.** Changes are proposed in `studio/decisions/decision-log.md` and applied only after the human approves |
| Phase plan | `studio/roadmap.md` | Phases, features, exit criteria. Only the producer edits it, and only with human approval |
| Cooperation rules | `studio/protocol.md` | Every agent follows it: task intake, report format, handoffs, gates |
| Live task state | `studio/phases/phase-<N>/board.md` | Only the orchestrator and the producer edit it |

When documents conflict: GDD > roadmap > feature spec > everything else. When a decision is ambiguous, apply the GDD's five tie-break principles (section "หลักการที่ใช้ตัดสินทุกข้อขัดแย้ง") in order.

## Non-negotiables (from the GDD, never trade these away)

1. **Server-authoritative.** The client sends only position + timestamp. Damage, drops, contribution, rewards, and the movement gate are computed on the server.
2. **Every reward passes the same movement gate** (at least 50 m of movement accumulated per 5-minute tick). No exceptions, raids included.
3. **All balance values live in config**, never hardcoded. The same goes for every name (zones, dungeons, monsters, items, bosses): they come from the back office.
4. **No PvP, no free-text chat** (10 quick commands only), **no player's individual position is ever shown to other players**. Only dungeon-level counts and roles.
5. **Outdoor only in v1.** The data model still carries `verification_mode` and `floor_level`.
6. **Low penalty, high travel cost.** Auto-retreat at 25% HP is on by default. Items never break when enhancing.
7. **PDPA:** separate consent for location, `position_log` TTL of 24 h, real account deletion, no real identity shown in profiles, age 15+ with a parental-consent flow scaffolded.

## Language and writing rules

- Design docs, specs, reports, and roadmap: **Thai** (matching the GDD). Technical identifiers stay in English.
- Code, code comments, commit messages, API names: **English**.
- In-game copy: Thai, following the GDD's six copy rules (section "โทนและภาษาในเกม"). The narrative-designer owns the final wording.
- **No emoji** in any document, report, or instruction file. Write statuses as words. Semantic arrows are fine.
- **Chunked writes:** no more than about 120 lines per Write/Edit call. Write a skeleton first, then append section by section. Subagents get cut off mid-response when one call is too long.

## Workspace map

```
studio/        roadmap, protocol, phase boards, ledgers, decisions, questions (producer)
design/        pillars, feature specs, systems, levels, narrative, ux (design roles)
config/        balance/*.json, content/*.json: every tunable value and name (systems-designer, liveops)
data/          coverage/, dungeons/, gps-traces/ (location-engineer, level-designer, qa)
art/           direction/, assets/, vfx/ (art roles)
audio/         direction, sfx specs, generated audio (sound-designer)
product/       PRDs, metrics, telemetry events (product-manager)
qa/            test plans, test reports, bug list (qa-tester)
ops/           live-ops calendar, runbooks (liveops-operator)
infra/         IaC, CI, monitoring (devops-engineer)
apps/, packages/   code; the layout is finalized by tech-lead in an ADR under docs/adr/
docs/          adr/, tech/ (tech notes per feature, API contracts)
```

## Commands

| Command | What it does |
| --- | --- |
| `/plan-phase <N>` | Producer, director, tech lead, and PM break Phase N into a task board. Stops so the human can review |
| `/run-phase <N>` | Runs every agent autonomously, in waves, until Phase N meets its exit criteria. Plans first if no board exists |
| `/phase-status [N]` | Read-only summary of the board: progress, blockers, open human questions |

## Actions no agent may take

Enter credentials or API keys, create cloud accounts, purchase anything, deploy to production, send messages to real people, or delete real user data. Each of these becomes a `HUMAN` task on the board with exact instructions for the person.
