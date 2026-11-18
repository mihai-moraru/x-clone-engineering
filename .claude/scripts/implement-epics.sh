#!/usr/bin/env bash
# Run /implement for whole epics, unattended, one after another.
#
#   bash .claude/scripts/implement-epics.sh            epics 1, 2 and 4 (epic 3 is yours to run by hand)
#   bash .claude/scripts/implement-epics.sh 2 4        only these epics, in this order
#   bash .claude/scripts/implement-epics.sh --smoke    check the setup first (reads only, no ticket is touched)
#
# Each epic is one headless Claude Code run of "/implement --epic N" from the repository root. The
# skills do the work; this script only starts them, keeps a log, and stops at the first failure.
# Nothing is ever moved to Done: that stays your decision on the board.
#
# Settings (environment variables):
#   BUDGET=25     most dollars one epic may cost before its run stops (a rerun picks up where it stopped)
#   HEADLESS=1    no browser windows while the tests run; HEADLESS=0 to watch them
#   MODEL=        a model for the runs (for example: sonnet, opus); empty = your default
#   LOG_DIR=/tmp/xc-factory
#
# Run it ONE at a time, and not while you run /implement yourself: the runs share one working tree,
# one dev server, one saved sign-in, one board and one test-results folder.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT" || exit 1

# A laptop that goes to sleep stops the run: keep it awake (macOS) for as long as this script runs.
if [ -z "${XC_AWAKE:-}" ] && command -v caffeinate >/dev/null 2>&1; then
  XC_AWAKE=1 exec caffeinate -i bash "${BASH_SOURCE[0]}" "$@"
fi

BUDGET="${BUDGET:-25}"
LOG_DIR="${LOG_DIR:-/tmp/xc-factory}"
export HEADLESS="${HEADLESS:-1}"
BOARD=(node .claude/scripts/board.mjs)

SMOKE=0
EPICS=()
for arg in "$@"; do
  case "$arg" in
    --smoke) SMOKE=1 ;;
    -h|--help) sed -n '2,22p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    [0-9]*) EPICS+=("$arg") ;;
    *) echo "Unknown argument: $arg (try --help)" >&2; exit 1 ;;
  esac
