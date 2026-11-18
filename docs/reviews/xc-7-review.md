# Review: XC-7 · Story 1.3: Keep the app behind sign-in

- **Verdict:** APPROVE (both reviewers)
- **Base commit reviewed:** `844c6af`
- **Change set:** `git diff 844c6af..HEAD` - one commit, `159502f` "XC-7: Keep the app behind
  sign-in". It adds `src/frontend/e2e/xc-7.spec.ts` and a `notFoundComponent` in
  `src/frontend/src/routes/__root.tsx`.
- **Reviewers:** two separate subagents, following
  `.claude/skills/review-pr/reviewers/code-reviewer.md` and `accessibility.md`. Each was given
  only the story, the PRD's Non-Functional Requirements, `CLAUDE.md`, the diff and the commit
  messages.
- **Date:** 2026-11-18

## Code reviewer - APPROVE

### Blocking

None.

### Non-blocking

- `src/frontend/e2e/xc-7.spec.ts:124` (also `:88`) - The signed-in regression test and the AC2
  address list use `/profile/someone` as an address no page matches. It will break, and look like
  a regression, once a profile route lands. Use an address that can never become a route, such as
  `/no-such-page`.
- `src/frontend/e2e/xc-7.spec.ts:99-105` - The step "Going back to the home page from inside the
  app" is `pushState` then `reload`, which is just a fresh load of `/`, already covered by the
  first address in the loop. Rename or drop it; its caption will mislead people watching the QA
  video.
- `src/frontend/src/routes/__root.tsx:37-40` - If the session query errors, `session` is undefined
  and a signed-in person is sent to `/sign-in`. That fails closed, which suits NF4; the `_auth`
  guard then decides what they see.
- `src/frontend/src/routes/__root.tsx:5-10` - `useQuery` and `import type { QueryClient }` come
  from `@tanstack/react-query` on separate lines. Cosmetic.

Checked and clean: the `NotFound` component closes the real gap (an unmatched address skipped the
`_app` and `_auth` guards); it reuses `sessionQueryOptions`, hard-codes no API origin and leaves
`routeTree.gen.ts` and the UI primitives alone; no new backend work (NF5), no secrets, debug
leftovers or skipped or weakened tests; the spec never clicks Sign out, uses an empty storage
state for the signed-out checks and the saved sign-in only for the signed-in regression test.

## Accessibility reviewer - APPROVE

### Blocking

None.

### Non-blocking

- `src/frontend/src/routes/__root.tsx:39` - `if (isPending) return null` leaves a blank page while
  the session check runs, and nothing is announced. It is brief and the story does not depend on
  it; a `role="status"` "Loading" text could be added if the wait is ever noticeable.
- `src/frontend/src/routes/__root.tsx:42` - The signed-in "Not Found" message is a bare `<p>`
  with no heading and no `<main>` landmark. Contrast is fine in both themes (`text-muted-foreground`
  token). Consider a heading; the story does not ask for one.

Checked and clean: the change adds no form fields, buttons or icon controls; the redirect leaves
keyboard access and focus alone.

## Criteria → tests (merged)

| Criterion | Test | Result |
|---|---|---|
| AC1: When I am not signed in, I can only see the sign-in and sign-up screens. | `AC1: when I am not signed in, I can only see the sign-in and sign-up screens` | ok - starts signed out (session null), shows both screens by heading and by the links between them, opens each directly, no app content (Sign out, Home heading, articles, "No tweets yet."), no data request, session still null |
| AC2: If I open any other page while signed out, I am sent to the sign-in screen. | `AC2: if I open any other page while signed out, I am sent to the sign-in screen` | ok - `/`, `/?tab=latest`, `/profile/someone`, `/tweets/123`, `/settings` and a reload after `pushState`: each ends on `/sign-in` with the heading, no app content, no data request, session still null |
