# Runbook: billing guard -- verify token scope + set billing notifications (D-085)

Owner: devops-engineer (P2-F04-T08). Used by **HUMAN P2-C07** (one-time, after this task is
DONE). Nothing in this file is run by an agent or a workflow -- every step below reads a
Cloudflare/GitHub billing or token-scope screen, which no agent may hold credentials to see
(CLAUDE.md "you never hold credentials").

Related:

- `studio/decisions/decision-log.md` D-085 -- a card is on file on Cloudflare but the account
  stays on the **Free plan only**; nothing billable may be enabled by an agent or a workflow.
- `infra/scripts/check-billing-guard.sh` (run by CI job `billing-guard`,
  `.github/workflows/ci.yml`) -- the automated, static half of this guard.
- `infra/runbooks/preview-setup.md` section 2 -- where the token in step 2 below was created
  (P1-F02-T17).

## 1. Why this is two halves, not one

D-085 needs two different kinds of check, and only one of them can run in CI:

| what | who checks it | how |
| --- | --- | --- |
| This repo's own workflows/scripts/config never *call* a billable Cloudflare product or a non-free-tier GitHub feature | CI, every push/PR (`billing-guard` job) | static grep, `infra/scripts/check-billing-guard.sh` -- no token, no network, no API call |
| The **real** Cloudflare API token (`CLOUDFLARE_API_TOKEN` secret) is still scoped to exactly `Account > Cloudflare Pages > Edit`, nothing more, and the Cloudflare account's Billing page shows Free plan with no paid product enabled | **HUMAN**, this runbook, section 2 | reading the Cloudflare dashboard directly -- this is not something a static grep of files in this repo can ever prove, since the token's real scope lives in Cloudflare's account, not in any file here |

The CI job catches "someone added a `wrangler r2 ...` call to a script" the moment it is pushed.
It cannot catch "someone widened the token's permissions in the Cloudflare dashboard" or "someone
clicked upgrade on the Billing page" -- those never touch a file in this repo at all. That is why
section 2 exists and must be done by a human with dashboard access, not automated.

## 2. HUMAN P2-C07 -- verify token scope + Cloudflare billing state

Do this once per token (repeat only if the token is ever recreated or its permissions edited).

1. Sign in to <https://dash.cloudflare.com> with the project's account.
2. **Token scope:** My Profile -> API Tokens -> find the token used as the `CLOUDFLARE_API_TOKEN`
   GitHub secret (created in `infra/runbooks/preview-setup.md` section 2 step 4) -> click it (or
   "Roll" is not needed, just view/edit) -> confirm its **Permissions** list is exactly
   `Account > Cloudflare Pages > Edit` and nothing else (no Workers Scripts, no D1, no R2, no
   Images, no Stream, no Account Billing). If it has more than that, edit the token down to just
   Pages:Edit, or create a replacement token with only that scope and update the GitHub secret
   (`infra/runbooks/preview-setup.md` section 2 step 5), then delete the old, over-scoped one.
3. **Billing plan:** Billing -> confirm the plan shown is **Free** for both Workers & Pages and
   the account overall. If anything shows a paid plan or an active subscription, **stop and report
   to the orchestrator** before doing anything else -- do not downgrade it yourself without
   understanding why it changed (it might be an earlier deliberate HUMAN decision already on
   record in the decision log; check there first).
4. **Payment method:** Billing -> Payment methods -- a card on file is expected and already
   accepted (D-085, this is the documented exception to D-001 "no card"). Confirm there is still
   no *active* paid subscription attached to it (a card merely being on file costs nothing by
   itself).

## 3. HUMAN -- set a Cloudflare billing/spending notification

Cloudflare's Free plan has no usage-based charge by definition, so there is nothing to set a
*spending limit* on -- but a notification is still worth turning on as an early warning in case a
paid product is ever accidentally enabled (e.g. by a future task that needs a real HUMAN
cost-approval decision first, `infra/runbooks/preview-setup.md` section 7).

1. Dashboard -> Notifications (bell icon, top right, or Account Home -> Notifications).
2. **Add** -> look for a notification type covering billing/invoice events (Cloudflare's exact
   name for this varies by account type -- look for "Billing", "Invoice", or "Usage-Based Billing"
   in the notification type list). If none of these exist for a Free-plan account, note that in
   your report to the orchestrator instead of skipping silently -- it means the only real signal
   left is noticing a charge on the card's statement, which is a weaker guard and worth a decision
   log entry.
3. Set the destination to an email the project actually monitors (not a throwaway address).
4. Save. Screenshot or note the confirmation, but **never paste the token or any account ID
   screenshot that reveals a secret into chat, an issue, or a committed file** (D-002, repo is
   public).

## 4. HUMAN -- set a GitHub Actions/Packages billing notification

GitHub Actions is unlimited-minutes free for a **public** repo (D-001, D-002) and this repo has no
private fork/mirror that would consume paid minutes, but GitHub Packages storage and any
future private repo would not be. Turning on the notification costs nothing and catches a mistake
early (e.g. someone forking to a private repo and pushing there instead, or GitHub changing free
quotas for public repos in the future).

1. <https://github.com/settings/billing> (personal account) or the organization's equivalent
   `https://github.com/organizations/<org>/settings/billing` if this repo lives under an org.
2. **Payment information** -> confirm no active paid product/subscription is listed (Actions
   minutes and Packages storage both show "included" / "$0" for a plan with no paid add-on).
3. **Budgets and alerts** (or "Spending limit" on older account UIs) -> set a **spending limit of
   $0** if that option exists for this account type -- this makes GitHub refuse to let any paid
   usage accrue at all rather than merely notifying after the fact, which is the strongest
   available guard for D-085's GitHub half.
4. If a spending limit of $0 is not offered (some account tiers only offer notifications, not a
   hard cap), add a billing email notification instead, same idea as section 3.
5. Note the result (limit set to $0, or notification-only with the reason) in your report to the
   orchestrator -- do not silently pick whichever option needed no explanation.

## 5. What "DONE" means for this runbook (orchestrator gate before P2-C07)

Per the board (P2-F04-T08 acceptance, and the P2-C07 row): this runbook itself only needs to
**exist and be accurate** for P2-F04-T08 to be DONE -- the orchestrator does not wait for a human
to actually walk through sections 2-4 before marking this task complete. What the orchestrator
*does* wait for is: **do not send P2-C07 to HUMAN until this file exists** (it is the set of
instructions P2-C07 follows). Section 2-4 execution itself is P2-C07's own job, to be done by a
human, not by re-running this task.

## 6. What to report back after doing sections 2-4 (for whoever files the P2-C07 result)

- Token scope confirmed as `Account > Cloudflare Pages > Edit` only (or: was wider, now fixed --
  say what it was).
- Cloudflare Billing page: plan name shown, no active paid subscription.
- Cloudflare notification: type enabled (or: not available on this plan, noted here instead).
- GitHub: spending limit set to $0 (or: notification-only, with the reason), no active paid
  product.
- One sentence confirming no screen asked to add a card beyond the one already on file (D-085) or
  to upgrade a plan.

Never include the token value, the Cloudflare Account ID, or any billing screenshot that shows a
card's last-4 digits or an invoice number in this report (D-002, repo is public) -- a plain-text
confirmation of what was checked is enough.
