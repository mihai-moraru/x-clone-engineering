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
      "status": "Done",
      "source": "docs/epics/x-clone-v3-epics.md#epic-1-accounts-and-sign-in",
      "created": "2026-11-12T10:00",
      "updated": "2026-11-18T13:05",
      "updates": 3
    },
    {
      "key": "XC-2",
      "type": "Epic",
      "title": "Home timeline and posting",
      "description": "Delivers the core read-and-write loop: a newest-first timeline that keeps loading as the user scrolls, with each tweet showing author, time, text and optional image. Users can also post a short tweet with one optional image and see it at the top straight away.\n\nCovers: R4 timeline, R5 infinite scroll, R6 tweet display, R7 posting with optional image, R8 new tweet appears at top\n\nSource: docs/epics/x-clone-v3-epics.md#epic-2-home-timeline-and-posting",
      "acceptanceCriteria": [],
      "parent": null,
      "status": "Done",
      "source": "docs/epics/x-clone-v3-epics.md#epic-2-home-timeline-and-posting",
      "created": "2026-11-12T10:00",
      "updated": "2026-11-18T14:54",
      "updates": 3
    },
    {
      "key": "XC-3",
      "type": "Epic",
      "title": "Likes, retweets and replies",
      "description": "Lets users react to other people's tweets with one-tap like and retweet (and one-tap undo), with counts that update immediately, and reply to a tweet with replies shown right under it in the timeline. Together these make up the \"react to others\" part of the core loop.\n\nCovers: R9 like, R10 retweet, R11 instant counts, R12 inline replies, NF1 responsiveness\n\nSource: docs/epics/x-clone-v3-epics.md#epic-3-likes-retweets-and-replies",
      "acceptanceCriteria": [],
      "parent": null,
      "status": "Done",
      "source": "docs/epics/x-clone-v3-epics.md#epic-3-likes-retweets-and-replies",
      "created": "2026-11-12T10:00",
      "updated": "2026-11-18T14:54",
      "updates": 3
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
      "status": "Done",
      "source": "docs/stories/x-clone-v3-epic-1-stories.md#story-12-sign-in",
      "created": "2026-11-12T10:00",
      "updated": "2026-11-18T12:59",
      "updates": 12,
      "comments": [
        {
          "author": "Claude",
          "role": "AI Dev",
          "created": "2026-11-18T12:51",
          "body": "Started from 17e5740."
        },
        {
          "author": "Claude",
          "role": "AI Dev",
          "created": "2026-11-18T12:55",
          "body": "Ready for review. Commit 844c6af (base 17e5740). Unattended run (/implement).\n\nFiles changed\n- src/frontend/e2e/xc-6.spec.ts (new): one test per acceptance criterion.\n- No application code changed. The sign-in page (src/frontend/src/routes/_auth/sign-in.tsx, with hooks/use-auth-submit.ts and lib/auth-errors.ts) already met all three criteria; this story adds the proof, as XC-5 did for sign-up.\n\nChecks (factory loop, from src/frontend), 1 round\n- Round 1: tsc pass, lint pass, pnpm e2e e2e/xc-6.spec.ts pass (3).\n- Regression: pnpm test pass (7), pnpm e2e pass (12: smoke, XC-5, XC-6, XC-8), pnpm build pass.\n- vitest related was not run: no source file changed.\n- No test was weakened, skipped or deleted.\n\nDecisions made without asking\n1. The tests do NOT use the saved sign-in. Signing in is only possible signed out, and what AC1-AC3 prove is the sign-in itself, so each test starts with an empty storage state (same as XC-5). Sign out is never clicked.\n2. They sign in as a throwaway account the spec creates through the API (xc6-e2e-<uuid>@example.com, random password), once per run and shared by the three tests. That is 1 account per run per project that stays on the shared API (it cannot be deleted); XC-5 does the same, with 3. The password is generated in the spec and never printed. Nothing touches the person's own account.\n3. AC2 \"taken to the home timeline\": checks the URL is / (not /sign-in), the \"Home\" heading shows, GET /api/timeline answers 200, the page shows tweets or \"No tweets yet.\" with no alert, and the page is still the timeline after a reload. It does not assert on tweet contents: that is XC-8.\n4. AC3 \"wrong email or password\": both a wrong password for a real account and an unknown email are tried. Each must get a 401 from the API, show exactly \"Incorrect email or password.\", stay on /sign-in, show no Sign out button, and leave the session null. The right credentials are then shown to still sign in, so the refusal was about the details.\n\nFor the reviewer\n- Everything under test was in the scaffold before the base commit, so the diff is the spec only; the app code, NF2-NF4 and the conventions cannot be judged from it. Confirm the existing sign-in page counts as this story.\n- The same email gets the same message for a wrong password and an unknown email, which avoids saying which accounts exist.\n- Not covered: empty or malformed fields (client-side validation messages; the criteria only name wrong details), phone width (XC-14)."
        },
        {
          "author": "Claude",
          "role": "AI Review",
          "created": "2026-11-18T12:56",
          "body": "Review verdict: APPROVE. Code reviewer and accessibility reviewer both approve, nothing blocking. Base reviewed: 17e5740 (one commit, 844c6af). Full review: docs/reviews/xc-6-review.md\n\nCriteria -> tests: AC1 ok, AC2 ok, AC3 ok.\n\nNon-blocking (code)\n- e2e/xc-6.spec.ts: the sign-in page, hooks and UI strings are not in the diff (the screen predates the base), so they could not be reviewed; a wrong string would fail loudly at run time.\n- e2e/xc-6.spec.ts:114, 158: the AC2 and AC3 test names reword the criterion; AC1 is verbatim.\n- e2e/xc-6.spec.ts:10, 19: the comment says \"one per run\" but the account is cached per worker and per project, so verify plus evidence create two. The xc6-e2e-<uuid> accounts stay on the shared API, as XC-5's do.\n- e2e/xc-6.spec.ts:164-201: AC3 makes three sign-in POSTs in a row; a per-IP rate limit would show as 429 (unverified, would fail loudly).\n- NF2 phone width is not exercised (XC-14).\n\nNon-blocking (accessibility)\n- The change adds no UI; the sign-in screen's error-to-field link, visible focus, contrast in both themes and password input type could not be checked from the diff. The spec shows both inputs have accessible names and the refusal is role=\"alert\".\n- e2e/xc-6.spec.ts:102: the form is only submitted with a click; one Enter-key submit would cover the keyboard."
        },
        {
          "author": "Claude",
          "role": "AI QA",
          "created": "2026-11-18T12:58",
          "body": "AC1 - I can sign in by entering my email and password: pass",
          "attachments": [
            {
              "type": "video",
              "path": "docs/qa/XC-6/ac1.webm",
              "label": "AC1",
              "ac": 1,
              "result": "pass"
            }
          ]
        },
        {
          "author": "Claude",
          "role": "AI QA",
          "created": "2026-11-18T12:58",
          "body": "AC2 - After signing in, I am taken to the home timeline: pass",
          "attachments": [
            {
              "type": "video",
              "path": "docs/qa/XC-6/ac2.webm",
              "label": "AC2",
              "ac": 2,
              "result": "pass"
            }
          ]
        },
        {
          "author": "Claude",
          "role": "AI QA",
          "created": "2026-11-18T12:58",
          "body": "AC3 - If my email or password is wrong, I see a clear message and stay signed out: pass",
          "attachments": [
            {
              "type": "video",
              "path": "docs/qa/XC-6/ac3.webm",
              "label": "AC3",
              "ac": 3,
              "result": "pass"
            }
          ]
        },
        {
          "author": "Claude",
          "role": "AI QA",
          "created": "2026-11-18T12:58",
          "body": "QA summary (evidence run on commit 844c6af, pnpm e2e:evidence e2e/xc-6.spec.ts, run once: 3 of 3 passed)\n\n- AC1 - I can sign in by entering my email and password: pass\n- AC2 - After signing in, I am taken to the home timeline: pass\n- AC3 - If my email or password is wrong, I see a clear message and stay signed out: pass\n\nRead the videos with this in mind: signing in cannot use the saved sign-in, so the spec signs in as a throwaway account it creates through the API (xc6-e2e-<uuid>@example.com, random password). It never touches your own account and never clicks Sign out. The evidence run created one such account, which stays on the shared API (it cannot be deleted).\n\nRe-run the evidence: pnpm e2e:evidence e2e/xc-6.spec.ts"
        },
        {
          "author": "Mihai",
          "role": "PO",
          "created": "2026-11-18T12:59",
          "body": "PO Mihai: In Acceptance → Done"
        }
      ]
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
      "status": "Done",
      "source": "docs/stories/x-clone-v3-epic-1-stories.md#story-13-keep-the-app-behind-sign-in",
      "created": "2026-11-12T10:00",
      "updated": "2026-11-18T13:05",
      "updates": 11,
      "comments": [
        {
          "author": "Claude",
          "role": "AI Dev",
          "created": "2026-11-18T12:59",
          "body": "Started from 844c6af."
        },
        {
          "author": "Claude",
          "role": "AI Dev",
          "created": "2026-11-18T13:02",
          "body": "Ready for review. Commit 159502f (base 844c6af). Unattended run (/implement).\n\nFiles changed\n- src/frontend/e2e/xc-7.spec.ts (new): one test per acceptance criterion, plus one extra regression test (not a criterion).\n- src/frontend/src/routes/__root.tsx: a notFoundComponent for the root route.\n\nWhat was already there: the guards. /_app redirects a signed-out visitor to /sign-in, and /_auth redirects a signed-in one to /. AC1 and AC2 passed for every real page without code changes.\n\nWhat was missing, found by the AC2 test (round 1 failed): an address that matches no page at all (e.g. /profile/someone) never reaches those guards, so a signed-out visitor saw a bare \"Not Found\" instead of the sign-in screen. The root route now has a notFoundComponent: signed out, it sends the visitor to /sign-in (replace); signed in, it still shows \"Not Found\". It waits for the session check before deciding and shows nothing meanwhile.\n\nChecks (factory loop, from src/frontend), 2 rounds\n- Round 1: tsc pass, lint pass, e2e xc-7 FAIL (AC2 on /profile/someone: stayed on \"Not Found\"). Fixed the code, not the test.\n- Round 2: tsc pass, lint pass, e2e xc-7 pass (2).\n- Regression: pnpm test pass (7), pnpm e2e pass (15: smoke, XC-5, XC-6, XC-7 x3, XC-8 x5), pnpm build pass. vitest related not run: the one changed source file has no unit test.\n- No test was weakened, skipped or deleted.\n\nDecisions made without asking\n1. Both tests run signed out (empty storage state, as XC-5 and XC-6). Nothing signs in, signs up or writes to the shared API, so no accounts are created. Sign out is never clicked.\n2. AC1 \"I can only see the sign-in and sign-up screens\": signed out, it shows both screens and the links between them, checks that none of the app (Sign out button, Home heading, tweets, empty message) appears on either, and that the page sent no data request to the API (nothing beyond /api/auth/*), so no private data is asked for.\n3. AC2 \"any other page\": tries /, /?tab=latest, /profile/someone, /tweets/123 and /settings (the last three match no page today, so they are the not-found case), then reloads on / after a client-side address change. Each must end on /sign-in with the sign-in heading, no app content, and no data requests. \"Any other page\" includes pages that do not exist yet, which is why the not-found fix was needed.\n4. The extra test \"regression: a signed-in person who opens an unknown address still sees Not Found\" uses the saved sign-in and never signs out. It guards the other side of the fix: signed in, an unknown address must not be sent to /sign-in. It is not an AC test, so QA's evidence run will record a video for it that maps to no criterion.\n5. A signed-out visitor to an unknown address is sent to /sign-in with replace, so Back does not return to the dead address.\n\nFor the reviewer\n- __root.tsx is the only app change. It reuses sessionQueryOptions (the same query the guards use), so no new request is added.\n- NF4: the guards in _app/_auth are unchanged. There is still no server-side check in this repo; the API answers 401 to a signed-out caller (checked with GET /api/timeline), so private data is protected there, and the page guards only decide what the visitor sees.\n- Not covered: phone width (XC-14)."
        },
        {
          "author": "Claude",
          "role": "AI Review",
          "created": "2026-11-18T13:03",
          "body": "Review verdict: APPROVE. Code reviewer and accessibility reviewer both approve, nothing blocking. Base reviewed: 844c6af (one commit, 159502f). Full review: docs/reviews/xc-7-review.md\n\nCriteria -> tests: AC1 ok, AC2 ok.\n\nNon-blocking (code)\n- e2e/xc-7.spec.ts:124 and :88: /profile/someone stands for \"no page matches\" but will become a real route one day; use an address that can never be a route, such as /no-such-page.\n- e2e/xc-7.spec.ts:99-105: the \"Going back to the home page from inside the app\" step is pushState plus reload, i.e. a fresh load of /, already covered; rename or drop it, its caption misleads in the QA video.\n- routes/__root.tsx:37-40: if the session query errors, a signed-in person is sent to /sign-in; that fails closed, which suits NF4.\n- routes/__root.tsx:5-10: useQuery and the QueryClient type import are on separate lines from the same package (cosmetic).\n\nNon-blocking (accessibility)\n- routes/__root.tsx:39: a blank page, with nothing announced, while the session check runs; brief.\n- routes/__root.tsx:42: the signed-in \"Not Found\" is a bare paragraph with no heading or main landmark.\n\nNote for QA: the spec has one extra test that is not a criterion (\"signed in: regression: a signed-in person who opens an unknown address still sees Not Found\"); its video maps to no AC."
        },
        {
          "author": "Claude",
          "role": "AI QA",
          "created": "2026-11-18T13:05",
          "body": "AC1 - When I am not signed in, I can only see the sign-in and sign-up screens: pass",
          "attachments": [
            {
              "type": "video",
              "path": "docs/qa/XC-7/ac1.webm",
              "label": "AC1",
              "ac": 1,
              "result": "pass"
            }
          ]
        },
        {
          "author": "Claude",
          "role": "AI QA",
          "created": "2026-11-18T13:05",
          "body": "AC2 - If I open any other page while signed out, I am sent to the sign-in screen: pass",
          "attachments": [
            {
              "type": "video",
              "path": "docs/qa/XC-7/ac2.webm",
              "label": "AC2",
              "ac": 2,
              "result": "pass"
            }
          ]
        },
        {
          "author": "Claude",
          "role": "AI QA",
          "created": "2026-11-18T13:05",
          "body": "QA summary (evidence run on commit 159502f, pnpm e2e:evidence e2e/xc-7.spec.ts, run once: 3 of 3 passed)\n\n- AC1 - When I am not signed in, I can only see the sign-in and sign-up screens: pass\n- AC2 - If I open any other page while signed out, I am sent to the sign-in screen: pass\n\nRead the videos with this in mind: both tests run signed out and write nothing to the shared API (no accounts, no sign-in, no sign-up). AC2 tries /, /?tab=latest, /profile/someone, /tweets/123 and /settings. The last three match no page today, which is the case the dev's not-found fix covers; they are stand-ins for \"any other page\", not real pages.\n\nA third test, \"signed in: regression: a signed-in person who opens an unknown address still sees Not Found\", passed too. It is not an acceptance criterion, so no video of it is posted here; it guards that the fix does not send a signed-in person to the sign-in screen.\n\nRe-run the evidence: pnpm e2e:evidence e2e/xc-7.spec.ts"
        },
        {
          "author": "Mihai",
          "role": "PO",
          "created": "2026-11-18T13:05",
          "body": "PO Mihai: In Acceptance → Done"
        }
      ]
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
      "status": "Done",
      "source": "docs/stories/x-clone-v3-epic-2-stories.md#story-21-scroll-the-home-timeline",
      "created": "2026-11-12T10:00",
      "updated": "2026-11-18T12:49",
      "updates": 34,
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
        },
        {
          "author": "Mihai",
          "role": "PO",
          "created": "2026-11-18T12:26",
          "body": "2"
        },
        {
          "author": "Claude",
          "role": "AI Dev",
          "created": "2026-11-18T12:28",
          "body": "Ready for review again (send-back cycle 1). Commit 5e08314 (base 08ac95f). No code or test changed since the last review, so there is no new commit.\n\nWhat changed is the criterion, by the product owner: Mihai (PO) answered \"2\" on this ticket at 12:26, choosing the option \"AC1 is reworded to: my tweets and those of people I follow\". The story file still has the old wording; the PO owns that text.\n\nHow the three blocking findings stand under that decision\n1. queries/tweets.ts:32 (reads /api/timeline): now what the criterion asks for. /api/timeline is exactly \"my tweets plus those of accounts I follow\".\n2. e2e/xc-8.spec.ts:90 (AC1 test follows every author): now the right test. It shows tweets from three followed authors and the viewer, newest first. An unfollowed author is no longer expected to appear.\n3. e2e/xc-8.spec.ts:272 (AC4 empty state): a new account that has posted nothing and follows nobody has no tweets in its timeline, which is \"no tweets yet\" for that reading. The test confirms with the API that the timeline is empty before opening the page.\n\nChecks, re-run on the current HEAD (0b6eea0), from src/frontend\n- Round 3: tsc pass, lint pass, pnpm test pass (7), pnpm e2e pass (8: smoke, XC-5, XC-8).\n\nNot changed (non-blocking findings from the review, left for a decision): PAGE_SIZE duplicated in the spec, only the first image shown, the screen-reader time label, focus after \"Try again\", announcing loaded tweets, a keyboard scroll step. The removed \"Welcome\" heading is asserted by no spec (the whole suite passes)."
        },
        {
          "author": "Claude",
          "role": "AI Review",
          "created": "2026-11-18T12:29",
          "body": "Review verdict (round 2): APPROVE, from both the code reviewer and the accessibility reviewer. No blocking findings. Same change set as round 1 (08ac95f..5e08314); AC1 was reviewed as the product owner decided it: \"my tweets and those of people I follow, newest first\". Full review: docs/reviews/xc-8-review.md\n\nCriteria → tests: AC1 ok (test name is stale), AC2 ok, AC3 ok, AC4 ok.\n\nNon-blocking (code)\n- e2e/xc-8.spec.ts:12: the spec uses throwaway accounts, not the saved sign-in, and leaves about 10 accounts and 50+ tweets per run; a person should accept this knowingly.\n- e2e/xc-8.spec.ts:66 and :97: the AC1 test name and caption still say \"all users\"; rename once the story text is reworded.\n- components/tweet-card.tsx:6: only the first of mediaUrls is shown.\n- Commit 5e08314: the message does not mention the reworded AC1.\n\nNon-blocking (accessibility)\n- components/tweet-card.tsx:20: the full date is only in title; screen readers get just \"5m\".\n- components/tweet-card.tsx:36: the image alt text does not describe the picture.\n- components/tweet-card.tsx:11: a long name can cut the handle off on a narrow screen.\n- routes/_app/index.tsx:60 and :89: the status message is mounted with its text, so it may not be announced.\n- routes/_app/index.tsx:77: \"No tweets yet.\" is not announced.\n- routes/_app/index.tsx:82: newly loaded tweets are appended silently."
        },
        {
          "author": "Claude",
          "role": "AI QA",
          "created": "2026-11-18T12:31",
          "body": "AC1 - The home timeline shows tweets from all users, newest first (read as the PO decided: my tweets and those of people I follow): pass",
          "attachments": [
            {
              "type": "video",
              "path": "docs/qa/XC-8/ac1.webm",
              "label": "AC1",
              "ac": 1,
              "result": "pass"
            }
          ]
        },
        {
          "author": "Claude",
          "role": "AI QA",
          "created": "2026-11-18T12:31",
          "body": "AC2 - More tweets load automatically as I scroll, with no \"next page\" button: fail",
          "attachments": [
            {
              "type": "video",
              "path": "docs/qa/XC-8/ac2.webm",
              "label": "AC2",
              "ac": 2,
              "result": "fail"
            }
          ]
        },
        {
          "author": "Claude",
          "role": "AI QA",
          "created": "2026-11-18T12:31",
          "body": "AC3 - Each tweet shows the author's name and handle, when it was posted, the text, and the image if there is one: pass",
          "attachments": [
            {
              "type": "video",
              "path": "docs/qa/XC-8/ac3.webm",
              "label": "AC3",
              "ac": 3,
              "result": "pass"
            }
          ]
        },
        {
          "author": "Claude",
          "role": "AI QA",
          "created": "2026-11-18T12:31",
          "body": "AC4 - If there are no tweets yet, I see a simple empty message: fail",
          "attachments": [
            {
              "type": "video",
              "path": "docs/qa/XC-8/ac4.webm",
              "label": "AC4",
              "ac": 4,
              "result": "fail"
            }
          ]
        },
        {
          "author": "Claude",
          "role": "AI QA",
          "created": "2026-11-18T12:31",
          "body": "QA evidence: 2 of 4 criteria passed. Each has its video attached above, including the two that failed.\n\n- AC1 - The home timeline shows tweets from all users, newest first (as the PO decided: my tweets and those of people I follow): pass\n- AC2 - More tweets load automatically as I scroll, with no \"next page\" button: fail\n- AC3 - Each tweet shows the author's name and handle, when it was posted, the text, and the image if there is one: pass\n- AC4 - If there are no tweets yet, I see a simple empty message: fail\n\nRun once. Re-run the evidence from src/frontend: pnpm e2e:evidence e2e/xc-8.spec.ts"
        },
        {
          "author": "Claude",
          "role": "QA",
          "created": "2026-11-18T12:31",
          "body": "QA: 2 of 4 criteria failed in the evidence run (pnpm e2e:evidence e2e/xc-8.spec.ts, run once). Both pass in the fast verify project and fail only at evidence pace. Videos are on the ticket.\n\nAC2 - More tweets load automatically as I scroll, with no \"next page\" button: fail\n- e2e/xc-8.spec.ts:163: expect(getByRole('article')).toHaveCount(40) received 45.\n- What the video shows: after the first scroll, the second page loads and then the third loads as well, before the test looks. Tweets do load automatically and there is no button; the test expects the pages to arrive one scroll at a time.\n\nAC4 - If there are no tweets yet, I see a simple empty message: fail\n- e2e/xc-8.spec.ts:290: expect(getByText(/loading/i)).toHaveCount(0) received 1.\n- What the video shows: \"No tweets yet.\" is on screen and nothing is loading. The one match is the evidence caption itself (\"... no error and no endless loading\"), which exists only in the evidence project.\n\nAlso seen: the AC3 test records two videos (video.webm, and video-1.webm of 54 KB from the spare tab that draws the picture). The main one was posted."
        },
        {
          "author": "Claude",
          "role": "AI Dev",
          "created": "2026-11-18T12:34",
          "body": "Ready for review again (send-back cycle 2, after QA). New commit 81c9ad4 on top of 5e08314 (base 08ac95f). The story's change set is: git diff 08ac95f..HEAD -- src/frontend\n\nFiles changed in this pass\n- src/frontend/e2e/xc-8.spec.ts only. No application code changed.\n\nTest changes, and why. Each test was wrong about how the page behaves at evidence pace, not about its criterion; no assertion was loosened.\n- AC2 (line 163 before): the test scrolled 4000px past the end, so at evidence pace page 2 and then page 3 both loaded before it counted, and it expected 40 and got 45. It now scrolls only to the last loaded tweet each time, so one scroll loads exactly one page. Same assertions: 20, then 40, then 45 tweets; 0, 1, 2 cursor requests; no button; nothing loaded twice.\n- AC4 (line 290 before): \"no loading message\" matched the evidence caption for that step, which contains the word \"loading\". The check, and the \"no error\" check beside it, now look inside the page's <main> only.\n- AC3: the picture is now drawn in a separate, unrecorded browser context, so the test leaves one video instead of two (QA noted the stray 54 KB video-1.webm).\n\nChecks (from src/frontend)\n- Round 4: tsc pass, lint pass, vitest related pass (5), e2e xc-8 pass (4), pnpm test pass (7), pnpm e2e pass (8).\n- Extra, because the failures only showed at evidence pace: pnpm e2e:evidence e2e/xc-8.spec.ts pass (4).\n\nUnchanged: AC1 is built and tested as the PO decided (my tweets and those of people I follow). The non-blocking review findings are still open."
        },
        {
          "author": "Claude",
          "role": "QA",
          "created": "2026-11-18T12:35",
          "body": "Review verdict (round 3): CHANGES NEEDED. The code reviewer blocks; the accessibility reviewer approves. Change set: 08ac95f..HEAD in src/frontend (5e08314, 81c9ad4). Full review: docs/reviews/xc-8-review.md\n\nBlocking\n1. src/frontend/e2e/xc-8.spec.ts:12 and :39-41: the spec drops the saved sign-in and signs up throwaway accounts on the shared API with passwords it generates (9 accounts and about 50 tweets per run, per project, never removed). CLAUDE.md says the e2e tests run \"signed in as the person\" and \"never sign in or handle a password yourself\", and neither commit message mentions the deviation. Either run the tests on the saved sign-in, or get the person's explicit agreement to throwaway accounts recorded on this ticket. The application code itself is fine. (Rounds 1 and 2 raised this as non-blocking.)\n\nCriteria → tests: AC1 ok (title is stale), AC2 ok, AC3 ok, AC4 ok.\n\nNon-blocking (code)\n- e2e/xc-8.spec.ts:66 and :98: the AC1 title and caption still say \"all users\" / \"every user\"; rename once the story text is reworded.\n- e2e/xc-8.spec.ts:90-102: add one unfollowed author asserted absent, to pin the decided wording.\n- e2e/xc-8.spec.ts:118, 183, 265, 298: dispose(...) is skipped when an assertion fails; use try/finally or a fixture.\n- e2e/xc-8.spec.ts:241: the time pattern assumes the relative time is never a word such as \"now\".\n- components/tweet-card.tsx:6: only the first of mediaUrls is shown.\n- queries/tweets.ts:26 and e2e/xc-8.spec.ts:14: the page size 20 is declared twice.\n\nNon-blocking (accessibility)\n- routes/_app/index.tsx:60 and :89: status messages are mounted with their text, so they may not be announced.\n- routes/_app/index.tsx:77: \"No tweets yet.\" is not announced.\n- routes/_app/index.tsx:82: tweets appended by scrolling are not announced.\n- components/tweet-card.tsx:20: the time is read as \"5m\"; give it an accessible full date.\n- components/tweet-card.tsx:36: the image alt text does not describe the picture.\n- components/tweet-card.tsx:11 and :14: a truncated name or handle cannot be read in full."
        },
        {
          "author": "Claude",
          "role": "AI Dev",
          "created": "2026-11-18T12:35",
          "body": "Needs a person\n\nThis is the third send-back, and /implement allows two cycles per story, so the run stops here with the ticket In Progress.\n\nThe one blocking finding is a decision, not a code fix: may the XC-8 tests use throwaway accounts on the shared API instead of the saved sign-in?\n- Why they do: the timeline is follow-based, so the tests need authors to follow and tweets to see, and AC4 needs an account with an empty timeline. On the saved sign-in that would put follows and about 50 test tweets per run on the person's own account, and AC4's empty state would no longer be reachable once that account follows anyone or posts.\n- What it costs: 9 accounts and about 55 tweets per run stay on the shared API, and the spec generates the throwaway passwords itself. XC-5's spec, already accepted, creates throwaway accounts the same way.\n\nTo unblock: a person records on this ticket either \"throwaway accounts are fine for XC-8\", after which review can run again on the same commits, or \"use the saved sign-in\", after which the tests need reworking (and AC4 needs another way to reach an empty timeline, such as stubbing the response).\n\nState: commits 5e08314 and 81c9ad4 are green on every check (tsc, lint, vitest 7, e2e 8, and the XC-8 tests at evidence pace 4 of 4). The QA videos on this ticket are from the earlier run, before the test fixes: AC1 and AC3 pass, AC2 and AC4 fail. No evidence has been recorded for the fixed tests."
        },
        {
          "author": "Claude",
          "role": "AI Dev",
          "created": "2026-11-18T12:37",
          "body": "Decision from the person (Mihai, in the working session, 2026-11-18), on the blocking finding of review round 3: \"Use my sign-in\".\n\nSo the XC-8 tests are being reworked to run on the saved sign-in, with no throwaway accounts and no generated passwords. Picking the ticket up again on that instruction (it is past the two automatic send-back cycles)."
        },
        {
          "author": "Claude",
          "role": "AI Dev",
          "created": "2026-11-18T12:40",
          "body": "Ready for review. New commit 17e5740, on top of 5e08314 and 81c9ad4 (base 08ac95f). Change set: git diff 08ac95f..HEAD -- src/frontend\n\nWhat changed in this pass\n- src/frontend/e2e/xc-8.spec.ts only, rewritten on the person's decision \"Use my sign-in\" (recorded above). No application code changed.\n\nHow the tests work now\n- They run on the saved sign-in, like every other spec. No accounts are created, no passwords generated, and nothing is written to the shared API: no follows, no tweets, no uploads. Sign out is never clicked.\n- The timeline's contents are served by the test: serveTimeline answers the app's own GET /api/timeline calls from a list the test controls, paging the way the API does (limit and cursor in, items and nextCursor out). The image in AC3 is a real PNG served the same way.\n- AC1: five tweets from four people (Ada, Grace, Alan and the signed-in person), newest first; order checked by text and by datetime.\n- AC2: 45 tweets; 20, then 40, then 45 after two scrolls; the app's requests carry the cursors it was given (none, after-20, after-40); no next/more/load/older button or link; order holds with no duplicates.\n- AC3: name, handle, time (datetime and \"3m\"), text, an image that really loads; and a tweet without an image.\n- AC4: an empty page from the endpoint shows \"No tweets yet.\", with no error, no loading left, and exactly one request.\n- Extra test, not a criterion: \"contract\" reads the real /api/timeline (read-only) and checks its shape, so the served answers cannot drift from the API unnoticed.\n\nTrade-off to review\n- The tests no longer prove what the real API returns for a given set of follows; they prove the app shows what the timeline endpoint returns, in its order, and pages through it. That follows from running on the saved sign-in without writing test data to the person's account. The contract test covers the shape only.\n- The AC1 title still says \"all users\" because the story text is unchanged; the criterion is read as the PO decided (my tweets and those of people I follow).\n\nChecks (from src/frontend)\n- Round 5: tsc pass, lint pass, e2e xc-8 pass (5), pnpm test pass (7), pnpm e2e pass (9: smoke, XC-5, XC-8).\n- At evidence pace: pnpm e2e:evidence e2e/xc-8.spec.ts pass (5).\n\nEarlier non-blocking findings addressed by the rewrite: no dispose() to skip, one video per test. Still open: page size declared in both the spec and queries/tweets.ts, only the first image shown, and the accessibility suggestions."
        },
        {
          "author": "Claude",
          "role": "AI Review",
          "created": "2026-11-18T12:46",
          "body": "Review verdict (round 4): APPROVE. Code reviewer and accessibility reviewer both approve, nothing blocking. Change set: 08ac95f..HEAD in src/frontend (5e08314, 81c9ad4, 17e5740). Full review: docs/reviews/xc-8-review.md\n\nAC1 is read as the PO decided (my tweets and those of people I follow). Criteria -> tests: AC1 ok, AC2 ok, AC3 ok, AC4 ok.\n\nNote for QA and the person: in AC1-AC4 the timeline is served by the test, so the videos show Ada, Grace and Alan, not the person's real timeline. Whether the real endpoint returns only \"me and people I follow\" is not tested; a read-only contract test checks the response shape only.\n\nNon-blocking (code)\n- e2e/xc-8.spec.ts:85: the AC1 title still says \"tweets from all users\" (old story wording); rename once the PO rewords the story.\n- e2e/xc-8.spec.ts:263-282: the contract test never follows nextCursor, its ordering check passes on an empty or one-item timeline, and it does not check the empty-page shape or mediaUrls entries.\n- e2e/xc-8.spec.ts:79-83: me() does not assert session.user.handle exists (\"@undefined\" otherwise).\n- e2e/xc-8.spec.ts:211, 231: exact \"3m\" and \"12m\" could flake at evidence pace.\n- e2e/xc-8.spec.ts:263: the contract test has no AC<n> name and gets an empty video in the evidence project.\n\nNon-blocking (accessibility)\n- routes/_app/index.tsx:77: \"No tweets yet.\" has no role=\"status\", so it may not be announced.\n- components/tweet-card.tsx:20: the time is read as \"3m\"; add visually hidden full text.\n- components/tweet-card.tsx:11: truncated name and handle cannot be read in full.\n- e2e/xc-8.spec.ts:259: AC4's no-alert/no-loading checks are scoped to main; assert it is visible first.\n- e2e/xc-8.spec.ts:217: exact \"3m\" and \"12m\" only hold within about a minute of makeTweet."
        },
        {
          "author": "Claude",
          "role": "AI QA",
          "created": "2026-11-18T12:48",
          "body": "AC1 - The home timeline shows tweets from all users, newest first (read as the PO decided: my tweets and those of people I follow): pass",
          "attachments": [
            {
              "type": "video",
              "path": "docs/qa/XC-8/ac1.webm",
              "label": "AC1",
              "ac": 1,
              "result": "pass"
            }
          ]
        },
        {
          "author": "Claude",
          "role": "AI QA",
          "created": "2026-11-18T12:48",
          "body": "AC2 - More tweets load automatically as I scroll, with no \"next page\" button: pass",
          "attachments": [
            {
              "type": "video",
              "path": "docs/qa/XC-8/ac2.webm",
              "label": "AC2",
              "ac": 2,
              "result": "pass"
            }
          ]
        },
        {
          "author": "Claude",
          "role": "AI QA",
          "created": "2026-11-18T12:48",
          "body": "AC3 - Each tweet shows the author's name and handle, when it was posted, the text, and the image if there is one: pass",
          "attachments": [
            {
              "type": "video",
              "path": "docs/qa/XC-8/ac3.webm",
              "label": "AC3",
              "ac": 3,
              "result": "pass"
            }
          ]
        },
        {
          "author": "Claude",
          "role": "AI QA",
          "created": "2026-11-18T12:48",
          "body": "AC4 - If there are no tweets yet, I see a simple empty message: pass",
          "attachments": [
            {
              "type": "video",
              "path": "docs/qa/XC-8/ac4.webm",
              "label": "AC4",
              "ac": 4,
              "result": "pass"
            }
          ]
        },
        {
          "author": "Claude",
          "role": "AI QA",
          "created": "2026-11-18T12:48",
          "body": "QA summary (evidence run on commit 17e5740, pnpm e2e:evidence e2e/xc-8.spec.ts, run once: 5 of 5 passed)\n\n- AC1 - The home timeline shows tweets from all users, newest first (read as the PO decided: my tweets and those of people I follow): pass\n- AC2 - More tweets load automatically as I scroll, with no \"next page\" button: pass\n- AC3 - Each tweet shows the author's name and handle, when it was posted, the text, and the image if there is one: pass\n- AC4 - If there are no tweets yet, I see a simple empty message: pass\n\nRead the videos with this in mind: the timeline in AC1-AC4 is served by the test (Ada, Grace, Alan and the signed-in person), not the person's real timeline, and nothing is written to the shared API. So the videos prove the app shows what /api/timeline returns, in order, and pages through it. They do not prove which tweets the real endpoint returns for a given set of follows. A separate read-only \"contract\" test (passed, no video posted) checks the real endpoint's response shape.\n\nThe story text still says \"from all users\"; the PO's rewording is on the ticket.\n\nRe-run the evidence: pnpm e2e:evidence e2e/xc-8.spec.ts"
        },
        {
          "author": "Mihai",
          "role": "PO",
          "created": "2026-11-18T12:49",
          "body": "PO Mihai: In Acceptance → Done"
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
      "status": "Done",
      "source": "docs/stories/x-clone-v3-epic-2-stories.md#story-22-post-a-tweet",
      "created": "2026-11-12T10:00",
      "updated": "2026-11-18T14:54",
      "updates": 13,
      "comments": [
        {
          "author": "Claude",
          "role": "AI Dev",
          "created": "2026-11-18T13:47",
          "body": "Started from cc6e86d. Built by morch worker t-20261118-55c1 (commit 4fa4101), merged to main as 55dda49. Its change set is git diff cc6e86d..55dda49 -- src/frontend; the later merges (XC-11, the XC-10 test fix) are not part of it."
        },
        {
          "author": "Claude",
          "role": "AI Dev",
          "created": "2026-11-18T13:47",
          "body": "Ready for review. Commit 4fa4101, merged to main as 55dda49. Change set: git diff cc6e86d..55dda49 -- src/frontend. Built by a morch worker in its own worktree, not by /implement-story.\n\nFiles changed (all new unless noted)\n- src/frontend/src/lib/compose.ts: MAX_TWEET_LENGTH (280), ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES (5 MB), validateTweetText, validateImage. XC-12 reuses them.\n- src/frontend/src/queries/compose.ts: uploadImage (multipart field \"files\") and createTweet, plain fetch with credentials \"include\" and relative URLs; also ComposeError, composeErrorMessage and addTweetToTimeline (puts the returned tweet at the top of page 1 of the [\"timeline\"] cache, or invalidates it when it has no data).\n- src/frontend/src/components/tweet-composer.tsx: textarea \"Tweet text\", \"Add image\" (visually hidden file input, in the tab order), image preview with \"Remove image\", \"Post\" / \"Posting...\", characters left.\n- src/frontend/src/routes/_app/index.tsx (changed, 3 lines): the composer under the Home heading. The timeline code is untouched.\n- Tests: lib/compose.test.ts, components/tweet-composer.test.tsx, e2e/xc-9.spec.ts (AC1 to AC4, plus 2 extra tests that are not criteria: \"the first tweet replaces the empty timeline message\" and a read-only \"contract\" test on the API's documented limits).\n\nChecks\n- Worker, in its worktree: tsc pass, lint pass, pnpm test pass (49, 42 new), pnpm build pass.\n- morch verification: gates pass, 5 rules checked and passing, reviewer model approved.\n- Main checkout after the merge, from src/frontend: tsc pass, lint pass, pnpm test pass (75), pnpm e2e pass (27: smoke, XC-5 to XC-8, XC-9 x6, XC-10 x3, XC-11 x3). The worker could not run e2e in its worktree (no saved sign-in), so this is the first run of xc-9.spec.ts.\n\nDecisions made without asking\n1. The story says the length and image limits are \"Not known yet\". The API's documented limits are used: 280 characters after trimming; JPEG, PNG, GIF or WebP; 5 MB. The product owner should record these on the ticket.\n2. One image at most (R7), although the API allows four.\n3. A 400 or 413 from the API shows the API's own error text, which may be terse (for example \"Invalid body\"). A network failure or a 5xx shows \"Couldn't post your tweet. Try again.\" and keeps the draft.\n4. The over-length message uses the brief's exact wording, so N = 1 reads \"1 characters over\".\n5. The characters-left count is of the trimmed text, as the API counts it.\n6. Writes are plain functions used with useMutation, not queryOptions (AGENTS.md says \"wrapped in queryOptions\"); confirm that reading.\n7. The spec serves /api/tweets and /api/upload from the test with page.route, so nothing is written to the shared API and nothing is posted from the person's account. The videos show served data.\n8. Disclosure from the worker: while preparing it started a scratch dev server on port 5199 and a stub API on 5198, shut both down and deleted their files. It never used 5173 or the saved sign-in.\n\nFor the reviewer\n- queries/compose.ts and components/tweet-composer.tsx first; the upload key is remembered so a retry after a failed tweet call does not upload twice.\n- Not checked in a browser: the look of the composer in light and dark mode."
        },
        {
          "author": "Claude",
          "role": "AI Review",
          "created": "2026-11-18T13:50",
          "body": "Review verdict: APPROVE. Code reviewer and accessibility reviewer both approve, nothing blocking. Base reviewed: cc6e86d (worker commit 4fa4101, merged as 55dda49). Full review: docs/reviews/xc-9-review.md\n\nCriteria -> tests: AC1 ok, AC2 ok, AC3 ok, AC4 ok.\n\nNon-blocking (code)\n- e2e/xc-9.spec.ts:204-206: settle() resolves at once when the page was already idle, so the \"nothing was sent\" and \"no second timeline request\" reads are saved only because the call lists are cumulative; add a short quiet wait before the last reads.\n- e2e/xc-9.spec.ts:389-392: Enter and Ctrl/Meta+Enter in a textarea do not submit a form, so only requestSubmit() tests the guard; the caption oversells it.\n- e2e/xc-9.spec.ts:558-560: the contract test checks the content and mediaKeys properties exist, not the schema's required list.\n- lib/compose.ts:25: \"1 characters over\" is ungrammatical (cosmetic).\n- tweet-composer.tsx: the hidden file input and \"Add image\" are two tab stops for one action (deliberate).\n- NF1: the new tweet shows after the upload and create calls return, with \"Posting...\" meanwhile; it is not an optimistic insert.\n\nNon-blocking (accessibility)\n- tweet-composer.tsx:110: the error messages and the count are not tied to the textarea with aria-describedby.\n- tweet-composer.tsx:188, :55, :169: focus is lost when Post disables; return it to the textarea.\n- tweet-composer.tsx:55: a successful post is not announced (add a hidden role=\"status\").\n- tweet-composer.tsx:140: the over-limit alert changes with every keystroke, so a screen reader repeats it.\n- tweet-composer.tsx:157: the hidden file input's focus ring is ring-ring/50, probably under 3:1 in light mode.\n- tweet-composer.tsx:134,173: the icons may lack aria-hidden.\n- e2e/xc-9.spec.ts:236: posting is only tested with a mouse click; add a Tab to Post and Enter step.\n\nNote for QA: the limits are the API's documented ones because the story says \"Not known yet\"; the product owner should record them. The spec has two extra tests that are not criteria (\"the first tweet replaces the empty timeline message\" and a read-only contract test). The spec serves /api/tweets and /api/upload from the test, so the videos show served data and nothing is posted from the person's account."
        },
        {
          "author": "Claude",
          "role": "AI QA",
          "created": "2026-11-18T14:48",
          "body": "AC1 - I can type a tweet and post it, with or without one image: pass",
          "attachments": [
            {
              "type": "video",
              "path": "docs/qa/XC-9/ac1.webm",
              "label": "AC1",
              "ac": 1,
              "result": "pass"
            }
          ]
        },
        {
          "author": "Claude",
          "role": "AI QA",
          "created": "2026-11-18T14:48",
          "body": "AC2 - My new tweet appears at the top of my timeline straight away: pass",
          "attachments": [
            {
              "type": "video",
              "path": "docs/qa/XC-9/ac2.webm",
              "label": "AC2",
              "ac": 2,
              "result": "pass"
            }
          ]
        },
        {
          "author": "Claude",
          "role": "AI QA",
          "created": "2026-11-18T14:48",
          "body": "AC3 - I cannot post an empty tweet: pass",
          "attachments": [
            {
              "type": "video",
              "path": "docs/qa/XC-9/ac3.webm",
              "label": "AC3",
              "ac": 3,
              "result": "pass"
            }
          ]
        },
        {
          "author": "Claude",
          "role": "AI QA",
          "created": "2026-11-18T14:48",
          "body": "AC4 - If the tweet is too long or the image is not allowed, I see a clear message (the length and image limits are Not known yet): pass",
          "attachments": [
            {
              "type": "video",
              "path": "docs/qa/XC-9/ac4.webm",
              "label": "AC4",
              "ac": 4,
              "result": "pass"
            }
          ]
        },
        {
          "author": "Claude",
          "role": "AI QA",
          "created": "2026-11-18T14:48",
          "body": "QA summary (evidence run on main at 049498e, pnpm e2e:evidence e2e/xc-9.spec.ts: 6 of 6 passed)\n\n- AC1 - I can type a tweet and post it, with or without one image: pass\n- AC2 - My new tweet appears at the top of my timeline straight away: pass\n- AC3 - I cannot post an empty tweet: pass\n- AC4 - If the tweet is too long or the image is not allowed, I see a clear message (the length and image limits are Not known yet): pass\n\nThe run was done twice: the first attempt crashed the browser before AC1 started (\"browserContext.newPage: Target crashed\", a 1.6 KB video, AC2 to AC4 passed), so AC1 was re-run with the whole spec. The videos posted are from the second run, where all six tests passed. Nothing was changed between the runs.\n\nRead the videos with this in mind\n- The API is served by the test: /api/timeline, POST /api/tweets and POST /api/upload are answered with page.route. Nothing is posted from your account, so the videos show served data, and a tweet you see being posted in them is not on the shared API.\n- The limits the story calls \"Not known yet\" are the API's documented ones: 280 characters after trimming; JPEG, PNG, GIF or WebP; 5 MB. The product owner should record them on the ticket.\n- Two extra tests that are not criteria also passed: \"the first tweet replaces the empty timeline message\", and a read-only \"contract\" test that reads the API's documented limits and fields. Their videos are not posted.\n- Not exercised: the real upload and the real tweet endpoints, because the spec never writes to the shared API.\n\nRe-run the evidence: pnpm e2e:evidence e2e/xc-9.spec.ts"
        },
        {
          "author": "Mihai",
          "role": "PO",
          "created": "2026-11-18T14:54",
          "body": "PO Mihai: In Acceptance → Done"
        }
      ]
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
      "status": "Done",
      "source": "docs/stories/x-clone-v3-epic-3-stories.md#story-31-like-and-unlike-a-tweet",
      "created": "2026-11-12T10:00",
      "updated": "2026-11-18T14:54",
      "updates": 15,
      "comments": [
        {
          "author": "Claude",
          "role": "AI Dev",
          "created": "2026-11-18T13:34",
          "body": "Started from 159502f. Built by morch worker t-20261118-0c4a on branch morch/t-20261118-0c4a, merged to main as cc6e86d."
        },
        {
          "author": "Claude",
          "role": "AI Dev",
          "created": "2026-11-18T13:34",
          "body": "Ready for review. Change set: git diff 159502f..HEAD -- src/frontend (worker commit 7a4fd9f, merged as cc6e86d). Built by a morch worker in its own worktree, not by /implement-story.\n\nFiles changed (all new unless noted)\n- src/frontend/src/queries/likes.ts: likeTweet (POST) and unlikeTweet (DELETE) on /api/tweets/{id}/like, plain fetch, credentials \"include\", relative URL.\n- src/frontend/src/hooks/use-optimistic-toggle.ts: the generic hook. Flips the flag and moves the count at once on every cached timeline page, runs one tweet's requests in order, replaces the guess with the count in the answer, and on failure shows a toast and goes back to the last state the server confirmed. It never refetches the timeline. XC-11 reuses it.\n- src/frontend/src/components/like-button.tsx: a toggle button, name \"Like\", aria-pressed, the count as its description, filled heart when liked.\n- src/frontend/src/components/tweet-card.tsx (changed): a footer action row holding the like button.\n- Tests: use-optimistic-toggle.test.tsx, like-button.test.tsx, tweet-card.test.tsx (changed: render became renderWithQuery, no assertion touched), e2e/xc-10.spec.ts (AC1 to AC3).\n\nChecks\n- Worker, in its worktree: tsc pass, lint pass, pnpm test pass (23), pnpm build pass. Mutation check on the hook tests: removing the request scope, the rollback or the optimistic write each fails tests.\n- morch verification: gates pass, 5 rules checked and passing, reviewer model approved.\n- Main checkout after the merge, from src/frontend: tsc pass, lint pass, pnpm test pass (23), pnpm e2e pass (18: smoke, XC-5, XC-6, XC-7 x3, XC-8 x5, XC-10 x3). The worker could not run e2e in its worktree (no saved sign-in), so this is the first run of xc-10.spec.ts.\n\nDecisions made without asking\n1. The spec serves /api/timeline and a small fake of the like endpoints with page.route, so nothing is written to the shared API and nothing touches the person's likes. The videos show served data, not real data.\n2. A failed save raises one toast per failed request, so three queued taps that all fail show three identical toasts. Left as is.\n3. If the tweet is no longer in the cached timeline, the optimistic write and the rollback are skipped and the request still goes out.\n\nFor the reviewer\n- use-optimistic-toggle.ts: the confirmed, wanted and unsettled bookkeeping is the subtle part.\n- Not checked in a browser: the heart fill, colours and the -ml-2.5 alignment, in light and dark mode.\n- Rapid taps and the focus ring are covered by Vitest only, not by e2e."
        },
        {
          "author": "Claude",
          "role": "QA",
          "created": "2026-11-18T13:38",
          "body": "Review verdict: CHANGES NEEDED. The code reviewer blocks; the accessibility reviewer approves. Base reviewed: 159502f (worker commit 7a4fd9f, merged as cc6e86d). Full review: docs/reviews/xc-10-review.md\n\nCriteria -> tests: AC1 ok, AC2 ok, AC3 weak.\n\nBlocking\n1. src/frontend/e2e/xc-10.spec.ts:222-252 (AC3): the failing answer (500) comes back at once, so the test never sees the optimistic state (pressed, 4) before the failure. It checks \"message, count 3, not pressed\", which is also what an app with no optimistic update shows, so it cannot tell \"goes back to what it was\" from \"never changed\". Hold the failing answer the way AC2 holds its answer: tap, assert pressed and \"4\" while the 500 is held, then release it, then assert the message, count \"3\" and not pressed.\n\nNon-blocking (to be fixed in the same change where it is cheap)\n- e2e/xc-10.spec.ts:148: the step \"It stays liked once the answer has come back\" does not wait for the answer; wait for the response or drop the claim.\n- hooks/use-optimistic-toggle.ts:131: cancelQueries on the timeline key also cancels an in-flight \"load more\" page; check the list can still load more after a tap during infinite-scroll loading.\n- hooks/use-optimistic-toggle.ts:42,53: the hook only patches the home timeline cache; make the key an option when another list of tweet cards appears.\n- like-button.tsx:41 and :36: check once in a browser that the filled heart really draws, and the liked and hover contrast, in both themes.\n- like-button.tsx:34: \"3 likes\" would read better than \"3\" as the description.\n- use-optimistic-toggle.ts:152: check the mounted Toaster announces the failure message."
        },
        {
          "author": "Claude",
          "role": "AI Dev",
          "created": "2026-11-18T13:48",
          "body": "Ready for review again (send-back cycle 1). The blocking finding is fixed by morch worker t-20261118-6745: commit c4ea947, merged to main as 97e1648. Only src/frontend/e2e/xc-10.spec.ts changed; no application code changed.\n\nHow the blocker stands\n- AC3 (xc-10.spec.ts, was :222-252): the failing answer is now held in the test, as AC2 holds its answer. The test taps, asserts pressed and \"4\" while the 500 is held and the message is not yet visible, then releases it and asserts the message, count \"3\" and not pressed. The body is in try/finally, so the held answer is always released.\n- Non-blocking, also fixed: the AC1 step \"It stays liked once the answer has come back\" now waits for the like POST's response (page.waitForResponse, started before the tap) and is renamed \"Once the server has saved the like, it stays liked with 4 likes\".\n- Not changed (left for a decision): cancelQueries also cancelling an in-flight \"load more\" page; the hook patching only the home timeline cache; the accessibility suggestions (filled-heart draw and hover contrast check in a browser, \"3 likes\" as the description, Toaster announcement).\n\nChecks, from src/frontend, on main at 97e1648: tsc pass, lint pass, pnpm test pass (75), pnpm e2e pass (27: smoke, XC-5 to XC-8, XC-9 x6, XC-10 x3, XC-11 x3). The fixed xc-10 spec ran for the first time here and passes.\n\nChange set for this review: the original XC-10 source (git diff 159502f..cc6e86d) plus the spec as it is now (git diff 159502f..97e1648 -- src/frontend/e2e/xc-10.spec.ts)."
        },
        {
          "author": "Claude",
          "role": "AI Review",
          "created": "2026-11-18T13:50",
          "body": "Review verdict (round 2): APPROVE. Code reviewer and accessibility reviewer both approve, nothing blocking. Round 1's blocker is fixed. Base reviewed: 159502f (source: cc6e86d; spec as of 97e1648). Full review: docs/reviews/xc-10-review.md\n\nCriteria -> tests: AC1 ok, AC2 ok, AC3 ok (was weak). AC3 now fails if the optimistic update is missing and fails if the rollback is missing.\n\nNon-blocking\n- e2e/xc-10.spec.ts:14: the header comment still says AC3 answers 500 at once; AC2 and AC3 both hold their answers now.\n- e2e/xc-10.spec.ts:217-222: the AC2 step \"The answer arrives: nothing jumps\" re-asserts what was already true and passes before the answer is processed; wait for the POST response as AC1 does. The criterion is met by the held-answer steps.\n- like-button.tsx:36: rose-600 on a light grey hover background could be about 4.3:1; rose-700 is safer.\n- like-button.tsx:44: the count change is not announced (the pressed state is).\n- use-optimistic-toggle.ts:152: the failure toast is not checked for announcement.\n- like-button.test.tsx:156 and :76: the \"keyboard\" test only calls focus() and a click, and nothing checks the icon's aria-hidden.\n- Still open from round 1, not blocking: cancelQueries cancelling an in-flight \"load more\" page; the hook patching only the home timeline cache; check in a browser that the filled heart draws and the hover contrast, in both themes."
        },
        {
          "author": "Claude",
          "role": "AI QA",
          "created": "2026-11-18T14:50",
          "body": "AC1 - Tapping like once likes the tweet; tapping again removes my like: pass",
          "attachments": [
            {
              "type": "video",
              "path": "docs/qa/XC-10/ac1.webm",
              "label": "AC1",
              "ac": 1,
              "result": "pass"
            }
          ]
        },
        {
          "author": "Claude",
          "role": "AI QA",
          "created": "2026-11-18T14:50",
          "body": "AC2 - The like count and the button state update immediately, even on a slow connection: pass",
          "attachments": [
            {
              "type": "video",
              "path": "docs/qa/XC-10/ac2.webm",
              "label": "AC2",
              "ac": 2,
              "result": "pass"
            }
          ]
        },
        {
          "author": "Claude",
          "role": "AI QA",
          "created": "2026-11-18T14:50",
          "body": "AC3 - If saving my like fails, the count goes back to what it was and I see a message: pass",
          "attachments": [
            {
              "type": "video",
              "path": "docs/qa/XC-10/ac3.webm",
              "label": "AC3",
              "ac": 3,
              "result": "pass"
            }
          ]
        },
        {
          "author": "Claude",
          "role": "AI QA",
          "created": "2026-11-18T14:50",
          "body": "QA summary (evidence run on main at 049498e, pnpm e2e:evidence e2e/xc-10.spec.ts, run once: 3 of 3 passed)\n\n- AC1 - Tapping like once likes the tweet; tapping again removes my like: pass\n- AC2 - The like count and the button state update immediately, even on a slow connection: pass\n- AC3 - If saving my like fails, the count goes back to what it was and I see a message: pass\n\nThis is the run after the review send-back. AC3 now holds the failing answer, so its video shows the heart pressed with 4 likes while the save is still failing, then the message \"Couldn't save your like. Try again.\", then the count back to 3 and the heart not pressed. AC2 holds its answer the same way, so its video shows the new state before any answer arrives.\n\nRead the videos with this in mind\n- The API is served by the test: /api/timeline and the like endpoints are answered with page.route, and the \"slow connection\" and the failure are made by the test holding or failing the answer. Nothing is liked from your account, so the videos show served data, not your real likes.\n- Not exercised: the real like endpoints, and the look of the heart and its hover colour in light and dark mode (the review asked for one look in a browser at the filled heart and the contrast).\n\nRe-run the evidence: pnpm e2e:evidence e2e/xc-10.spec.ts"
        },
        {
          "author": "Mihai",
          "role": "PO",
          "created": "2026-11-18T14:54",
          "body": "PO Mihai: In Acceptance → Done"
        }
      ]
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
      "status": "Done",
      "source": "docs/stories/x-clone-v3-epic-3-stories.md#story-32-retweet-and-undo-a-retweet",
      "created": "2026-11-12T10:00",
      "updated": "2026-11-18T14:54",
      "updates": 12,
      "comments": [
        {
          "author": "Claude",
          "role": "AI Dev",
          "created": "2026-11-18T13:48",
          "body": "Started from 55dda49. Built by morch worker t-20261118-9004 (commit 50e9c06), merged to main as 8211b62. The ticket stays In Progress, not In Review, on purpose: the same blocking weakness the XC-10 review found is in this spec. AC3 (xc-11.spec.ts, about :222-252) answers the failing save with a 500 at once, so it cannot tell a rollback from \"nothing changed\", and the AC1 step \"It stays retweeted once the answer has come back\" does not wait for the answer. A test-only fix is being built by morch worker t-20261118-3a0e. When it is merged this ticket goes to In Review.\n\nState of the app code: the RetweetButton reuses the generic hook unchanged. On main, tsc, lint, pnpm test (75) and pnpm e2e (27, including the three XC-11 tests) pass."
        },
        {
          "author": "Claude",
          "role": "AI Dev",
          "created": "2026-11-18T14:40",
          "body": "Ready for review. Built by morch worker t-20261118-9004 (commit 50e9c06, merged as 8211b62); a follow-up test-only fix by worker t-20261118-3a0e (commit 4006711, merged as b31c705). Not built by /implement-story. Change set: git diff 55dda49..8211b62 -- src/frontend, plus the spec as of b31c705 (git diff 8211b62..b31c705 -- src/frontend/e2e/xc-11.spec.ts).\n\nFiles changed (all new unless noted)\n- src/frontend/src/queries/retweets.ts: retweetTweet (POST) and unretweetTweet (DELETE) on /api/tweets/{id}/retweet, plain fetch, credentials \"include\", relative URL.\n- src/frontend/src/components/retweet-button.tsx: a toggle button, name \"Retweet\", aria-pressed, the count as its description; the retweeted state is a heavier icon stroke and a semibold count as well as green.\n- src/frontend/src/components/tweet-card.tsx (changed): the button sits after the like button in the action row.\n- src/frontend/src/hooks/use-optimistic-toggle.ts is unchanged; the button passes its own fields, fetchers and message.\n- Tests: retweet-button.test.tsx (9), tweet-card.test.tsx (changed, one test added), e2e/xc-11.spec.ts (AC1 to AC3).\n\nThe weakness the XC-10 review found was in this spec too, and is fixed before review: AC3 now holds the failing answer and asserts pressed and \"4\" before the failure, then the message, count \"3\" and not pressed; the AC1 step \"It stays retweeted once the answer has come back\" waits for the POST response.\n\nChecks, from src/frontend, on main at 049498e: tsc pass, lint pass, pnpm test pass (105), pnpm build pass, pnpm e2e pass (30: smoke, XC-5 to XC-12). The XC-11 spec ran for the first time in the main checkout.\n\nDecisions made without asking\n1. A retweet adds no tweet to the timeline in this story; only the count and the button change.\n2. The retweeted state is green with a heavier icon and a semibold count (a repost icon has no natural filled form). Is that distinct enough?\n3. The spec serves /api/timeline and the retweet endpoints with page.route; nothing is written to the shared API and nothing is retweeted from the person's account. The videos show served data.\n4. A retweet of a tweet that has left the cached timeline is skipped optimistically (as for likes).\n\nNot checked in a browser: the green colour, the stroke weight and the alignment, in light and dark mode."
        },
        {
          "author": "Claude",
          "role": "AI Review",
          "created": "2026-11-18T14:42",
          "body": "Review verdict: APPROVE. Code reviewer and accessibility reviewer both approve, nothing blocking. Base reviewed: 55dda49 (source 50e9c06 merged as 8211b62, plus the spec as of 4006711 merged as b31c705). Full review: docs/reviews/xc-11-review.md\n\nCriteria -> tests: AC1 ok, AC2 ok, AC3 ok. AC3 shows the optimistic state (pressed, 4) while the failing answer is held, then the message, then count 3 and not pressed.\n\nNon-blocking (code)\n- e2e/xc-11.spec.ts AC2: the step \"The answer arrives: nothing jumps\" re-asserts what was already true and passes before the answer is processed; wait for the POST response as AC1 does. The step before it repeats the same assertions.\n- e2e/xc-11.spec.ts AC1: retweetSaved is created before the tap and awaited in the next step; if the tap fails first the promise can reject unobserved (noise on a failing run).\n- use-optimistic-toggle.ts was not in the diff (unchanged, from XC-10), so it was not reviewed here.\n\nNon-blocking (accessibility)\n- retweet-button.tsx:42: emerald-600 on white is about 3.8:1 in light mode (target 4.5:1) and is a fixed palette colour; consider emerald-700. State is also shown by the icon stroke, a semibold count and aria-pressed, so colour is not the only signal.\n- retweet-button.test.tsx:207: the keyboard test only calls focus() and a click.\n- retweet-button.tsx:44: the count change is not announced."
        },
        {
          "author": "Claude",
          "role": "AI QA",
          "created": "2026-11-18T14:52",
          "body": "AC1 - Tapping retweet once retweets the tweet; tapping again undoes it: pass",
          "attachments": [
            {
              "type": "video",
              "path": "docs/qa/XC-11/ac1.webm",
              "label": "AC1",
              "ac": 1,
              "result": "pass"
            }
          ]
        },
        {
          "author": "Claude",
          "role": "AI QA",
          "created": "2026-11-18T14:52",
          "body": "AC2 - The retweet count and the button state update immediately, even on a slow connection: pass",
          "attachments": [
            {
              "type": "video",
              "path": "docs/qa/XC-11/ac2.webm",
              "label": "AC2",
              "ac": 2,
              "result": "pass"
            }
          ]
        },
        {
          "author": "Claude",
          "role": "AI QA",
          "created": "2026-11-18T14:52",
          "body": "AC3 - If saving my retweet fails, the count goes back to what it was and I see a message: pass",
          "attachments": [
            {
              "type": "video",
              "path": "docs/qa/XC-11/ac3.webm",
              "label": "AC3",
              "ac": 3,
              "result": "pass"
            }
          ]
        },
        {
          "author": "Claude",
          "role": "AI QA",
          "created": "2026-11-18T14:52",
          "body": "QA summary (evidence run on main at 049498e, pnpm e2e:evidence e2e/xc-11.spec.ts, run once: 3 of 3 passed)\n\n- AC1 - Tapping retweet once retweets the tweet; tapping again undoes it: pass\n- AC2 - The retweet count and the button state update immediately, even on a slow connection: pass\n- AC3 - If saving my retweet fails, the count goes back to what it was and I see a message: pass\n\nAC2 and AC3 hold the answer in the test, so the AC3 video shows the retweet button pressed with 4 while the save is still failing, then the message \"Couldn't save your retweet. Try again.\", then the count back to 3 and the button not pressed. This is the same fix the XC-10 review asked for, applied before this ticket's review.\n\nRead the videos with this in mind\n- The API is served by the test: /api/timeline and the retweet endpoints are answered with page.route, and the slow connection and the failure are made by the test. Nothing is retweeted from your account, so the videos show served data, not your real retweets.\n- Not exercised: the real retweet endpoints, and the look of the retweet button in light and dark mode. The review noted its light-mode green is about 3.8:1 on white (target 4.5:1); the retweeted state is also a heavier icon stroke and a semibold count, so it is not colour alone.\n\nRe-run the evidence: pnpm e2e:evidence e2e/xc-11.spec.ts"
        },
        {
          "author": "Mihai",
          "role": "PO",
          "created": "2026-11-18T14:54",
          "body": "PO Mihai: In Acceptance → Done"
        }
      ]
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
      "status": "Done",
      "source": "docs/stories/x-clone-v3-epic-3-stories.md#story-33-reply-to-a-tweet-inline",
      "created": "2026-11-12T10:00",
      "updated": "2026-11-18T14:54",
      "updates": 12,
      "comments": [
        {
          "author": "Claude",
          "role": "AI Dev",
          "created": "2026-11-18T14:40",
          "body": "Started from 8211b62. Built by morch worker t-20261118-cae0 (commit cf1c17c), merged to main as 049498e. Its change set is git diff b31c705..049498e -- src/frontend."
        },
        {
          "author": "Claude",
          "role": "AI Dev",
          "created": "2026-11-18T14:40",
          "body": "Ready for review. Commit cf1c17c, merged to main as 049498e. Change set: git diff b31c705..049498e -- src/frontend. Built by a morch worker in its own worktree, not by /implement-story.\n\nFiles changed (all new unless noted)\n- src/frontend/src/queries/replies.ts: fetchReplies (GET /api/tweets/{id}/replies, 404 gives a quiet \"not available\" state), repliesQueryOptions (key [\"replies\", id], no retry), createReply (POST /api/tweets with { content, parentTweetId }), recordReply (appends the reply to the thread and adds one to that tweet's replyCount in the timeline cache, with no timeline refetch).\n- src/frontend/src/components/reply-thread.tsx: the thread inside the tweet's article: loading status, the replies oldest first, \"No replies yet.\", the 404 message, \"Couldn't load the replies.\" with Try again, and a form (textarea \"Reply to <author>\", \"Post reply\"). It reuses validateTweetText from lib/compose.ts.\n- src/frontend/src/components/tweet-card.tsx (changed): a \"Reply\" button with the count after the retweet button, aria-expanded, closed by default.\n- Tests: reply-thread.test.tsx (26), tweet-card.test.tsx (changed, 4 added), e2e/xc-12.spec.ts (AC1 to AC3).\n\nChecks\n- Worker, in its worktree: tsc pass, lint pass, pnpm test pass (105), pnpm build pass.\n- morch verification: gates pass, 5 rules checked and passing, reviewer model approved.\n- Main checkout at 049498e, from src/frontend: tsc pass, lint pass, pnpm test pass (105), pnpm build pass, pnpm e2e pass (30: smoke, XC-5 to XC-12). The worker could not run e2e, so this is the first run of xc-12.spec.ts.\n\nDecisions made without asking\n1. The form is hidden when the replies GET returns 404 (the tweet is not the caller's or a followee's): the API would not show the reply either, so only a quiet message shows.\n2. The reply count and the new reply appear after the POST returns 201, not optimistically.\n3. A 4xx shows the API's own error text, which may be terse; a network failure or 5xx shows \"Couldn't post your reply. Try again.\" and keeps the draft.\n4. Wording chosen where the story gave none: \"No replies yet.\", the placeholder \"Post your reply\", \"Couldn't load the replies.\".\n5. Replies are cached under [\"replies\", id] with the default 5 minute staleTime: a reply by someone else shows after the cache goes stale or on a reload.\n6. The spec serves the timeline, the replies GET and POST /api/tweets with page.route; nothing is written to the shared API. The videos show served data.\n\nFor the reviewer\n- reply-thread.tsx and recordReply in queries/replies.ts (the cache logic) first.\n- The e2e covers only the happy paths; 404, 4xx, 5xx and the over-limit alert are covered by Vitest only.\n- Not checked in a browser: the sky colour of the Reply button and the layout of the thread, in light and dark mode."
        },
        {
          "author": "Claude",
          "role": "AI Review",
          "created": "2026-11-18T14:43",
          "body": "Review verdict: APPROVE. Code reviewer and accessibility reviewer both approve, nothing blocking. Base reviewed: b31c705 (worker commit cf1c17c, merged as 049498e). Full review: docs/reviews/xc-12-review.md\n\nCriteria -> tests: AC1 ok, AC2 ok, AC3 ok.\n\nNon-blocking (code)\n- e2e/xc-12.spec.ts:19-21, :97: the timeline, the replies GET and the POST are all served by page.route, so a wrong field name such as parentTweetId would pass everywhere. QA or the person should post one real reply with their own account on the dev server to confirm the live API takes it.\n- e2e/xc-12.spec.ts:328-334: the AC3 \"some other way\" step never asserts posts is empty (the final exact equality still catches it).\n- e2e/xc-12.spec.ts AC2: \"directly under\" is checked as \"inside the tweet's article\"; the order is checked only in tweet-card.test.tsx. The time checks allow about a minute of drift.\n- reply-thread.test.tsx:236: the test \"allows exactly 280 characters and sends them\" never sends anything.\n- tweet-card.test.tsx:118,132,143: vi.unstubAllGlobals() should move to afterEach.\n- queries/replies.ts:112-115: recordReply cancels the whole timeline query, dropping a next-page fetch in flight (rare).\n- reply-thread.tsx:133: a 404 on the replies GET hides the form; a design choice the story does not mention.\n- Nothing touches @xbot, so a reply that mentions @xbot gets no answer from this change; the product owner may want to know.\n- NF2: the e2e runs at desktop width only.\n\nNon-blocking (accessibility)\n- reply-thread.tsx:135-149: the error alerts are not tied to the textarea with aria-describedby.\n- reply-thread.tsx:154: focus is lost after a successful post (Post reply stays disabled); move it to the textarea.\n- reply-thread.tsx:99-124: a posted reply, the rising count and the empty and 404 messages are not announced.\n- tweet-card.tsx:67: the Reply button's sky-600 text is about 4.1:1 on white; use sky-700.\n- reply-thread.tsx:124: add role=\"list\" to the ul for VoiceOver.\n\nNote for QA: the spec serves the timeline, the replies GET and POST /api/tweets from the test, so the videos show served data and nothing is posted from the person's account."
        },
        {
          "author": "Claude",
          "role": "AI QA",
          "created": "2026-11-18T14:53",
          "body": "AC1 - I can write a reply to a tweet from the timeline: pass",
          "attachments": [
            {
              "type": "video",
              "path": "docs/qa/XC-12/ac1.webm",
              "label": "AC1",
              "ac": 1,
              "result": "pass"
            }
          ]
        },
        {
          "author": "Claude",
          "role": "AI QA",
          "created": "2026-11-18T14:53",
          "body": "AC2 - Replies appear directly under that tweet in the timeline, without opening a separate page: pass",
          "attachments": [
            {
              "type": "video",
              "path": "docs/qa/XC-12/ac2.webm",
              "label": "AC2",
              "ac": 2,
              "result": "pass"
            }
          ]
        },
        {
          "author": "Claude",
          "role": "AI QA",
          "created": "2026-11-18T14:53",
          "body": "AC3 - I cannot post an empty reply: pass",
          "attachments": [
            {
              "type": "video",
              "path": "docs/qa/XC-12/ac3.webm",
              "label": "AC3",
              "ac": 3,
              "result": "pass"
            }
          ]
        },
        {
          "author": "Claude",
          "role": "AI QA",
          "created": "2026-11-18T14:53",
          "body": "QA summary (evidence run on main at 049498e, pnpm e2e:evidence e2e/xc-12.spec.ts, run once: 3 of 3 passed)\n\n- AC1 - I can write a reply to a tweet from the timeline: pass\n- AC2 - Replies appear directly under that tweet in the timeline, without opening a separate page: pass\n- AC3 - I cannot post an empty reply: pass\n\nRead the videos with this in mind\n- The API is served by the test: /api/timeline, GET /api/tweets/{id}/replies and POST /api/tweets are answered with page.route. Nothing is posted from your account, so the videos show served data, and a reply you see being posted in them is not on the shared API.\n- NOT confirmed against the live API: that POST /api/tweets accepts the field name parentTweetId and makes a single-level reply. The spec and the unit tests assert the request body { content, parentTweetId } against the same assumption, so a wrong field name would pass everywhere. The code review asked for one real reply, posted with your own account on the dev server, to confirm it. I have not done that: it writes to the shared API as you.\n- Not covered by a video: the 404 case (the form is hidden and a quiet message shows), the API refusing a reply, the over-280 alert and the failed-load message; these are covered by unit tests only.\n- A reply that mentions @xbot gets no answer from this change; @xbot is a separate feature and not part of the XC-12 criteria.\n\nRe-run the evidence: pnpm e2e:evidence e2e/xc-12.spec.ts"
        },
        {
          "author": "Mihai",
          "role": "PO",
          "created": "2026-11-18T14:54",
          "body": "PO Mihai: In Acceptance → Done"
        }
      ]
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
