# Review: XC-12 · Story 3.3: Reply to a tweet inline

- **Verdict:** APPROVE (both reviewers)
- **Base commit reviewed:** `b31c705`
- **Change set:** `git diff b31c705..049498e -- src/frontend`: worker commit `cf1c17c`, merged as
  `049498e`. Built by morch worker `t-20261118-cae0`, not by `/implement-story`.
- **Reviewers:** two separate subagents, following
  `.claude/skills/review-pr/reviewers/code-reviewer.md` and `accessibility.md`. Each was given only
  the story, the PRD's Non-Functional Requirements, `CLAUDE.md`, the diff and the commit messages.
- **Date:** 2026-11-18
- **Note:** the form reuses `validateTweetText` from `src/lib/compose.ts` (added by XC-9, not in this
  diff).

## Code reviewer - APPROVE

### Blocking

None.

### Non-blocking

- `src/frontend/e2e/xc-12.spec.ts:19-21` (header comment) and `:97` - The timeline, the replies GET and
  the POST are all served by `page.route`, and the spec says the shapes are not confirmed against the
  live endpoints. The request body `{ content, parentTweetId }` is asserted only against the same
  assumption in the unit tests and the e2e fake, so a wrong field name would pass everywhere. QA should
  post one real reply with their own account on the dev server to confirm the live API takes
  `parentTweetId`.
- `src/frontend/e2e/xc-12.spec.ts:328-334` (AC3 "some other way" step) - Ends with `toBeDisabled()` and
  "no alert" but never asserts `posts` is empty; the exact `toEqual` in the last step still catches an
  empty POST. An `expect(posts).toEqual([])` here would point at the right step on failure.
- `src/frontend/e2e/xc-12.spec.ts:218-307` (AC2) - "Directly under that tweet" is checked as "the
  region is inside this tweet's article"; the order (thread right after the action row) is checked only
  in `tweet-card.test.tsx`. The `^1[23]m$` and `^[78]m$` time checks allow about a minute of drift, so
  a very slow evidence run could flake.
- `src/frontend/src/components/reply-thread.test.tsx:236` - "allows exactly 280 characters and sends
  them" never sends anything; rename it or add the send.
- `src/frontend/src/components/tweet-card.test.tsx:118,132,143` - `vi.unstubAllGlobals()` runs at the end
  of each test, so a failing assertion leaks the `fetch` stub into the next test. Move it to
  `afterEach`.
- `src/frontend/src/queries/replies.ts:112-115` - `recordReply` cancels the whole timeline query, so a
  next-page fetch in flight at that moment is dropped. A rare edge case.
- `src/frontend/src/components/reply-thread.tsx:133` - A 404 on the replies GET hides the form (the
  "nobody to reply to" assumption). A design choice the story does not mention, covered by a unit test.
- `reply-thread.tsx` - Nothing touches @xbot: no call to `/xbot-reply` or `/__xbot/answer`. That fits
  CLAUDE.md (a separate feature), but a reply that mentions @xbot gets no answer from this change. The
  product owner may want to know.
- NF2 - The e2e runs at the default desktop width only; the layout uses `min-w-0`, `truncate` and
  `break-words`, so a phone width is likely fine, but nothing checks it.

Checked and clean: API calls in `queries/replies.ts` with `credentials: "include"` on the GET and the
POST; relative `/api/...` URLs; `Button` and `Textarea` reused; no generated files edited; no existing
test changed, skipped or weakened; no debug code or secrets; no new backend work (NF5); the views and
data calls are behind sign-in (NF4); replies stay single level (a reply has no buttons, and only the
tweet's own id is sent as the parent).

## Accessibility reviewer - APPROVE

### Blocking

None.

### Non-blocking

- `src/frontend/src/components/reply-thread.tsx:135-149` - The textarea has an accessible name
  (`aria-label="Reply to <author>"`) and `aria-invalid`, but the over-length alert (:144) and the
  post-error alert (:149) are not tied to it. Give each alert an `id` and set `aria-describedby` while
  it shows. The only visible hint is the placeholder, which disappears when typing.
- `reply-thread.tsx:154` (with :74) - "Post reply" is disabled while posting and stays disabled after
  success because the text is cleared, so a keyboard user is left on a disabled button and focus may
  drop to the page. After a successful post, move focus to the textarea.
- `reply-thread.tsx:99,105,120,124` - Live changes are only partly announced: the `role="status"`
  "Loading replies..." message is inserted already holding its text, "No replies yet." and "Replies
  aren't available for this tweet." have no role, and a posted reply and the rising count are silent.
  Consider a persistent polite `role="status"` region ("Reply posted"). Failures use `role="alert"`.
- `src/frontend/src/components/tweet-card.tsx:67` - The Reply button's count text uses `sky-600` on
  hover and while the thread is open: about 4.1:1 on white, under 4.5:1. Use `sky-700` or the token the
  like and retweet buttons use. Dark mode (`sky-400`) is fine. The open state is not colour alone
  (`aria-expanded` and the visible thread).
- `reply-thread.tsx:124` - Tailwind's reset removes list markers, and Safari with VoiceOver then drops
  the list semantics; add `role="list"` to the `<ul>`.

Checked and clean: the Reply control is a native button with an `aria-label` and an `aria-hidden` icon,
with `aria-expanded` and `aria-controls` only while open; the thread is a region named "Replies to
<author>" after the action row, so the Tab order runs Like, Retweet, Reply, textarea, Post reply, with
no trap; no focus outline removed; colours from theme tokens; reply images have alt text.

## Criteria → tests (merged)

| Criterion | Test | Result |
|---|---|---|
| AC1: I can write a reply to a tweet from the timeline. | `AC1: I can write a reply to a tweet from the timeline` | ok - opens the thread, posts text with surrounding spaces, asserts the trimmed body and `parentTweetId`, the reply listed last with its author, the form cleared, the count 2 to 3, neighbour untouched |
| AC2: Replies appear directly under that tweet in the timeline, without opening a separate page. | `AC2: replies appear directly under that tweet in the timeline, without opening a separate page` | ok - the replies GET is held to show the loading status; the existing replies (author, handle, time, text, image) and the new one sit inside the tweet's own article, oldest first; still 2 tweets, no buttons on a reply, same URL, no `framenavigated` |
| AC3: I cannot post an empty reply. | `AC3: I cannot post an empty reply` | ok - "Post reply" disabled for empty, whitespace, newline and tab text; `requestSubmit()` and Enter send nothing and no alert shows; the one real reply is the only request |
