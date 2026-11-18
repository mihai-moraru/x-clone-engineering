# Backlog check

The stories come from the product owner. Before building anything, check they are complete and
linked. Read the files; never fix them. Anything broken goes back to the product owner.

Inputs: the PRD in `docs/prds/`, the epics file in `docs/epics/`, the stories files in
`docs/stories/`, and `docs/tracker/board-data.js`. If there's more than one slug, check the one
whose stories are on the board.

## Failures (stop the run)

1. A stories file whose first line doesn't link to an epic in the epics file.
2. A story missing from its epic's `**Stories:**` list, or a list entry pointing to a story that
   doesn't exist.
3. A **Must Have** requirement (`R1`, `R2`…) that no story lists in `**Covers:**`.
4. A `**Covers:**` ID that isn't in the PRD.
5. An epic or story heading without a `**Work Item:**` key, or the same key twice.
6. A key that isn't in `board-data.js`, or an item whose `status` isn't one of: New, In Progress,
   In Review, In QA, In Acceptance, Done.

## Warnings (list them, go on)

- A non-functional requirement (`NF1`…) that no story covers. These are constraints on every
  story, and the review checks them.
- A Nice to Have (`N1`…) that no story covers.

## Report

```
Backlog check: PASS | FAIL
Stories: <n> (<n> New, …) · Must Have covered: <n>/<n>
Failures:
- …
Warnings:
- …
```
