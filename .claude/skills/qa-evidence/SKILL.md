---
name: qa-evidence
description: Act as QA for one story: record a human-paced video per acceptance criterion and post each to the ticket with pass/fail. Moves it In QA → In Acceptance, or back to In Progress.
argument-hint: <story key, e.g. XC-5>
---

# QA evidence for a story

You are the first QA, acting as a person would: you watch the app do each acceptance criterion
and you show your evidence. A human then decides on the board. Usage: `/qa-evidence <KEY>`.

**QA records and reports. It never fixes.** Don't edit app code or tests, and don't write helper
scripts. A failing criterion is a result: post it and send the ticket back.

## The board

Board changes go through the board CLI: `node .claude/scripts/board.mjs <command>`, run from
the repository root (`--help` lists the commands). Never edit `docs/tracker/board-data.js` by
hand and never call the board server with curl. If the CLI exits with an error about the board
not running, or about a ticket someone else moved, follow what it says and stop.

## Steps

1. **Check the ticket.** Run `node .claude/scripts/board.mjs show <KEY>`. It must be **In QA**.
   If not, stop and say which column it's in.
2. **List the criteria** from the story's heading in `docs/stories/`, not from the test file.
   They are what you prove.
3. **Record.** From `src/frontend`, with the dev server running and the sign-in saved:
   `pnpm e2e:evidence e2e/<key>.spec.ts`. It plays each test at human speed and records one video
   per test, and clears the previous run's results itself, so never delete anything first. Run it once. Run it again only if the run itself broke (a crash, or the dev server
   was down), never to turn a red criterion green.
4. **Match results to criteria.** Read `src/frontend/test-results/results.json`. For each test
   named `AC<n>: …`, take its status and its video attachment path. Check the video exists and
   is bigger than about 200 KB (`ls -l`): a tiny file isn't real evidence. A criterion with no
   test is a **fail** ("no evidence").
5. **Post the evidence.** For each criterion, in order, one command uploads its video as
   `ac<n>.webm` and posts one comment with the video attached:

   ```sh
   node .claude/scripts/board.mjs evidence <KEY> --ac <n> --result pass --video <path to the test's video> \
     --body "AC<n> - <the criterion>: pass"
   ```

   Use `--result fail` and `: fail` for a red criterion, and post its video too. The comment is
   one line, for example `AC2 — Wrong password shows an error: pass`. The CLI refuses a video
   that is missing or under about 200 KB (exit 1). That criterion is a **fail** ("no evidence"):
   post it without a video:

   ```sh
   node .claude/scripts/board.mjs comment <KEY> --as qa --body "AC<n> - <the criterion>: fail (no evidence)"
   ```

   Then post one summary comment: each criterion with its result, and the command to re-run the
   evidence.

   ```sh
   node .claude/scripts/board.mjs comment <KEY> --as qa --body - <<'EOF'
   <each criterion with its result, and: pnpm e2e:evidence e2e/<key>.spec.ts>
   EOF
   ```
6. **Move the ticket.**
   - **Every criterion passed:** move it to **In Acceptance**. A person watches the videos and
     accepts it (Done) or sends it back. You never move a ticket to Done.

     ```sh
     node .claude/scripts/board.mjs move <KEY> --from "In QA" --to "In Acceptance" --as qa
     ```
   - **Anything failed or missing:** move it back to **In Progress**, with a comment listing each
     failed criterion and its error line. The failed criterion's video is evidence too: post it.

     ```sh
     node .claude/scripts/board.mjs move <KEY> --from "In QA" --to "In Progress" --as qa --comment - <<'EOF'
     <each failed criterion and its error line>
     EOF
     ```

End by showing the results table in the conversation, with the board link
(`node .claude/scripts/board.mjs url <KEY>` prints it).

## Rules

- If a board command exits with code 3, a person moved the ticket since you looked: stop work on
  that ticket, leave it where it is, report it, and never move it back.
- **Unattended** (run by `/implement`): ask nothing. The results decide the move.
