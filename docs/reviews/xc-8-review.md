# Review: XC-8 · Story 2.1: Scroll the home timeline

- **Verdict:** APPROVE (round 4, both reviewers). Round 1 was CHANGES NEEDED, round 2 APPROVE, round 3 CHANGES NEEDED (code reviewer blocks); all four rounds are below.
- **Base commit reviewed:** `08ac95f`
- **Change set:** `git diff 08ac95f..HEAD` — one commit, `5e08314` "XC-8: Scroll the home timeline".
- **Reviewers:** two separate subagents, following
  `.claude/skills/review-pr/reviewers/code-reviewer.md` and
  `.claude/skills/review-pr/reviewers/accessibility.md`. Each was given only the story, the PRD's
  Non-Functional Requirements, `CLAUDE.md`, the diff and the commit messages.
- **Date:** 2026-11-18

## Round 1 · Code reviewer — CHANGES NEEDED

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

## Round 1 · Accessibility reviewer — CHANGES NEEDED

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

## Round 1 · Criteria → tests (merged)

| Criterion | Test | Result |
|---|---|---|
| AC1: The home timeline shows tweets from all users, newest first. | `AC1: the home timeline shows tweets from all users, newest first` | weak — ordering is well checked; "all users" is only checked for followed accounts |
| AC2: More tweets load automatically as I scroll, with no "next page" button. | `AC2: more tweets load automatically as I scroll, with no next page button` | ok |
| AC3: Each tweet shows the author's name and handle, when it was posted, the text, and the image if there is one. | `AC3: each tweet shows the author's name and handle, when it was posted, the text, and the image` | ok |
| AC4: If there are no tweets yet, I see a simple empty message. | `AC4: with no tweets yet I see a simple empty message` | weak — the message is checked, but the empty state comes from following nobody |

---

# Round 2 (2026-11-18, after the product owner's decision)

- **Verdict:** APPROVE (both reviewers)
- **Change set:** unchanged, `git diff 08ac95f..5e08314`. No code or test changed between rounds.
- **What changed:** the product owner (Mihai, PO) answered "2" on the ticket, choosing to read
  AC1 as "The home timeline shows my tweets and those of people I follow, newest first." Both
  reviewers were given that decision as part of the story. The story file still has the old
  wording; the product owner owns that text.

## Round 2 · Code reviewer — APPROVE

### Blocking

None.

### Non-blocking

- `src/frontend/e2e/xc-8.spec.ts:12` — The spec does not use the person's saved sign-in, which
  `CLAUDE.md` says the e2e tests run with. It signs up throwaway accounts on the shared API with
  generated passwords: about 10 accounts and 50+ tweets per run, doubled across the `verify` and
  `evidence` projects, and never removed. The reason given is sound (no follows or tweets land on
  the person's account, and the timeline is follow-based), but it is a deviation a person should
  accept knowingly, since this spec stays in the regression suite.
- `src/frontend/e2e/xc-8.spec.ts:66` — The test name still reads "tweets from all users", while
  the product owner's decision rewords AC1. The test body does check the reworded criterion.
  Rename the test once the product owner rewords the story text; same for the step caption at
  line 97.
- `src/frontend/src/components/tweet-card.tsx:6` — Only the first of `mediaUrls` is shown. This
  meets "the image if there is one".
- `src/frontend/src/routes/_app/index.tsx:17` — The "Welcome, <name>!" heading is removed;
  confirm the full regression suite is green. (It is: 8 of 8 passed on the current HEAD.)
- Commit `5e08314` — The message is the title only; it does not mention that AC1 was built to
  the product owner's reworded reading.

NF4, NF5 and the `CLAUDE.md` conventions hold. No secrets, debug leftovers, or skipped or
weakened tests.

## Round 2 · Accessibility reviewer — APPROVE

### Blocking

None.

### Non-blocking

- `src/frontend/src/components/tweet-card.tsx:20` — The full date and time is only in `title`;
  keyboard and touch users, and most screen readers, get just "5m". Consider an accessible name
  with the full date, or visually hidden text.
- `src/frontend/src/components/tweet-card.tsx:36` — Every image gets the same alt per author,
  which does not say what the picture shows. Acceptable while the API has no alt text.
- `src/frontend/src/components/tweet-card.tsx:11` — Name and handle are both `truncate`, so on a
  narrow screen a long name can cut the handle off. Consider letting the header wrap.
- `src/frontend/src/routes/_app/index.tsx:60` — The `role="status"` paragraph is mounted together
  with its text (same at line 89), which some screen readers do not announce.
- `src/frontend/src/routes/_app/index.tsx:77` — "No tweets yet." is not announced.
- `src/frontend/src/routes/_app/index.tsx:82` — Newly loaded tweets are appended silently.
- `src/frontend/e2e/xc-8.spec.ts:66` — The AC1 test name still says "from all users".

## Round 2 · Criteria → tests (merged)

| Criterion | Test | Result |
|---|---|---|
| AC1 (as decided by the PO): The home timeline shows my tweets and those of people I follow, newest first. | `AC1: the home timeline shows tweets from all users, newest first` | ok — name is stale |
| AC2: More tweets load automatically as I scroll, with no "next page" button. | `AC2: more tweets load automatically as I scroll, with no next page button` | ok |
| AC3: Each tweet shows the author's name and handle, when it was posted, the text, and the image if there is one. | `AC3: each tweet shows the author's name and handle, when it was posted, the text, and the image` | ok |
| AC4: If there are no tweets yet, I see a simple empty message. | `AC4: with no tweets yet I see a simple empty message` | ok |

