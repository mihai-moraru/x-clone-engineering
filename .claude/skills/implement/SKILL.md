---
name: implement
description: Take stories from the board to In Acceptance with no human in between: check the backlog, then implement-story, review-pr and qa-evidence for one story, or every New story of an epic.
argument-hint: "[story key | --epic N]"
---

# Implement (the orchestrator)

Runs the three stage skills for one story, or for a whole epic, **without stopping for approval
between them**. The tests, the review and the QA evidence are the checks. The only human step is
acceptance on the board. Usage: `/implement [KEY]` or `/implement --epic N`.

This skill owns only the order, the backlog check and the send-back cycles, never a stage's
own work. Each stage runs as its own skill in this conversation, not as a subagent. Tell each
one the run is **unattended**.

## References (in this skill's own folder)

- `reference/handoff-check.md`: step 0, the backlog check.

## The board

Board changes go through the board CLI: `node .claude/scripts/board.mjs <command>`, run from
the repository root (`--help` lists the commands). Never edit `docs/tracker/board-data.js` by
hand and never call the board server with curl. If the CLI exits with an error about the board
not running, or about a ticket someone else moved, follow what it says and stop.

## Step 0: preflight (once per run)

1. Check that `implement-story`, `review-pr` and `qa-evidence` exist and can be run. If one
   can't, stop and say which.
2. Run the backlog check in `reference/handoff-check.md`. A **failure** stops the run: list
   every failure and change nothing. **Warnings** are listed and the run goes on.
3. The board server answers (`node .claude/scripts/board.mjs health`), the dev server answers on
   `http://localhost:5173`, and `src/frontend/e2e/.auth/user.json` exists. If any is missing,
   stop and say exactly what to start or run.

## Step 1: pick the stories

- **A key** (`/implement XC-7`): that story. If it's In Acceptance or Done, stop and say so.
- **`--epic N`**, the small factory: every story of epic N that is **New** or **In Progress**,
  in story order. Epic N is the Nth row of `node .claude/scripts/board.mjs list --type Epic`
  (XC-1 is epic 1). Its stories are the rows of
  `node .claude/scripts/board.mjs list --parent <epic key>`; keep those whose status is New or
  In Progress.
- **Nothing:** the first **New** story on the board, in story order
  (`node .claude/scripts/board.mjs list --type Story --status New`, first row).

## Step 2: run each story

For each story, in order:

```
/implement-story <KEY>        → In Review   (or stopped: leave it, report, go to the next story)
/review-pr <KEY>              → In QA       (or back to In Progress: a send-back)
/qa-evidence <KEY>            → In Acceptance (or back to In Progress: a send-back)
```

- **Send-back:** when review or QA sends a story back to In Progress, run `/implement-story`
  again. It reads the latest comments as its to-do list. Then run review and QA again. Allow
  **2 send-back cycles** per story. After that, leave the story In Progress, comment
  `Needs a person` (`node .claude/scripts/board.mjs comment <KEY> --as dev --body "Needs a person"`),
  and move on.
- Check the board after each stage (`node .claude/scripts/board.mjs show <KEY>`): the next stage
  runs only if the ticket is in the column it expects.
- Stories build on each other. Never start the next one while the current one is mid-stage.

## Step 3: report

One table: key, title, final column, the factory-loop rounds, send-back cycles, and the
evidence link (`node .claude/scripts/board.mjs url <KEY>` prints it). Then list every decision a
stage made without asking, and what a person should look at first.

## Rules

- Never move a ticket to **Done**. Acceptance is a person's decision on the board.
- Never skip or reorder the stages, and never do a stage's work in this skill.
- If a board command exits with code 3, a person moved the ticket since you looked: stop work on
  that ticket, leave it where it is, report it, and never move it back.
- Ask nothing during the run. The only questions allowed are in step 0, before anything has
  changed.
