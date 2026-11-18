# Review: XC-10 · Story 3.1: Like and unlike a tweet

- **Verdict:** APPROVE (round 2, both reviewers). Round 1 was CHANGES NEEDED (the code reviewer blocked on the AC3 test); both rounds are below.
- **Base commit reviewed:** `159502f`
- **Change set:** `git diff 159502f..HEAD -- src/frontend`: worker commit `7a4fd9f`, merged to main as
  `cc6e86d`. Built by morch worker `t-20261118-0c4a`, not by `/implement-story`.
- **Reviewers:** two separate subagents, following
  `.claude/skills/review-pr/reviewers/code-reviewer.md` and `accessibility.md`. Each was given only
  the story, the PRD's Non-Functional Requirements, `CLAUDE.md`, the diff and the commit messages.
- **Date:** 2026-11-18

## Code reviewer: CHANGES NEEDED

### Blocking

- `src/frontend/e2e/xc-10.spec.ts:222-252` (AC3) - The failing answer (500) comes back at once, so
  the test never sees the optimistic state (pressed, 4) before the failure. It checks "message,
  count 3, not pressed", which is also what an app with no optimistic update would show, so it
  cannot tell "goes back to what it was" from "never changed". The unit tests cover the rollback,
  but the e2e test and its QA video do not. - Hold the failing answer the way AC2 holds its answer:
  tap, assert pressed and "4" while the 500 is held, then release it. After that, assert the
  message, count "3" and not pressed.

### Non-blocking

- `src/frontend/e2e/xc-10.spec.ts:148` - The step "It stays liked once the answer has come back"
  does not wait for the answer. The poll on `calls` only shows the request was sent, so the step
  re-asserts what the step before it already checked. Wait for the response (for example
  `page.waitForResponse`), or drop the claim.
- `src/frontend/src/hooks/use-optimistic-toggle.ts:131` - `cancelQueries` on the timeline key also
  cancels an in-flight "load more" page, because revert is the default. Not run. If a tap during
  infinite-scroll loading drops that page, check that the list can still load more, or skip the
  cancel.
- `src/frontend/src/hooks/use-optimistic-toggle.ts:42,53` - The hook is generic over field,
  endpoints and message, but only patches the home timeline cache. Fine for XC-11 on the same
  timeline; make the cache key an option when another list of tweet cards appears.

Checked and clean: NF1 to NF5; it reuses the existing like endpoints and the `Button` primitive;
API calls are in `queries/likes.ts` with `credentials: "include"` and no hard-coded origin; no
generated files edited; no debug leftovers or weakened tests; the spec follows the project's rules
(`AC<n>` names, `evidence.step`, no writes to the shared API).

## Accessibility reviewer: APPROVE

### Blocking

None.

### Non-blocking

- `src/frontend/src/components/like-button.tsx:41` - The filled heart is the non-colour sign of
  the liked state, but the only test checks the `fill` attribute on the svg, not that the fill
  draws; the icon library may set its own `fill` on the paths. If it does not draw, the state is
  shown by colour alone. Check once in a browser in both themes.
- `src/frontend/src/components/like-button.tsx:36` - The liked and hover text is `rose-600` in
  light mode: about 4.7:1 on white, about 4.3:1 if the ghost variant's hover background is a light
  grey. Check that combination. Dark values (`rose-400`) are fine. The colours are fixed Tailwind
  values, not theme tokens, but each has a light and a dark variant.
- `src/frontend/src/components/like-button.tsx:34` - The count is only the button's description, so
  a screen reader says "Like, toggle button, pressed, 3"; "3 likes" would read better. The count
  change is not announced, which AC2 does not depend on.
- `src/frontend/src/hooks/use-optimistic-toggle.ts:152` - The failure message goes through a sonner
  toast; the diff does not show the `<Toaster />`, and the unit tests mock sonner. Only the e2e AC3
  shows the message really appears. Check the mounted Toaster announces it (sonner uses a polite
  live region); a `role="alert"` message would be stronger.
- `src/frontend/src/components/like-button.test.tsx:157` - The test called "keyboard" only calls
  `focus()` and `fireEvent.click`. Harmless for a native `<button type="button">`.

Checked and clean: no inputs added; the button is reachable with Tab and works with Enter and
Space and is never disabled while saving; no outline removed; `aria-label="Like"` with
`aria-pressed`; the heart svg is `aria-hidden`.

