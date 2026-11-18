# Review: XC-6 · Story 1.2: Sign in

- **Verdict:** APPROVE (both reviewers)
- **Base commit reviewed:** `17e5740`
- **Change set:** `git diff 17e5740..HEAD` - one commit, `844c6af` "XC-6: Sign in". It adds
  `src/frontend/e2e/xc-6.spec.ts` only; the sign-in screen predates the base, as the sign-up
  screen did for XC-5.
- **Reviewers:** two separate subagents, following
  `.claude/skills/review-pr/reviewers/code-reviewer.md` and `accessibility.md`. Each was given
  only the story, the PRD's Non-Functional Requirements, `CLAUDE.md`, the diff and the commit
  messages.
- **Date:** 2026-11-18

## Code reviewer - APPROVE

### Blocking

None.

### Non-blocking

- `src/frontend/e2e/xc-6.spec.ts` (whole file) - The sign-in page and hooks, and every UI string
  and endpoint the spec relies on ("Incorrect email or password.", the "Sign in to X Clone" and
  "Home" headings, "Sign out", "No tweets yet.", `GET /api/timeline`), are not in the diff, so
  they could not be confirmed. A wrong guess would fail loudly at run time. `getByRole("heading",
  { name: "Home" })` is a substring match and would fail on strict-mode ambiguity if a second
  heading contained "Home".
- `src/frontend/e2e/xc-6.spec.ts:77, 83, 120, 164` - The tests use the value `evidence.step(...)`
  returns as the credentials; that only typechecks if the fixture's `step` returns the callback's
  result. (It does; the hand-over reports `tsc -b`, lint and the e2e runs green.)
- `src/frontend/e2e/xc-6.spec.ts:114, 158` - The AC2 and AC3 test names reword the criterion;
  AC1 is verbatim. Use the story's wording if QA tooling matches names.
- `src/frontend/e2e/xc-6.spec.ts:10, 19` - The comment says "one per run", but `account` is a
  module-level cache, so it is per worker and per project (`verify` plus `evidence` create two).
  The `xc6-e2e-<uuid>@example.com` accounts are never cleaned up on the shared API. A justified
  departure from "signed in as the person", since sign-in cannot use the saved session. Fix the
  comment; the person may want to know about the leftover accounts.
- `src/frontend/e2e/xc-6.spec.ts:164-201` - AC3 makes three sign-in POSTs in quick succession
  after the sign-ins in AC1 and AC2. If the API rate-limits sign-in per IP this would give 429
  instead of 401. Unverified; the spec would fail loudly rather than pass wrongly.
- NF2 (desktop and phone widths) is not exercised; the story does not ask for it. NF4 and NF5 are
  respected: no backend changes, only the existing auth API through relative `/api/...` paths.

## Accessibility reviewer - APPROVE

### Blocking

None.

### Non-blocking

- `src/frontend/e2e/xc-6.spec.ts` (whole file) - The change set is a spec only and adds no user
  interface; `sign-in.tsx` and its hooks are not in the diff. The spec shows that
  `getByLabel("Email")` and `getByLabel("Password")` resolve (both inputs have an accessible name)
  and that the refusal is `role="alert"`. Not confirmable from the diff: the error tied to its
  field (`aria-describedby` / `aria-invalid`), visible focus, contrast in both themes using theme
  tokens, and `type="password"` on the password input.
- `src/frontend/e2e/xc-6.spec.ts:102` - The form is only ever submitted with a click. Pressing
  Enter in the password field once (for example in AC1) would cover keyboard use. Optional.
- NF8 (Accessibility) is "Not known yet", so there is no target beyond the checks above.

## Criteria → tests (merged)

| Criterion | Test | Result |
|---|---|---|
| AC1: I can sign in by entering my email and password. | `AC1: I can sign in by entering my email and password` | ok - starts signed out, fills only email and password, sign-in POST returns 200, no alert, Sign out button shows, session email matches |
| AC2: After signing in, I am taken to the home timeline. | `AC2: after signing in I am taken to the home timeline` | ok - URL is `/`, sign-in heading gone, `GET /api/timeline` 200, "Home" heading, tweets or the empty message, no alert, still on the timeline after a reload |
| AC3: If my email or password is wrong, I see a clear message and stay signed out. | `AC3: a wrong email or password shows a clear message and I stay signed out` | ok - wrong password and unknown email: each gets a 401, the exact alert text, stays on `/sign-in`, no Sign out button, null session; the right credentials still sign in |
