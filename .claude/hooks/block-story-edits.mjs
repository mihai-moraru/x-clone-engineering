#!/usr/bin/env node
// PreToolUse hook: stop Claude from editing the product owner's text. The stories, epics, PRD and
// hand-off record under docs/ belong to the product owner. A story that looks wrong or missing is a
// question for them, not an edit here.
//
// Registered in .claude/settings.json for the Edit, Write and NotebookEdit tools. Claude Code
// sends the tool call as JSON on stdin; exiting with code 2 blocks the call and hands stderr to
// Claude as the reason. Exit 0 lets the call continue through the normal permission flow.
//
// Only these folders are protected. docs/reviews/, docs/qa/ and docs/tracker/ are written by the
// skills and the board server, so they stay open. Bash is not matched, like the other guards.
//
// Plain Node with no dependencies and no shell, so it runs the same on macOS, Linux and Windows.

import path from "node:path"

const PROTECTED = ["stories", "epics", "prds", "handoff"]

/** Returns the protected folder this path is in (for example "docs/stories"), or null. */
function protectedFolder(filePath) {
  if (typeof filePath !== "string" || filePath === "") return null
  // One separator style, and no "a/../b" tricks, before matching.
  const clean = path.posix.normalize(filePath.replace(/\\/g, "/"))
  const match = new RegExp(`(^|/)docs/(${PROTECTED.join("|")})/`).exec(clean)
  return match ? `docs/${match[2]}` : null
}

function readStdin() {
  return new Promise((resolve) => {
    let data = ""
    process.stdin.setEncoding("utf8")
    process.stdin.on("data", (chunk) => (data += chunk))
    process.stdin.on("end", () => resolve(data))
    process.stdin.on("error", () => resolve(data))
  })
}

const raw = await readStdin()

let call
try {
  call = JSON.parse(raw)
} catch {
  // Not the input we expect: don't get in the way of unrelated tool calls.
  process.exit(0)
}

const input = call.tool_input ?? {}
// Edit and Write send `file_path`; NotebookEdit sends `notebook_path`.
const target = input.file_path ?? input.notebook_path
const folder = protectedFolder(target)

if (folder) {
  process.stderr.write(
    `Blocked by .claude/hooks/block-story-edits.mjs: "${target}" is in ${folder}/, which holds the product ` +
      `owner's text (stories, epics, PRD, hand-off). Never edit it. If a story looks wrong or something is ` +
      `missing, say so in a board comment and leave it to the product owner.\n`,
  )
  process.exit(2)
}

process.exit(0)
