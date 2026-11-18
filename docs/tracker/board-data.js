window.BOARD = {
  "project": {
    "key": "XC",
    "name": "X Clone"
  },
  "nextNumber": 15,
  "items": [
    {
      "key": "XC-1",
      "type": "Epic",
      "title": "Accounts and sign-in",
      "description": "Lets people create an account and sign in with an email and password, and keeps the rest of the app behind sign-in. Anyone who is not signed in only sees the sign-in and sign-up screens. This comes first because every other part of the app depends on a signed-in user.\n\nCovers: R1 sign-up, R2 sign-in, R3 sign-in gate, NF4 security of access\n\nSource: docs/epics/x-clone-v3-epics.md#epic-1-accounts-and-sign-in",
      "acceptanceCriteria": [],
      "parent": null,
      "status": "In Progress",
      "source": "docs/epics/x-clone-v3-epics.md#epic-1-accounts-and-sign-in",
      "created": "2026-11-12T10:00",
      "updated": "2026-11-18T11:17",
      "updates": 1
    },
    {
      "key": "XC-2",
      "type": "Epic",
      "title": "Home timeline and posting",
      "description": "Delivers the core read-and-write loop: a newest-first timeline that keeps loading as the user scrolls, with each tweet showing author, time, text and optional image. Users can also post a short tweet with one optional image and see it at the top straight away.\n\nCovers: R4 timeline, R5 infinite scroll, R6 tweet display, R7 posting with optional image, R8 new tweet appears at top\n\nSource: docs/epics/x-clone-v3-epics.md#epic-2-home-timeline-and-posting",
      "acceptanceCriteria": [],
      "parent": null,
      "status": "In Progress",
      "source": "docs/epics/x-clone-v3-epics.md#epic-2-home-timeline-and-posting",
      "created": "2026-11-12T10:00",
      "updated": "2026-11-18T12:17",
      "updates": 1
    },
    {
      "key": "XC-3",
      "type": "Epic",
      "title": "Likes, retweets and replies",
      "description": "Lets users react to other people's tweets with one-tap like and retweet (and one-tap undo), with counts that update immediately, and reply to a tweet with replies shown right under it in the timeline. Together these make up the \"react to others\" part of the core loop.\n\nCovers: R9 like, R10 retweet, R11 instant counts, R12 inline replies, NF1 responsiveness\n\nSource: docs/epics/x-clone-v3-epics.md#epic-3-likes-retweets-and-replies",
      "acceptanceCriteria": [],
      "parent": null,
      "status": "New",
      "source": "docs/epics/x-clone-v3-epics.md#epic-3-likes-retweets-and-replies",
      "created": "2026-11-12T10:00",
      "updated": "2026-11-12T10:00",
      "updates": 0
    },
    {
      "key": "XC-4",
      "type": "Epic",
      "title": "Theming and device support",
      "description": "Makes the app look polished in both light and dark mode and work well on desktop and mobile browsers. It cuts across the other epics, so it is kept separate to make sure it gets its own attention.\n\nCovers: R13 light and dark mode, R14 desktop and mobile browsers, NF2 browser support, NF3 visual quality\n\nSource: docs/epics/x-clone-v3-epics.md#epic-4-theming-and-device-support",
      "acceptanceCriteria": [],
      "parent": null,
      "status": "New",
      "source": "docs/epics/x-clone-v3-epics.md#epic-4-theming-and-device-support",
      "created": "2026-11-12T10:00",
      "updated": "2026-11-12T10:00",
      "updates": 0
    },
    {
      "key": "XC-5",
      "type": "Story",
      "title": "Sign up",
      "description": "As a new visitor, I want to sign up with my email and a password, so that I can start using the app.\n\nSource: docs/stories/x-clone-v3-epic-1-stories.md#story-11-sign-up",
      "acceptanceCriteria": [
        "I can create an account by entering an email and a password.",
        "After signing up, I am signed in and taken into the app.",
        "If the email is already used or the details are invalid, I see a clear message and no account is created."
      ],
      "parent": "XC-1",
      "status": "Done",
      "source": "docs/stories/x-clone-v3-epic-1-stories.md#story-11-sign-up",
      "created": "2026-11-12T10:00",
      "updated": "2026-11-18T12:05",
      "updates": 13,
      "comments": [
        {
          "author": "Claude",
          "role": "AI Dev",
          "created": "2026-11-18T11:17",
          "body": "Started from a97f23f."
        },
        {
          "author": "Claude",
          "role": "AI Dev",
          "created": "2026-11-18T11:19",
          "body": "Ready for review. Commit 08ac95f (base a97f23f).\n\nFiles changed\n- src/frontend/e2e/xc-5.spec.ts (new): one test per acceptance criterion.\n- No application code changed. The sign-up page (src/frontend/src/routes/_auth/sign-up.tsx) already met all three criteria; this story adds the proof.\n\nChecks (run from src/frontend)\n- pnpm exec tsc -b: pass\n- pnpm lint: pass\n- pnpm e2e e2e/xc-5.spec.ts: 3 passed (AC1, AC2, AC3)\n- pnpm e2e (whole suite, with smoke.spec.ts): 4 passed\n- pnpm test: 2 passed\n\nFor the reviewer\n- The tests run signed out (empty storageState for the file), because /sign-up redirects a signed-in user. They never use the saved sign-in and never click Sign out.\n- Every run creates 3 throwaway accounts on the shared API (xc5-e2e-<uuid>@example.com, random password). The API has no way to delete an account, so they stay.\n- \"No account is created\" is proven two ways: invalid details send no sign-up request at all, and signing in with the rejected email and password returns 401. For a used email, the new password does not sign in and the original one still does.\n- One test fix during the run: the first version reused one API client for the sign-in checks and got 403 instead of 401, because better-auth refuses cookie-carrying requests without an Origin header. The check now uses a fresh cookie-less client each time. The assertion (401) was not loosened.\n- Decision: the Name field stays optional and the tests leave it empty, since the story asks only for an email and a password.\n- Decision: password rules are \"Not known yet\" in the PRD (NF4); the tests assert the existing 8-character minimum as the invalid-details case.\n- Committed on main, not pushed. docs/tracker/board-data.js is left uncommitted (the board server writes it)."
        },
        {
          "author": "Claude",
          "role": "AI Review",
          "created": "2026-11-18T11:49",
          "body": "Review verdict: APPROVE. No blocking findings. Base reviewed: a97f23f (one commit, 08ac95f). Full review: docs/reviews/xc-5-review.md\n\nCriteria → tests: AC1 ok, AC2 ok, AC3 ok.\n\nNon-blocking\n- src/frontend/e2e/xc-5.spec.ts:1: the change set is the spec only; the sign-up screen predates the base, so the app code, NF2-NF4 and the code conventions could not be reviewed from the diff. Confirm the existing screen counts as this story.\n- src/frontend/e2e/xc-5.spec.ts:62: no test runs the form at phone width (NF2).\n- src/frontend/e2e/xc-5.spec.ts:137: the direct API sign-up sends a name while the form test leaves it empty, so the app derives a name outside the diff; not checked.\n- src/frontend/e2e/xc-5.spec.ts:16: each run leaves three throwaway accounts on the shared API."
        },
        {
          "author": "Claude",
          "role": "AI QA",
          "created": "2026-11-18T11:57",
          "body": "AC1 - I can create an account by entering an email and a password: pass",
          "attachments": [
            {
              "type": "video",
              "path": "docs/qa/XC-5/ac1.webm",
              "label": "AC1",
              "ac": 1,
              "result": "pass"
            }
          ]
        },
        {
          "author": "Claude",
          "role": "AI QA",
          "created": "2026-11-18T11:57",
          "body": "AC2 - After signing up, I am signed in and taken into the app: pass",
          "attachments": [
            {
              "type": "video",
              "path": "docs/qa/XC-5/ac2.webm",
              "label": "AC2",
              "ac": 2,
              "result": "pass"
            }
          ]
        },
        {
          "author": "Claude",
          "role": "AI QA",
          "created": "2026-11-18T11:57",
          "body": "AC3 - If the email is already used or the details are invalid, I see a clear message and no account is created: pass",
          "attachments": [
            {
              "type": "video",
              "path": "docs/qa/XC-5/ac3.webm",
              "label": "AC3",
              "ac": 3,
              "result": "pass"
            }
          ]
        },
        {
          "author": "Claude",
          "role": "AI QA",
          "created": "2026-11-18T11:57",
          "body": "QA evidence: 3 of 3 criteria passed, each with a video attached above.\n\n- AC1 - I can create an account by entering an email and a password: pass\n- AC2 - After signing up, I am signed in and taken into the app: pass\n- AC3 - If the email is already used or the details are invalid, I see a clear message and no account is created: pass\n\nRe-run the evidence from src/frontend: pnpm e2e:evidence e2e/xc-5.spec.ts"
        },
        {
          "author": "Mihai",
          "role": "PO",
          "created": "2026-11-18T12:05",
          "body": "PO Mihai: In Acceptance → Done"
        },
        {
          "author": "Mihai",
          "role": "PO",
          "created": "2026-11-18T12:05",
          "body": "LGTM"
        }
      ]
    },
    {
      "key": "XC-6",
      "type": "Story",
      "title": "Sign in",
      "description": "As a returning user, I want to sign in with my email and password, so that I can get back to my timeline.\n\nSource: docs/stories/x-clone-v3-epic-1-stories.md#story-12-sign-in",
      "acceptanceCriteria": [
        "I can sign in by entering my email and password.",
        "After signing in, I am taken to the home timeline.",
        "If my email or password is wrong, I see a clear message and stay signed out."
      ],
      "parent": "XC-1",
      "status": "New",
      "source": "docs/stories/x-clone-v3-epic-1-stories.md#story-12-sign-in",
      "created": "2026-11-12T10:00",
      "updated": "2026-11-12T10:00",
      "updates": 0
    },
    {
      "key": "XC-7",
      "type": "Story",
      "title": "Keep the app behind sign-in",
      "description": "As a visitor who is not signed in, I want to only see the sign-in and sign-up screens, so that the rest of the app stays private to signed-in users.\n\nSource: docs/stories/x-clone-v3-epic-1-stories.md#story-13-keep-the-app-behind-sign-in",
      "acceptanceCriteria": [
        "When I am not signed in, I can only see the sign-in and sign-up screens.",
        "If I open any other page while signed out, I am sent to the sign-in screen."
      ],
      "parent": "XC-1",
      "status": "New",
      "source": "docs/stories/x-clone-v3-epic-1-stories.md#story-13-keep-the-app-behind-sign-in",
      "created": "2026-11-12T10:00",
      "updated": "2026-11-12T10:00",
      "updates": 0
    },
    {
      "key": "XC-8",
      "type": "Story",
      "title": "Scroll the home timeline",
      "description": "As a signed-in user, I want to scroll a timeline of the newest tweets from everyone, so that I can see what people are posting.\n\nSource: docs/stories/x-clone-v3-epic-2-stories.md#story-21-scroll-the-home-timeline",
      "acceptanceCriteria": [
        "The home timeline shows tweets from all users, newest first.",
        "More tweets load automatically as I scroll, with no \"next page\" button.",
        "Each tweet shows the author's name and handle, when it was posted, the text, and the image if there is one.",
        "If there are no tweets yet, I see a simple empty message."
      ],
      "parent": "XC-2",
      "status": "In Progress",
      "source": "docs/stories/x-clone-v3-epic-2-stories.md#story-21-scroll-the-home-timeline",
      "created": "2026-11-12T10:00",
      "updated": "2026-11-18T12:24",
      "updates": 7,
      "comments": [
        {
          "author": "Claude",
          "role": "AI Dev",
          "created": "2026-11-18T12:12",
          "body": "Blocked before starting: nothing built, ticket left in New. Question for the product owner.\n\nAC1 asks for \"tweets from all users, newest first\" (R4), and the PRD puts following out of scope (\"everyone sees the same timeline\"). The existing API has no endpoint that can deliver that with infinite scroll (AC2):\n\n- GET /api/timeline?limit&cursor is the only paginated feed. Its spec says \"the caller's own top-level tweets plus their followees'\", and it behaves that way: for an account that follows nobody and has not posted it returns {\"items\":[],\"nextCursor\":null}, while other accounts' tweets exist.\n- GET /api/search/tweets does read across all authors, but it needs a non-empty q, is capped at 50 and has no cursor, so it cannot back an all-users feed or infinite scroll.\n- There is no other tweet list across users. NF5 rules out new backend work.\n\nChecked on 2026-11-18 against /api/openapi.json and the live API through the dev server, from commit 08ac95f.\n\nTo unblock, one of:\n1. The API gains an all-users timeline (or /api/timeline changes to return everyone).\n2. The story is reworded to \"my tweets and those of people I follow\", which /api/timeline already serves. Following would then need a story too, since without it the timeline only shows my own tweets.\n\nAC2, AC3 and AC4 are buildable on /api/timeline as it is (cursor paging; author name and handle, createdAt, content and mediaUrls are all in the response)."
        },
        {
          "author": "Claude",
          "role": "AI Dev",
          "created": "2026-11-18T12:17",
          "body": "Started from 08ac95f."
        },
        {
          "author": "Claude",
          "role": "AI Dev",
          "created": "2026-11-18T12:22",
          "body": "Ready for review. Commit 5e08314 (base 08ac95f). Unattended run (/implement).\n\nFiles changed\n- src/frontend/e2e/xc-8.spec.ts (new): one test per acceptance criterion.\n- src/frontend/src/queries/tweets.ts (new): Tweet and TimelinePage types, timelineQueryOptions (GET /api/timeline, 20 per page, cursor paging, credentials: \"include\").\n- src/frontend/src/components/tweet-card.tsx (new) and tweet-card.test.tsx (new): one tweet as an <article>: name, handle, <time>, text, image.\n- src/frontend/src/routes/_app/index.tsx: the home page is now the timeline, with loading, error, empty (\"No tweets yet.\") and scroll-to-load states.\n- src/frontend/src/lib/user.ts: formatHandle (exactly one \"@\").\n\nChecks (factory loop, from src/frontend)\n- Round 1: tsc pass, lint fail, vitest related pass, e2e xc-8 pass.\n- Round 2: tsc pass, lint pass, vitest related pass (5), e2e xc-8 pass (4), pnpm test pass (7), pnpm e2e pass (8: smoke, XC-5, XC-8).\n- pnpm build: pass.\n- No test was changed to get green. The round 1 lint error (react-refresh/only-export-components) was fixed by moving formatHandle from the component file to lib/user.ts.\n\nDecisions made without asking\n1. AC1 \"tweets from all users\" is NOT fully met, and cannot be on the current API. See the earlier blocker comment: GET /api/timeline returns the caller's own tweets plus their followees', and no endpoint lists everyone's tweets with paging. The person had no preference between stopping and building, so the timeline is built on /api/timeline. What the app shows is \"my tweets and those of accounts I follow\". For an account that follows nobody, that is only its own tweets. This still needs the product owner's answer.\n2. The AC1 test proves what the endpoint can do: tweets from four different users (three followed authors and the viewer), newest first. It does not prove that tweets of users the viewer does not follow appear, because they do not.\n3. The tests use throwaway accounts only (a viewer plus authors per test, xc8-e2e-<uuid>@example.com) and sign the browser in as the viewer by cookie. Nothing touches the person's own account: no follows, no tweets. Each run leaves 9 accounts and about 55 tweets on the shared API; the API cannot delete them.\n4. Infinite scroll uses an IntersectionObserver on a marker under the last tweet (200px margin), 20 tweets per page.\n5. One image per tweet is shown (the first of mediaUrls), as the PRD says \"the image if there is one\" and R7 allows one image.\n6. \"When it was posted\" is shown as a relative time (the existing lib/format-relative-time.ts), with the full date in the title and the ISO time in datetime.\n7. A failed load shows a message with a \"Try again\" button. That is an error retry, not a \"next page\" button; it never shows in normal use.\n\nFor the reviewer\n- AC2 asserts 20 tweets first, then 40, then 45 after two scrolls, counts the cursor requests (0, 1, 2), and checks no next/more/load/older button or link exists and nothing loads twice.\n- AC4 uses a brand-new account, whose timeline the API confirms is empty.\n- Like, retweet and reply counts are in the Tweet type but not shown: they belong to XC-10 to XC-12.\n- Not covered: phone width (XC-14) and the error states (no test forces an API failure)."
        },
        {
          "author": "Claude",
          "role": "QA",
          "created": "2026-11-18T12:23",
          "body": "Review verdict: CHANGES NEEDED (code reviewer and accessibility reviewer both). Base reviewed: 08ac95f (commit 5e08314). Full review: docs/reviews/xc-8-review.md\n\nBlocking\n1. src/frontend/src/queries/tweets.ts:32: AC1 asks for tweets \"from all users\", but the home page reads /api/timeline, which holds only the viewer's tweets and those of accounts they follow. A user who follows nobody sees \"No tweets yet.\" while others have posted. Read from an existing endpoint that returns everyone's tweets; if the API has none, NF5 forbids new backend work, so raise it with the product owner rather than narrowing the criterion.\n2. src/frontend/e2e/xc-8.spec.ts:90: the AC1 test makes the viewer follow every author first, so it proves \"tweets from people I follow\", not \"from all users\". Include at least one author the viewer does not follow and expect that tweet to show. (Raised by both reviewers.)\n3. src/frontend/e2e/xc-8.spec.ts:272: the AC4 test reaches the empty state through \"follows nobody\" on an API that has tweets, not through \"there are no tweets yet\". Once the timeline shows all users, set up a truly empty result (for example, stub the timeline response) and keep the same assertions.\n\nCriteria → tests: AC1 weak, AC2 ok, AC3 ok, AC4 weak.\n\nNon-blocking (code)\n- e2e/xc-8.spec.ts:12: the spec uses throwaway accounts, not the saved sign-in, and leaves 9 accounts and about 50 tweets per run; confirm the deviation.\n- e2e/xc-8.spec.ts:14: PAGE_SIZE duplicates TIMELINE_PAGE_SIZE in queries/tweets.ts:26.\n- components/tweet-card.tsx:6: only the first of mediaUrls is shown.\n- routes/_app/index.tsx:21: the \"Welcome, <name>!\" heading is removed; check no earlier spec asserts on it.\n\nNon-blocking (accessibility)\n- components/tweet-card.tsx:20: a screen reader hears only \"5m\"; add an aria-label or hidden text with the full date.\n- components/tweet-card.tsx:36: the image alt text repeats the author and does not describe the picture.\n- routes/_app/index.tsx:99 and :70: \"Try again\" unmounts itself, so keyboard focus drops to the body.\n- routes/_app/index.tsx:60: the first loading message may not be announced.\n- routes/_app/index.tsx:82: newly loaded tweets are not announced; no role=\"feed\" / aria-busy.\n- e2e/xc-8.spec.ts:161: AC2 scrolls with the mouse only; add a keyboard step."
        },
        {
          "author": "Claude",
          "role": "AI Dev",
          "created": "2026-11-18T12:24",
          "body": "Stopped (send-back cycle 1). Needs a person: the product owner's answer on the timeline endpoint.\n\nAll three blocking findings come down to one thing the frontend cannot change: the API has no paginated endpoint that returns tweets from all users (see the first comment on this ticket: /api/timeline is own plus followed accounts, /api/search/tweets needs a search term, is capped at 50 and has no cursor). NF5 rules out backend work, and the factory loop says to stop rather than work around a missing endpoint.\n\n- Blocking 1 (queries/tweets.ts:32): no endpoint to switch to.\n- Blocking 2 (xc-8.spec.ts:90): adding an unfollowed author to the AC1 test is the right test, but it would fail against the current API; it should be added together with the endpoint change.\n- Blocking 3 (xc-8.spec.ts:272): depends on the same change.\n\nState of the code: commit 5e08314 stays as it is (green on every check: tsc, lint, vitest 7, e2e 8). It shows \"my tweets and those of accounts I follow\", newest first, with infinite scroll, tweet details and the empty message. Nothing further was changed or committed after the review, including the non-blocking findings.\n\nTo unblock, one of:\n1. The API gains an all-users timeline, or /api/timeline returns everyone. Then: point queries/tweets.ts at it, add an unfollowed author to AC1, and give AC4 a truly empty result.\n2. The product owner rewords AC1 to \"my tweets and those of people I follow\". Then the current build meets it, and the review can run again."
        }
      ]
    },
    {
      "key": "XC-9",
      "type": "Story",
      "title": "Post a tweet",
      "description": "As a signed-in user, I want to write a short tweet and optionally attach one image, so that I can share what I'm up to.\n\nSource: docs/stories/x-clone-v3-epic-2-stories.md#story-22-post-a-tweet",
      "acceptanceCriteria": [
        "I can type a tweet and post it, with or without one image.",
        "My new tweet appears at the top of my timeline straight away.",
        "I cannot post an empty tweet.",
        "If the tweet is too long or the image is not allowed, I see a clear message (the length and image limits are Not known yet)."
      ],
      "parent": "XC-2",
      "status": "New",
      "source": "docs/stories/x-clone-v3-epic-2-stories.md#story-22-post-a-tweet",
      "created": "2026-11-12T10:00",
      "updated": "2026-11-12T10:00",
      "updates": 0
    },
    {
      "key": "XC-10",
      "type": "Story",
      "title": "Like and unlike a tweet",
      "description": "As a signed-in user, I want to like a tweet with one tap and undo it with one tap, so that I can react quickly.\n\nSource: docs/stories/x-clone-v3-epic-3-stories.md#story-31-like-and-unlike-a-tweet",
      "acceptanceCriteria": [
        "Tapping like once likes the tweet; tapping again removes my like.",
        "The like count and the button state update immediately, even on a slow connection.",
        "If saving my like fails, the count goes back to what it was and I see a message."
      ],
      "parent": "XC-3",
      "status": "New",
      "source": "docs/stories/x-clone-v3-epic-3-stories.md#story-31-like-and-unlike-a-tweet",
      "created": "2026-11-12T10:00",
      "updated": "2026-11-12T10:00",
      "updates": 0
    },
    {
      "key": "XC-11",
      "type": "Story",
      "title": "Retweet and undo a retweet",
      "description": "As a signed-in user, I want to retweet a tweet with one tap and undo it with one tap, so that I can share it with others.\n\nSource: docs/stories/x-clone-v3-epic-3-stories.md#story-32-retweet-and-undo-a-retweet",
      "acceptanceCriteria": [
        "Tapping retweet once retweets the tweet; tapping again undoes it.",
        "The retweet count and the button state update immediately, even on a slow connection.",
        "If saving my retweet fails, the count goes back to what it was and I see a message."
      ],
      "parent": "XC-3",
      "status": "New",
      "source": "docs/stories/x-clone-v3-epic-3-stories.md#story-32-retweet-and-undo-a-retweet",
      "created": "2026-11-12T10:00",
      "updated": "2026-11-12T10:00",
      "updates": 0
    },
    {
      "key": "XC-12",
      "type": "Story",
      "title": "Reply to a tweet inline",
      "description": "As a signed-in user, I want to reply to a tweet and see replies right under it, so that I can join the conversation without leaving the timeline.\n\nSource: docs/stories/x-clone-v3-epic-3-stories.md#story-33-reply-to-a-tweet-inline",
      "acceptanceCriteria": [
        "I can write a reply to a tweet from the timeline.",
        "Replies appear directly under that tweet in the timeline, without opening a separate page.",
        "I cannot post an empty reply."
      ],
      "parent": "XC-3",
      "status": "New",
      "source": "docs/stories/x-clone-v3-epic-3-stories.md#story-33-reply-to-a-tweet-inline",
      "created": "2026-11-12T10:00",
      "updated": "2026-11-12T10:00",
      "updates": 0
    },
    {
      "key": "XC-13",
      "type": "Story",
      "title": "Switch between light and dark mode",
      "description": "As a user, I want to use the app in light or dark mode, so that it is comfortable to read in any setting.\n\nSource: docs/stories/x-clone-v3-epic-4-stories.md#story-41-switch-between-light-and-dark-mode",
      "acceptanceCriteria": [
        "I can choose between light mode and dark mode.",
        "Every screen looks polished in both modes, with text and images easy to read.",
        "The app remembers my choice the next time I open it."
      ],
      "parent": "XC-4",
      "status": "New",
      "source": "docs/stories/x-clone-v3-epic-4-stories.md#story-41-switch-between-light-and-dark-mode",
      "created": "2026-11-12T10:00",
      "updated": "2026-11-12T10:00",
      "updates": 0
    },
    {
      "key": "XC-14",
      "type": "Story",
      "title": "Use the app on desktop and mobile browsers",
      "description": "As a user, I want the app to work on both my laptop and my phone's browser, so that I can use it wherever I am.\n\nSource: docs/stories/x-clone-v3-epic-4-stories.md#story-42-use-the-app-on-desktop-and-mobile-browsers",
      "acceptanceCriteria": [
        "All the app's screens and actions work in desktop and mobile browsers.",
        "On a phone-sized screen, nothing is cut off and I can use it without zooming."
      ],
      "parent": "XC-4",
      "status": "New",
      "source": "docs/stories/x-clone-v3-epic-4-stories.md#story-42-use-the-app-on-desktop-and-mobile-browsers",
      "created": "2026-11-12T10:00",
      "updated": "2026-11-12T10:00",
      "updates": 0
    }
  ]
};
