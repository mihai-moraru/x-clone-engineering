# Review: XC-11 · Story 3.2: Retweet and undo a retweet

- **Verdict:** APPROVE (both reviewers)
- **Base commit reviewed:** `55dda49`
- **Change set:** `git diff 55dda49..8211b62 -- src/frontend` (worker commit `50e9c06`, merged as
  `8211b62`) plus the spec as it stands after the follow-up fix (`git diff 8211b62..b31c705 --
  src/frontend/e2e/xc-11.spec.ts`, worker commit `4006711`, merged as `b31c705`). Built by morch
  workers `t-20261118-9004` and `t-20261118-3a0e`, not by `/implement-story`.
- **Reviewers:** two separate subagents, following
  `.claude/skills/review-pr/reviewers/code-reviewer.md` and `accessibility.md`. Each was given only
  the story, the PRD's Non-Functional Requirements, `CLAUDE.md`, the diff and the commit messages.
- **Date:** 2026-11-18
- **Note:** the hook `src/hooks/use-optimistic-toggle.ts` is unchanged here (added by XC-10), so it
  was not in the diff and neither reviewer could read it.

## Code reviewer - APPROVE

### Blocking

None.

### Non-blocking

- `src/frontend/e2e/xc-11.spec.ts:~217` (AC2, step "The answer arrives: nothing jumps, the retweet
  is saved") - After `release()` the assertions (pressed, "4") were already true, so they pass at
  once and prove neither that the answer arrived nor that nothing jumped. Start `page.waitForResponse`
  for the POST before the tap and await it first, as AC1 now does. The criterion is covered by the
  earlier held-answer step.
- `src/frontend/e2e/xc-11.spec.ts:~210` (AC2, step "The screen still shows the new state...") -
  Repeats the previous step's assertions. Harmless.
- `src/frontend/e2e/xc-11.spec.ts:~139-160` (AC1) - `retweetSaved` is created before the tap and
  only awaited in the next step; if the tap step fails first the promise can reject unobserved. Noise
  on a failing run only.
- `src/frontend/src/queries/retweets.ts` - Plain `fetch` calls rather than `queryOptions`; fine for
  mutations and consistent with the like story. Relative URL and `credentials: "include"` are right.
- `use-optimistic-toggle.ts` was not in the diff. AC3's end state (count 3, not pressed) would also
  be reached if the hook refetched the timeline, since the fake timeline always serves the original
  tweet; the test checks the observable behaviour the criterion asks for.

Checked and clean: NF1 (optimistic update through the shared hook), NF3, NF4, NF5; `Button` reused;
no generated files edited; no skipped or weakened tests; no debug leftovers or secrets; the spec
imports from `./fixtures`, wraps actions in `evidence.step`, never signs out and writes nothing to
the shared API.

## Accessibility reviewer - APPROVE

### Blocking

None.

### Non-blocking

- `src/frontend/src/components/retweet-button.tsx:42` - The pressed and hover text uses `emerald-600`
  in light mode, about 3.8:1 on white, below the ~4.5:1 target for small text, and it is a fixed
  palette colour, not a theme token. Dark mode (`emerald-400`) is fine. State is not shown by colour
  alone (icon stroke 1.5 to 2.5, a semibold count and `aria-pressed`), so this is not blocking.
  Consider `emerald-700` for light mode.
- `src/frontend/src/components/retweet-button.test.tsx:207` - The keyboard test only calls `focus()`
  and `fireEvent.click`; a native `<button type="button">` handles Enter and Space, so nothing is at
  risk.
- `retweet-button.tsx:44` - The count changes without a live announcement of its own; the
  `aria-pressed` change and the failure toast cover the criteria.

## Criteria → tests (merged)

| Criterion | Test | Result |
|---|---|---|
| AC1: Tapping retweet once retweets the tweet; tapping again undoes it. | `AC1: tapping retweet once retweets the tweet; tapping again undoes it` | ok - `aria-pressed` and count 3, 4, 3; POST then DELETE for the right tweet; waits for the POST answer; neighbour untouched |
| AC2: The retweet count and the button state update immediately, even on a slow connection. | `AC2: the retweet count and the button state update immediately, even on a slow connection` | ok - the POST answer is held; pressed and "4" are asserted while it is pending; `release()` always runs |
| AC3: If saving my retweet fails, the count goes back to what it was and I see a message. | `AC3: if saving my retweet fails, the count goes back and I see a message` | ok - the 500 is held: pressed, "4" and no message first, then the message, then not pressed and "3" |