---

# Round 3 (2026-11-18, after QA's send-back)

- **Verdict:** CHANGES NEEDED (code reviewer: CHANGES NEEDED; accessibility reviewer: APPROVE)
- **Change set:** `git diff 08ac95f..HEAD -- src/frontend`, commits `5e08314` and `81c9ad4`
  (test fixes only in `81c9ad4`).
- AC1 reviewed as the product owner decided it, as in round 2.

## Round 3 · Code reviewer — CHANGES NEEDED

### Blocking

1. `src/frontend/e2e/xc-8.spec.ts:12, 39-41` — The spec drops the saved sign-in and signs up
   throwaway accounts on the shared API with passwords it generates (9 accounts and about 50
   tweets per run, per project, never removed). `CLAUDE.md` says the e2e tests run "signed in as
   the person" and "never sign in or handle a password yourself"; neither commit message mentions
   the deviation. — Either run the tests on the saved sign-in, or get the person's explicit
   agreement to throwaway accounts recorded on the ticket (the follow-based timeline and the
   empty state in AC4 are a fair reason to ask). This is the only blocker; the application code
   itself is fine.

   Note: rounds 1 and 2 raised the same point as non-blocking.

### Non-blocking

- `src/frontend/e2e/xc-8.spec.ts:66` — The AC1 title still says "tweets from all users", and the
  caption at :98 says "Tweets from every user are there". Rename both once the story text is
  re-worded, so the QA video does not claim the old criterion.
- `src/frontend/e2e/xc-8.spec.ts:90-102` — AC1 has no author the viewer does not follow, so it
  would still pass against an all-users timeline. One unfollowed author asserted absent would pin
  the decided wording.
- `src/frontend/e2e/xc-8.spec.ts:118, 183, 265, 298` — `dispose(...)` is skipped when an
  assertion fails; put it in `try/finally` or a fixture.
- `src/frontend/e2e/xc-8.spec.ts:241` — `/^\d+[sm]$/` assumes `formatRelativeTime` never returns
  a word such as "now" for a just-posted tweet; the helper is outside the diff.
- `src/frontend/src/components/tweet-card.tsx:6` — Only the first of `mediaUrls` is shown.
- `src/frontend/src/queries/tweets.ts:26` and `src/frontend/e2e/xc-8.spec.ts:14` — The page size
  20 is declared twice.

Checked and clean: NF4, NF5, conventions (`src/queries/`, `credentials: "include"`, relative
`/api`, `Button` reused, no generated file), safety (no secrets, debug leftovers or skipped
tests; Sign out is never clicked).

## Round 3 · Accessibility reviewer — APPROVE

### Blocking

None.

### Non-blocking

- `src/frontend/src/routes/_app/index.tsx:60` (also :89) — The `role="status"` paragraphs are
  mounted together with their text, so many screen readers will not announce them. Keep one
  status region always mounted and change only its text.
- `src/frontend/src/routes/_app/index.tsx:77` — "No tweets yet." appears with no announcement.
- `src/frontend/src/routes/_app/index.tsx:82` — Tweets appended by infinite scroll are not
  announced.
- `src/frontend/src/components/tweet-card.tsx:20` — The time is read as "5m"; `title` is not
  reliably exposed. Give the `<time>` an accessible full date.
- `src/frontend/src/components/tweet-card.tsx:36` — The image alt text names the image but does
  not describe it. Acceptable while the API carries no alt text.
- `src/frontend/src/components/tweet-card.tsx:11` (also :14) — A truncated name or handle cannot
  be read in full. Consider letting it wrap on narrow screens.
- `src/frontend/e2e/xc-8.spec.ts:66` — The test title still says "tweets from all users".

## Round 3 · Criteria → tests (merged)

| Criterion | Test | Result |
|---|---|---|
| AC1 (as decided by the PO) | `AC1: the home timeline shows tweets from all users, newest first` | ok — title is stale |
| AC2 | `AC2: more tweets load automatically as I scroll, with no next page button` | ok |
| AC3 | `AC3: each tweet shows the author's name and handle, when it was posted, the text, and the image` | ok |
| AC4 | `AC4: with no tweets yet I see a simple empty message` | ok |

