# Review: XC-5 · Story 1.1: Sign up

- **Verdict:** APPROVE
- **Base commit reviewed:** `a97f23f`
- **Change set:** `git diff a97f23f..HEAD` — one commit, `08ac95f` "XC-5: Sign up", adding
  `src/frontend/e2e/xc-5.spec.ts` (210 lines). No application code changed.
- **Reviewer:** a separate subagent following `.claude/skills/review-pr/reviewers/code-reviewer.md`,
  given only the story, the PRD's Non-Functional Requirements, `CLAUDE.md`, the diff and the
  commit messages.
- **Date:** 2026-11-18

## Blocking

None.

## Non-blocking

1. `src/frontend/e2e/xc-5.spec.ts:1` — The change set adds only this spec and no application
   code. The sign-up screen it exercises (`/sign-up`, the "Create your account" heading, the
   validation messages) predates `a97f23f`, so checks 2-4 (story behaviour in code, NF2/NF3/NF4,
   `components/ui/` reuse, `src/queries/` conventions, generated files) could not be reviewed
   from the given inputs. Nothing in the diff breaches them; confirm the pre-existing screen was
   meant to count as this story's implementation.
2. `src/frontend/e2e/xc-5.spec.ts:62` — No test runs the form at phone width (NF2). The existing
   `verify` / `evidence` projects may cover viewports, but that is not visible in the diff.
3. `src/frontend/e2e/xc-5.spec.ts:137` — The direct API sign-up sends a `name`, while the form
   test fills only email and password, so the app must be deriving a name somewhere outside the
   diff. Not checked here.
4. `src/frontend/e2e/xc-5.spec.ts:16` — Every run creates three throwaway accounts
   (`xc5-e2e-<uuid>@example.com`) on the shared API and never removes them. Acceptable for a
   sign-up story, but they accumulate.

## Criteria → tests

| Criterion | Test | Result |
|---|---|---|
| AC1: I can create an account by entering an email and a password. | `AC1: I can create an account with an email and a password` | ok — form filled with only email and password, sign-up POST returns 200, no alert, and the same credentials then sign in from a cookie-less client |
| AC2: After signing up, I am signed in and taken into the app. | `AC2: after signing up I am signed in and taken into the app` | ok — lands on `/`, Sign out is visible but not clicked, `get-session` returns the new email, state survives a reload |
| AC3: If the email is already used or the details are invalid, I see a clear message and no account is created. | `AC3: a used email or invalid details show a clear message and create no account` | ok — used email: exact alert text, stays on `/sign-up`, session is null, new password gets 401 and the original still gets 200; invalid email, short password, mismatched passwords and empty form: each shows a message, stays on `/sign-up`, sends zero sign-up requests, and the credentials get 401 |

## Conventions and safety in the diff

Imports `test` / `expect` from `./fixtures`; actions wrapped in `evidence.step`; tests named
`AC<n>: …`; signed-out state via an empty `storageState`; no Sign out click; relative API paths
with no hard-coded origin; random passwords with no secrets; no skipped tests or debug leftovers;
no generated files touched. The commit message is `XC-5: Sign up`.
