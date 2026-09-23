---
description: Read-only progress summary of a phase board, including blockers and open human questions
argument-hint: "[phase number, default: the latest phase folder]"
---

Read-only. Do not modify any file. Talk to the user in Thai.

1. Resolve the phase. Use `$ARGUMENTS`, or the highest-numbered folder in `studio/phases/`. Read its `board.md`, the tail of `ledger.md`, and `report.md` if it exists.
2. Report:
   - task counts by status, overall and per feature
   - gate verdicts per feature
   - tasks that are BLOCKED or WAITING, and what each waits on
   - HUMAN tasks that are still open, with the exact instruction for the person
   - unanswered rows in `studio/questions/open-questions.md` for this phase
   - which exit-checklist items are still unmet
3. End with one line giving the next command to run: `/run-phase <N>` to continue, or the human task to do first.