---

# Round 4 (2026-11-18, after the e2e spec was reworked to the saved sign-in)

- **Verdict:** APPROVE (both reviewers)
- **Base commit reviewed:** `08ac95f`
- **Change set:** `git diff 08ac95f..HEAD -- src/frontend`, commits `5e08314`, `81c9ad4`, `17e5740`.
  Only `src/frontend/e2e/xc-8.spec.ts` changed since round 3; the application code is the same.
- **What changed:** the round 3 blocker (throwaway accounts and generated passwords) is gone. The
  spec runs on the saved sign-in, writes nothing to the shared API, and serves `GET /api/timeline`
  from the test. A read-only `contract` test checks the real endpoint's shape. Both reviewers were
  told the PO's AC1 wording and the person's "Use my sign-in" decision.

## Round 4 · Code reviewer — APPROVE

### Blocking

None.

### Non-blocking

- `src/frontend/e2e/xc-8.spec.ts:85` — The AC1 title still says "tweets from all users" (old story
  wording); the title is what the QA video and ticket show. Rename once the PO rewords the story.
- `src/frontend/e2e/xc-8.spec.ts:263-282` — The `contract` test is the only link between the mock
  and the real API and is thin: it never follows `nextCursor`, its ordering check passes with an
  empty or one-item timeline, and it does not check the empty-page shape (`items: []`,
  `nextCursor: null`) or that each `mediaUrls` entry is a string.
- `src/frontend/e2e/xc-8.spec.ts:79-83` — `me()` reads `session.user.handle` without asserting it
  exists; a missing field gives "@undefined" and the test still passes.
- `src/frontend/e2e/xc-8.spec.ts:211, 231` — Exact "3m" and "12m" assume `formatRelativeTime`
  rounds down and the test finishes within about 30 seconds; could flake at evidence pace.
- `src/frontend/e2e/xc-8.spec.ts:263` — The `contract:` test has no `AC<n>:` name and gets an
  empty video in the `evidence` project; check the QA flow tolerates a non-AC test.
- Whole spec — AC1-AC4 timelines are served by the test, so the QA videos show Ada, Grace and Alan,
  not the person's real timeline. Whether the real endpoint returns only "me and people I follow"
  is not tested. Say so on the ticket.
- `src/frontend/src/routes/_app/index.tsx:1` — Replaces the "Welcome, {name}!" heading; the full
  `pnpm e2e` run (9 passed per the dev) covers that no earlier spec asserts it.
- NF2 — Layout looks fine for phones (`min-w-0`, truncation, `break-words`, `w-full` image); no
  test runs at a phone width (XC-14).

Checked and clean: saved sign-in, no accounts, passwords or writes to the API, `./fixtures` import,
`evidence.step` captions, `AC<n>:` names, Sign out never clicked, nothing skipped or weakened,
conventions (`src/queries/`, `credentials: "include"`, relative `/api`, `Button` reused, route
under `_app/`).

## Round 4 · Accessibility reviewer — APPROVE

### Blocking

None.

### Non-blocking

- `src/frontend/src/routes/_app/index.tsx:77` — "No tweets yet." replaces the `role="status"`
  loading paragraph without a live-region role; a screen reader may not announce it. Add
  `role="status"`.
- `src/frontend/src/components/tweet-card.tsx:20` — The time is read as "3m"; the full date is only
  in `title`. Add visually hidden text such as "3 minutes ago".
- `src/frontend/src/components/tweet-card.tsx:11` — Author name and handle are `truncate`d with no
  way to read them in full; matters only for long names.
- `src/frontend/e2e/xc-8.spec.ts:259` — AC4's "no alert, no loading" checks are scoped to
  `getByRole("main")`; if the layout has no `<main>` they pass without checking. Assert `content`
  is visible first.
- `src/frontend/e2e/xc-8.spec.ts:88` — `me()` never checks that `session.user.handle` exists.
- `src/frontend/e2e/xc-8.spec.ts:217` — The exact "3m" and "12m" assertions only hold within about a
  minute of `makeTweet`.

Checked and clean: no form fields, icon-only buttons or hover-only actions added; "Try again" is the
native `Button`; colours are theme tokens; `·` separator and sentinel are `aria-hidden`; the image
has alt text; errors use `role="alert"`, loading uses `role="status"`.

## Round 4 · Criteria → tests (merged)

| Criterion | Test | Result |
|---|---|---|
| AC1 (as decided by the PO) | `AC1: the home timeline shows tweets from all users, newest first` | ok — title is stale; the mock proves the app shows what the endpoint returns, in order |
| AC2 | `AC2: more tweets load automatically as I scroll, with no next page button` | ok |
| AC3 | `AC3: each tweet shows the author's name and handle, when it was posted, the text, and the image` | ok |
| AC4 | `AC4: with no tweets yet I see a simple empty message` | ok |
