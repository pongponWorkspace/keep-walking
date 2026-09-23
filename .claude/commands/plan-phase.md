---
description: Break one roadmap phase into a task board through producer, game-director, tech-lead, and product-manager, then stop for human review
argument-hint: <phase number>
model: opus
---

You are the **studio orchestrator** for the planning step of Phase `$ARGUMENTS`. Subagents cannot call each other; you spawn them, pass their results along, and write the files only they are not allowed to write. Talk to the user in Thai.

## Run continuously

Run to the end in one turn. After every Agent call, block for the result (`run_in_background: false`) and continue. The only allowed stop is AskUserQuestion or the final summary. Never end the turn saying you are waiting for an agent.

## Steps

1. **Preflight.** If `$ARGUMENTS` is empty, ask for the phase number. Read `CLAUDE.md`, `studio/protocol.md`, and the Phase `$ARGUMENTS` section of `studio/roadmap.md`. If the previous phase has no `studio/phases/phase-<N-1>/report.md` with status COMPLETE, tell the user and ask whether to plan anyway. If `studio/phases/phase-<N>/board.md` already exists, ask whether to replan from scratch or refine the existing board.

2. **Create the phase folder** `studio/phases/phase-<N>/` with `ledger.md`. Run `date '+%Y-%m-%d %H:%M'` and write the ledger header:

   ```
   # Phase <N> Ledger
   | # | Wave | Task | Agent | Start | End | Result |
   ```

   Stamp real wall-clock values from `date` taken right before each dispatch and right after each result. Never compute them.

3. **Draft the board.** Spawn `producer` with a TASK BRIEF (type `plan`, id `P<N>-PLAN-01`). It reads the roadmap phase, the GDD sections behind every feature, and `studio/protocol.md` sections 7 and 8. It writes `studio/phases/phase-<N>/board.md` using the standard chain, including review gates, HUMAN tasks, and a Phase Exit Checklist copied from the roadmap. Rules for the producer's board:
   - 1 to 3 working days per task, split larger ones.
   - Every task has an owner from the 18 agents or `HUMAN`, explicit `Deps`, and exclusive `Writes` paths.
   - No two tasks that can run in the same wave share a `Writes` path.
   - Every feature ends with its gates.
   - Phase 1 only: the first tech task is tech-lead's repo scaffold ADR (it decides the `apps/` and `packages/` layout and runs `git init` if the folder is not a repo).

4. **Cross-review in parallel.** In one message, spawn `game-director`, `tech-lead`, and `product-manager`, each with a `review-gate` brief on the board draft. Each writes its review to `studio/phases/phase-<N>/plan-review-<role>.md` covering missing tasks, wrong owners, wrong dependencies, and scope that contradicts the GDD. Each returns a REPORT.

5. **Finalize.** Spawn `producer` again (`P<N>-PLAN-02`) with the three reviews to revise the board. It records the changes made and the review points it rejected, with reasons, at the bottom of the board.

6. **Collect human questions.** Merge `questions_for_human` from all reports into `studio/questions/open-questions.md` (append, grouped by phase). Blocking questions become rows the user answers now. Ask them with AskUserQuestion: at most 4 per call, plain Thai, concrete options. Write the answers into the board context section and into `studio/decisions/decision-log.md`.

7. **Stop for human review.** Summarize for the user in Thai:
   - task count per feature and per role
   - the critical path
   - HUMAN tasks and when each is needed
   - assumptions the team made

   Then tell them to edit the board directly or reply with changes, and to run `/run-phase <N>` when ready. Do not start execution.
