# The factory loop (self-verification)

Run every command from `src/frontend`. Before the first round, check that the dev server answers
on `http://localhost:5173` and that `e2e/.auth/user.json` exists. If the sign-in is missing,
stop and ask the person to run `pnpm e2e:login`. Never sign in or handle a password yourself.

## Each round

1. `pnpm exec tsc -b`: types, for the app and the specs in `e2e/`
2. `pnpm lint`: lint
3. `pnpm exec vitest related --run <the files you changed>`: unit tests for what you touched
4. `pnpm e2e e2e/<key>.spec.ts`: the story's own end-to-end tests

Something red: read the output (and the screenshot or `error-context.md` a failed Playwright test
points to), fix the **code**, and start the next round. A test that passes and fails by turns is
flaky, not fixed: read its trace (`pnpm exec playwright show-trace <trace.zip>`) instead of
re-running it.

**Never click Sign out in a spec that uses the saved sign-in.** It ends that session on the server,
and every later test fails as signed-out until a person runs `pnpm e2e:login` again. To check a
signed-out screen, open a fresh context:
`browser.newContext({ storageState: { cookies: [], origins: [] }, baseURL: test.info().project.use.baseURL })`.

## When the story's tests are green: the regression run

5. `pnpm test`: the whole Vitest suite
6. `pnpm e2e`: the **whole** end-to-end suite, meaning every earlier story's spec plus the smoke test

Something red here means you broke something that worked. Fix it and go back to step 1. The story
is green only when steps 1 to 6 all pass in the same round.

## Stop

- After **5 rounds** without progress, stop and report. Progress means fewer failing checks than
  in the round before.
- Stop at once, and report, if the dev server or the API isn't answering, the saved sign-in has
  expired, or the story needs an endpoint the API doesn't have. Don't work around a blocker.

Report each round in one line: the round number, then each check as pass or fail.
