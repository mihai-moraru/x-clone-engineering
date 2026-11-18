---
name: review-pr
description: Fresh-eyes review of one story's change set against its acceptance criteria, the PRD's non-functional requirements and the code conventions. Moves it In Review → In QA, or back to In Progress.
argument-hint: <story key, e.g. XC-5>
---

# Review a story's change set

Reviews what `/implement-story` built for one story, the way a colleague reviews a pull request:
with fresh eyes, and without the builder's reasoning. Usage: `/review-pr <KEY>`.

## References (in this skill's own folder)

- `reviewers/code-reviewer.md`: the code reviewer's instructions. The reviewer runs as a separate
  subagent.
- `reviewers/accessibility.md`: the accessibility reviewer's instructions. It runs as a second,
  separate subagent.

## The board

Board changes go through the board CLI: `node .claude/scripts/board.mjs <command>`, run from
the repository root (`--help` lists the commands). Never edit `docs/tracker/board-data.js` by
hand and never call the board server with curl. If the CLI exits with an error about the board
not running, or about a ticket someone else moved, follow what it says and stop.

## Steps

1. **Check the ticket.** Run `node .claude/scripts/board.mjs show <KEY>`. It must be
   **In Review**. If not, stop and say which column it's in.
2. **Find the change set.** The ticket's `Started` comment (in the `show` output) names the base
   commit. The change set is `git diff <base>..HEAD`, plus the commit messages since the base.
3. **Review with fresh eyes.** Start two general-purpose subagents, not forks, side by side: one
   with `reviewers/code-reviewer.md` and one with `reviewers/accessibility.md` as its
   instructions. Give each the same inputs, and only these:
   - the story's heading in `docs/stories/`, with its acceptance criteria
   - the PRD's Non-Functional Requirements section
   - `CLAUDE.md`
   - the diff and the commit messages

   Not this conversation. If subagents aren't available, follow each reviewer file yourself, one
   after the other, reading only those inputs.
4. **Combine the verdicts.** The review is **CHANGES NEEDED** if either reviewer found anything
   blocking, and **APPROVE** only when both approve. Keep each reviewer's findings under its own
   heading, in order of severity, and merge the two `Criteria → tests` lists (a criterion marked
   weak or missing by either one counts as weak or missing).
5. **Save the review** to `docs/reviews/<key>-review.md` (key in lower case) with the combined
   verdict, each reviewer's findings, and the base commit reviewed.
6. **Decide.**
   - **Approve** (no blocking findings): move the ticket to **In QA**. Comment with the verdict and
     each non-blocking finding in one line.

     ```sh
     node .claude/scripts/board.mjs move <KEY> --from "In Review" --to "In QA" --as review
     node .claude/scripts/board.mjs comment <KEY> --as review --body - <<'EOF'
     <verdict, and each non-blocking finding in one line>
     EOF
     ```
   - **Changes needed:** move the ticket back to **In Progress**. Comment with each blocking
     finding: the file, the line, and what must change. The server needs this comment with the
     move (it becomes the to-do list), so pass it as `--comment -`.

     ```sh
     node .claude/scripts/board.mjs move <KEY> --from "In Review" --to "In Progress" --as review --comment - <<'EOF'
     <each blocking finding: the file, the line, and what must change>
     EOF
     ```

## Rules

- The review never edits code or tests. It only reads, writes the review file, and comments.
- If a board command exits with code 3, a person moved the ticket since you looked: stop work on
  that ticket, leave it where it is, report it, and never move it back.
- **Unattended** (run by `/implement`): ask nothing. The verdict decides the move.