done
[ ${#EPICS[@]} -eq 0 ] && EPICS=(1 2 4)

die() { echo "x $*" >&2; exit 1; }

# ---------------------------------------------------------------- what the headless runs may do
# Nobody can answer a permission prompt in a headless run, so anything not listed here is denied
# (the skill then comments "Needs a person" and moves on). File edits come from acceptEdits.
# No git push, reset, checkout or stash, no pnpm add or install, no rm.
ALLOWED=(
  "Skill" "Agent"
  "Bash(node *board.mjs *)"
  "Bash(pnpm lint)" "Bash(pnpm build)" "Bash(pnpm test *)" "Bash(pnpm e2e *)" "Bash(pnpm e2e:evidence *)" "Bash(pnpm exec *)"
  "Bash(git status *)" "Bash(git diff *)" "Bash(git log *)" "Bash(git show *)" "Bash(git rev-parse *)"
  "Bash(git add *)" "Bash(git commit *)"
  "Bash(curl * http://localhost:*)" "Bash(curl http://localhost:*)"
  "Bash(cd *)"
)
ALLOWED_CSV="$(IFS=,; echo "${ALLOWED[*]}")"

# Told to every headless run. A command chained with ; or && or ||, a subshell, or an echo of $? is
# not matched by the allowlist above and is denied, which would stop a run at its first check.
UNATTENDED_NOTE='This is an unattended run: nobody can answer a permission prompt, so any command that needs one is denied. Run every shell command as its own plain command. Do not chain commands with ; && || or pipes, do not use subshells, and do not print exit codes with echo or $?. To work in another folder, run cd as its own command first: the shell stays there, so cd back to the repository root before you run the board CLI. If a command is denied, run it again in a simpler form before you give up on the step.'

# One headless run. The raw stream goes to $1 (the log); a short readable version goes to the screen.
FORMAT_JS='
import readline from "node:readline"
const clip = (s, n) => { s = String(s).replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s }
let failed = false
for await (const line of readline.createInterface({ input: process.stdin })) {
  let m
  try { m = JSON.parse(line) } catch { if (line.trim()) console.log(line); continue }
  if (m.type === "system" && m.subtype === "init") console.log(`  session ${m.session_id} (${m.model})`)
  else if (m.type === "assistant" && !m.parent_tool_use_id) {
    for (const b of m.message?.content ?? []) {
      if (b.type === "text" && b.text.trim()) console.log(`  ${clip(b.text, 220)}`)
      else if (b.type === "tool_use") console.log(`    > ${b.name}${b.input?.command ? ": " + clip(b.input.command, 110) : b.input?.skill ? ": " + b.input.skill + " " + (b.input.args ?? "") : ""}`)
    }
  } else if (m.type === "result") {
    failed = Boolean(m.is_error) || (m.subtype && m.subtype !== "success")
    console.log(`  result: ${m.subtype}${m.is_error ? " (error)" : ""} | turns ${m.num_turns} | $${Number(m.total_cost_usd ?? 0).toFixed(2)}`)
    for (const d of m.permission_denials ?? []) console.log(`  DENIED ${d.tool_name}: ${clip(JSON.stringify(d.tool_input), 160)}`)
    if (m.result) console.log(`  ${clip(m.result, 600)}`)
  }
}
process.exit(failed ? 1 : 0)
'

run_claude() { # $1 = log file, $2 = prompt
  local extra=()
  [ -n "${MODEL:-}" ] && extra+=(--model "$MODEL")
  claude -p "$2" \
    --permission-mode acceptEdits --permission-prompts none \
    --allowedTools "$ALLOWED_CSV" \
    --append-system-prompt "$UNATTENDED_NOTE" \
    --max-budget-usd "$BUDGET" \
    --output-format stream-json --verbose \
    ${extra[@]+"${extra[@]}"} </dev/null 2>&1 \
    | tee "$1" | node --input-type=module -e "$FORMAT_JS"
  local st=("${PIPESTATUS[@]}")
  # claude's own exit code first, then the formatter's (it saw an error result)
  [ "${st[0]}" -ne 0 ] && return "${st[0]}"
  return "${st[2]}"
}

# ---------------------------------------------------------------- checks before anything runs
command -v claude >/dev/null 2>&1 || die "claude is not on your PATH."
command -v node >/dev/null 2>&1 || die "node is not on your PATH."
"${BOARD[@]}" health >/dev/null 2>&1 || die "The board isn't answering. Start it in its own terminal: cd src/frontend && pnpm board"
curl -s -o /dev/null -m 5 http://localhost:5173 || die "The dev server isn't answering on :5173. Start it in its own terminal: cd src/frontend && pnpm dev"
[ -f src/frontend/e2e/.auth/user.json ] || die "No saved sign-in. Run: cd src/frontend && pnpm e2e:login"
mkdir -p "$LOG_DIR"

if [ "$SMOKE" -eq 1 ]; then
  echo "Smoke test: /implement --epic 99 (there is no epic 99). It runs the whole preflight, then stops: no ticket is touched."
  run_claude "$LOG_DIR/smoke.log" "/implement --epic 99"
  rc=$?
  echo "log: $LOG_DIR/smoke.log (exit $rc)"
  exit "$rc"
fi

echo "Epics: ${EPICS[*]} | budget per epic: \$$BUDGET | headless browser: $HEADLESS | logs: $LOG_DIR"
echo "Board: $("${BOARD[@]}" url)"
echo "Starting at $(date '+%H:%M')."

for n in "${EPICS[@]}"; do
  echo
  echo "=== Epic $n ($(date '+%H:%M')) ==="
  # Epic N is the Nth epic on the board, the same rule /implement uses.
  key="$("${BOARD[@]}" list --type Epic | sed -n "${n}p" | cut -f1)"
  if [ -z "$key" ]; then
    echo "x There is no epic $n on the board." >&2
    exit 1
  fi
  run_claude "$LOG_DIR/epic-$n.log" "/implement --epic $n"
  rc=$?
  if [ "$rc" -ne 0 ]; then
    echo
    echo "x Epic $n stopped (exit $rc). Log: $LOG_DIR/epic-$n.log"
    echo "  Fix what it names, then run again: stories already in In Acceptance are skipped."
    "${BOARD[@]}" list --type Story
    exit "$rc"
  fi
  # A run can end "successfully" without building anything (a preflight that stopped, for example),
  # so check the board: every story of this epic must be in In Acceptance or Done.
  left="$("${BOARD[@]}" list --parent "$key" | awk -F'\t' '$3 != "In Acceptance" && $3 != "Done" { print "  " $1 " is " $3 ": " $5 }')"
  if [ -n "$left" ]; then
    echo
    echo "x Epic $n ended, but not every story reached In Acceptance:"
    echo "$left"
    echo "  Log: $LOG_DIR/epic-$n.log (a story sent back twice carries a 'Needs a person' comment on the board)"
    exit 1
  fi
done

echo
echo "=== Done ($(date '+%H:%M')) ==="
"${BOARD[@]}" list --type Story
echo
echo "Next: watch the evidence videos at $("${BOARD[@]}" url) and accept (or send back) each story in In Acceptance."