## Criteria → tests (merged)

| Criterion | Test | Result |
|---|---|---|
| AC1: Tapping like once likes the tweet; tapping again removes my like. | `AC1: tapping like once likes the tweet; tapping again removes my like` | ok - pressed state and count for like then unlike, POST then DELETE, neighbour untouched |
| AC2: The like count and the button state update immediately, even on a slow connection. | `AC2: the like count and the button state update immediately, even on a slow connection` | ok - the answer is held, and the pressed state and +1 count show before it arrives and after it is released |
| AC3: If saving my like fails, the count goes back to what it was and I see a message. | `AC3: if saving my like fails, the count goes back and I see a message` | **weak** - the 500 is answered at once, so the test cannot tell a rollback from no change |

---

# Round 2 (2026-11-18, after the AC3 test fix)

- **Verdict:** APPROVE (both reviewers)
- **Base commit reviewed:** `159502f`
- **Change set:** the original source change (`git diff 159502f..cc6e86d`) plus the e2e spec as it now
  stands (`git diff 159502f..97e1648 -- src/frontend/e2e/xc-10.spec.ts`). The fix is worker commit
  `c4ea947`, merged as `97e1648`; only `e2e/xc-10.spec.ts` changed, no application code.
- **What changed:** AC3 now holds the failing answer, as AC2 holds its answer. The AC1 step
  "It stays liked once the answer has come back" now waits for the POST response.

## Round 2 · Code reviewer - APPROVE

### Blocking

None. Round 1's blocker is fixed: AC3 fails if the optimistic update is missing (the "4" check) and
fails if the rollback is missing (the "3" and not-pressed checks), and its `try/finally` always
releases the held answer.

### Non-blocking

- `src/frontend/e2e/xc-10.spec.ts:14` - The header comment still says a test can hold an answer back
  "(AC2) or answer 500 (AC3)". AC2 and AC3 now both hold their answers; update the comment.
- `src/frontend/e2e/xc-10.spec.ts:217-222` - The AC2 step "The answer arrives: nothing jumps" only
  re-asserts pressed and 4, which were already true, so it passes before the answer is processed.
  Wait for the POST response, as AC1 now does. The criterion is already met by the held-answer steps.

Checked and clean: the code matches the story; NF1, NF4 and NF5 hold; conventions (`Button` reused,
`credentials: "include"`, no hard-coded origin, no generated files); mutations as plain fetch
functions fit; no tests skipped or weakened.

## Round 2 · Accessibility reviewer - APPROVE

### Blocking

None.

### Non-blocking

- `src/frontend/e2e/xc-10.spec.ts:217` - The same AC2 last step passes before the response is
  processed. AC2's criterion is still proven by the held-answer steps above it.
- `src/frontend/src/components/like-button.tsx:36` - The colours are `rose-600` and `rose-400`, not
  theme tokens, but both themes have explicit `dark:` variants. `rose-600` is about 4.7:1 on white; on a
  light grey hover background it could drop to about 4.3:1, so `rose-700` would be safer for hover.
- `like-button.tsx:44` - The count changes with no announcement; the pressed-state change is announced
  on the focused button, and no criterion depends on the count.
- `src/frontend/src/hooks/use-optimistic-toggle.ts:152` - The failure message is a sonner toast (a
  polite live region); no test checks that it is announced.
- `src/frontend/src/components/like-button.test.tsx:156` - The test "can be reached and pressed with
  the keyboard" only calls `focus()` and `fireEvent.click`.
- `like-button.test.tsx:76` - Nothing checks that the icon has `aria-hidden`.

## Round 2 · Criteria → tests (merged)

| Criterion | Test | Result |
|---|---|---|
| AC1: Tapping like once likes the tweet; tapping again removes my like. | `AC1: tapping like once likes the tweet; tapping again removes my like` | ok - state and count 3, 4, 3; POST then DELETE; waits for the POST response before asserting the state stays; neighbour untouched |
| AC2: The like count and the button state update immediately, even on a slow connection. | `AC2: the like count and the button state update immediately, even on a slow connection` | ok - pressed and 4 asserted while the answer is held, before any response |
| AC3: If saving my like fails, the count goes back to what it was and I see a message. | `AC3: if saving my like fails, the count goes back and I see a message` | ok (was weak) - the 500 is held: pressed, 4 and no message before release; after release the exact message, not pressed and 3 |
