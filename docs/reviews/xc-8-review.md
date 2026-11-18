# Review: XC-8 · Story 2.1: Scroll the home timeline

- **Verdict:** CHANGES NEEDED (both reviewers)
- **Base commit reviewed:** `08ac95f`
- **Change set:** `git diff 08ac95f..HEAD` — one commit, `5e08314` "XC-8: Scroll the home timeline".
- **Reviewers:** two separate subagents, following
  `.claude/skills/review-pr/reviewers/code-reviewer.md` and
  `.claude/skills/review-pr/reviewers/accessibility.md`. Each was given only the story, the PRD's
  Non-Functional Requirements, `CLAUDE.md`, the diff and the commit messages.
- **Date:** 2026-11-18

## Code reviewer — CHANGES NEEDED

### Blocking

1. `src/frontend/src/queries/tweets.ts:32` — AC1 asks for tweets "from all users", but the home
   page reads `/api/timeline`, which the spec's own header (`src/frontend/e2e/xc-8.spec.ts:8-9`)
   says holds only the viewer's tweets and those of accounts they follow. A user who follows
   nobody sees "No tweets yet." while others have posted (the AC4 test relies on exactly this,
   `xc-8.spec.ts:272-275`). — Read from an existing endpoint that returns everyone's tweets, if
   the API has one. If it has none, NF5 forbids new backend work, so raise it with the product
   owner rather than narrowing the criterion.
2. `src/frontend/e2e/xc-8.spec.ts:90` — The AC1 test makes the viewer follow every author before
   checking, so it proves "tweets from people I follow", not "from all users"; it can never catch
   the breach above. — Include at least one author the viewer does not follow and expect that
   tweet to show.
3. `src/frontend/e2e/xc-8.spec.ts:272` — The AC4 test reaches the empty state through "follows
   nobody" on a shared API that has tweets, not through "there are no tweets yet". — Once the
   timeline shows all users, set up a truly empty result (for example, stub the timeline response
   for this test) and keep the same assertions.

### Non-blocking

- `src/frontend/e2e/xc-8.spec.ts:12` — The spec drops the saved sign-in and signs up 9 throwaway
  accounts (and about 50 tweets) per run on the shared API, twice when both projects run, with no
  cleanup. `CLAUDE.md` says specs run "signed in as the person". The reason given (keeping
  follows and tweets off the person's account) is sound, but the deviation is worth a
  product-owner or team confirmation.
- `src/frontend/e2e/xc-8.spec.ts:14` — `PAGE_SIZE = 20` duplicates `TIMELINE_PAGE_SIZE` in
  `src/frontend/src/queries/tweets.ts:26`; the two can drift apart.
- `src/frontend/src/components/tweet-card.tsx:6` — Only the first of `mediaUrls` is shown. That
  meets "the image if there is one", but a tweet with several images silently loses the rest.
- `src/frontend/src/routes/_app/index.tsx:21` — The "Welcome, <name>!" heading is removed. The
  reviewer was not given the earlier specs, so could not confirm that none of them asserts on it.

Checked and clean: conventions (API call in `src/queries/` as `infiniteQueryOptions` with
`credentials: "include"`, relative `/api` path, `Button` primitive reused, no generated file
edited), safety (no secrets, debug leftovers or skipped tests) and NF4 (route stays under
`_app/`).

## Accessibility reviewer — CHANGES NEEDED

### Blocking

1. `src/frontend/e2e/xc-8.spec.ts:90` — The AC1 test only proves that tweets from accounts the
   viewer follows (plus the viewer's own) appear; the criterion says "tweets from all users". —
   Add an author the viewer does not follow and assert their tweet is shown. If the existing API
   cannot do that (NF5 forbids backend work), raise it with the product owner rather than leaving
   the test checking the easier thing.

### Non-blocking

- `src/frontend/src/components/tweet-card.tsx:20` — A screen reader hears only the short relative
  time ("5m"); `title` is not reliably announced. Consider an `aria-label` or visually hidden
  text carrying the full date.
- `src/frontend/src/components/tweet-card.tsx:36` — The alt text "Image posted by <name>" repeats
  the author already read in the header and says nothing about the picture. Acceptable since the
  API gives no description.
- `src/frontend/src/routes/_app/index.tsx:99` — Activating "Try again" unmounts the button, so
  keyboard focus drops to the page body (same for the button at line 70). Consider moving focus
  to the list or the loading message.
- `src/frontend/src/routes/_app/index.tsx:60` — The first "Loading tweets..." has `role="status"`
  but is already in the DOM on first render, so it may not be announced. Low impact.
- `src/frontend/src/routes/_app/index.tsx:82` — Newly loaded tweets are not announced, and the
  list has no `role="feed"` / `aria-busy`. The next-page loading message is announced, which is
  enough for this story.
- `src/frontend/e2e/xc-8.spec.ts:161` — AC2 scrolls only with the mouse wheel; a keyboard step
  (Page Down / End) would cover keyboard scrolling.

Nothing else blocking: no form fields or icon-only buttons added, both "Try again" controls are
real `Button`s, no outline removed, all colours are theme tokens, and loading and error messages
carry `role="status"` / `role="alert"`.

## Criteria → tests (merged)

| Criterion | Test | Result |
|---|---|---|
| AC1: The home timeline shows tweets from all users, newest first. | `AC1: the home timeline shows tweets from all users, newest first` | weak — ordering is well checked; "all users" is only checked for followed accounts |
| AC2: More tweets load automatically as I scroll, with no "next page" button. | `AC2: more tweets load automatically as I scroll, with no next page button` | ok |
| AC3: Each tweet shows the author's name and handle, when it was posted, the text, and the image if there is one. | `AC3: each tweet shows the author's name and handle, when it was posted, the text, and the image` | ok |
| AC4: If there are no tweets yet, I see a simple empty message. | `AC4: with no tweets yet I see a simple empty message` | weak — the message is checked, but the empty state comes from following nobody |
