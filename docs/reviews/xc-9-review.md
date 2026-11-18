# Review: XC-9 · Story 2.2: Post a tweet

- **Verdict:** APPROVE (both reviewers)
- **Base commit reviewed:** `cc6e86d`
- **Change set:** `git diff cc6e86d..55dda49 -- src/frontend`: worker commit `4fa4101`, merged to main
  as `55dda49`. Built by morch worker `t-20261118-55c1`, not by `/implement-story`.
- **Reviewers:** two separate subagents, following
  `.claude/skills/review-pr/reviewers/code-reviewer.md` and `accessibility.md`. Each was given only
  the story, the PRD's Non-Functional Requirements, `CLAUDE.md`, the diff and the commit messages.
- **Date:** 2026-11-18
- **Note:** the story says the length and image limits are "Not known yet". The change uses the API's
  documented limits (280 characters after trimming; JPEG, PNG, GIF or WebP; 5 MB each). The product
  owner should record them.

## Code reviewer - APPROVE

### Blocking

None.

### Non-blocking

- `src/frontend/e2e/xc-9.spec.ts:204-206` (`settle`) - `waitForLoadState("networkidle")` resolves at
  once when the page was already idle, so it does not wait for a request the app has just started.
  The "nothing was sent" checks in AC3 (:393) and AC4 (:475) are saved only because `api.calls` is
  cumulative and re-read later (AC3 :416, AC4 :497-498). The same holds for the one-shot
  `timelineRequests` count in AC2 (:349-352, :365). Add a short quiet wait before the last
  "nothing was sent" and "no second timeline request" reads.
- `src/frontend/e2e/xc-9.spec.ts:389-392` - Enter, Control+Enter and Meta+Enter in a textarea do not
  submit a form; only `requestSubmit()` exercises the guard in `handleSubmit`. The step passes but its
  caption oversells it.
- `src/frontend/e2e/xc-9.spec.ts:558-560` - The image-only tweet in AC1 and AC3 relies on the real API
  making `content` optional. The contract test only checks that the `content` and `mediaKeys`
  properties exist; also assert the schema's `required` list.
- `src/frontend/src/lib/compose.ts:25` (pinned by `e2e/xc-9.spec.ts:448` and `lib/compose.test.ts:28`) -
  "Your tweet is 1 characters over the 280 limit." is ungrammatical. Cosmetic.
- `src/frontend/src/components/tweet-composer.tsx` - The hidden file input and the "Add image" button are
  two tab stops for one action. Fine for now; NF8 is "Not known yet".
- NF1 - The new tweet shows after the upload and create calls return, with "Posting..." in the
  meantime. That meets "straight away, no refetch" in AC2, but it is not an optimistic insert.

## Accessibility reviewer - APPROVE

### Blocking

None.

### Non-blocking

- `src/frontend/src/components/tweet-composer.tsx:110` - The textarea has an accessible name and
  `aria-invalid`, but its error messages (:140, :145, :150) and the count (:179) are not tied to it.
  Give the alerts ids and point `aria-describedby` at them and at the count.
- `tweet-composer.tsx:188` (and :55, :169) - Post and Add image disable while posting, and Post stays
  disabled after a successful post, so a keyboard user who pressed Post loses focus. Put focus back on
  the textarea after the post succeeds or fails.
- `tweet-composer.tsx:55` - A successful post is not announced. Add a visually hidden `role="status"`
  such as "Tweet posted".
- `tweet-composer.tsx:140` - The over-the-limit `role="alert"` changes with every keystroke past 280,
  so a screen reader repeats it. Announce the crossing once, or keep the changing number out of the
  live region.
- `tweet-composer.tsx:157` - The focus ring for the hidden file input is `ring-2 ring-ring/50` with no
  border change, probably under 3:1 in light mode. Use `ring-ring` at full strength.
- `tweet-composer.tsx:158,167` - One action has two tab stops (the invisible file input, then "Add
  image"). Deliberate (AC1 expects the input to be focusable); a screen reader user hears both.
- `tweet-composer.tsx:134,173` - The icons have no `aria-hidden`. If `HugeiconsIcon` does not set it,
  hide these decorative icons.
- `src/frontend/e2e/xc-9.spec.ts:236` - AC1 posts with a mouse click. Add one real Tab to Post and
  Enter step.

## Criteria → tests (merged)

| Criterion | Test | Result |
|---|---|---|
| AC1: I can type a tweet and post it, with or without one image. | `AC1: I can type a tweet and post it, with or without one image` | ok - text only (trimmed, no upload), image only (upload field `files`, then `mediaKeys`, no content), and both; the "Posting..." state and a cleared composer |
| AC2: My new tweet appears at the top of my timeline straight away. | `AC2: my new tweet appears at the top of my timeline straight away` | ok - the stubbed timeline never gains the tweet, so only an in-app cache insert can pass; order checked twice, including an image tweet; one timeline request |
| AC3: I cannot post an empty tweet. | `AC3: I cannot post an empty tweet` | ok - empty, spaces and blank lines keep Post disabled; `requestSubmit()` on whitespace sends nothing; an image-only tweet is empty again once the image is removed; no upload or tweet request |
| AC4: If the tweet is too long or the image is not allowed, I see a clear message. | `AC4: if the tweet is too long or the image is not allowed, I see a clear message` | ok - 283 characters gives the message with Post disabled and 280 passes; a text file, an SVG and a PNG over 5 MB are refused and not attached; the API's 400, 413 and 500 and a network failure are covered |
