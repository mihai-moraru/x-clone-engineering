#!/usr/bin/env node
// PreToolUse hook: stop Claude from hand-editing lockfiles (pnpm-lock.yaml, ...) and generated
// files (routeTree.gen.ts, any *.gen.ts), which are owned by the tools that write them.
//
// Registered in .claude/settings.json for the Edit, Write and NotebookEdit tools. Claude Code
// sends the tool call as JSON on stdin; exiting with code 2 blocks the call and hands stderr to
// Claude as the reason. Exit 0 lets the call continue through the normal permission flow.
//
// Bash is deliberately not matched: `pnpm install` and `pnpm dev` are how these files are meant
// to change.
//
// Plain Node with no dependencies and no shell, so it runs the same on macOS, Linux and Windows.

const LOCKFILES = new Set([
  "pnpm-lock.yaml",
  "package-lock.json",
  "npm-shrinkwrap.json",
  "yarn.lock",
  "bun.lock",
  "bun.lockb",
])

// routeTree.gen.ts and anything else following the `<name>.gen.<js|ts|jsx|tsx|mjs|cjs|mts|cts>` convention.
const GENERATED = /\.gen\.[cm]?[jt]sx?$/

/** The last path segment, whichever separator the OS uses. */
function baseName(value) {
  return String(value).split(/[\\/]/).pop() ?? ""
}

/** Returns the reason this file must not be edited by hand, or null when it is fine. */
function protectionReason(filePath) {
  if (typeof filePath !== "string" || filePath === "") return null
  const name = baseName(filePath).toLowerCase()

  if (LOCKFILES.has(name)) {
    return (
      `"${baseName(filePath)}" is a lockfile, written by the package manager and never edited by hand. ` +
      `Change package.json and run the package manager (pnpm install, pnpm add, pnpm remove) to update it.`
    )
  }
  if (GENERATED.test(name)) {
    return (
      `"${baseName(filePath)}" is a generated file, so a manual edit would be overwritten the next time it is ` +
      `regenerated. Change its source instead (for routeTree.gen.ts: the files under src/frontend/src/routes/) ` +
      `and let pnpm dev or pnpm build regenerate it.`
    )
  }
  return null
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
const reason = protectionReason(input.file_path) ?? protectionReason(input.notebook_path)

if (reason) {
  process.stderr.write(`Blocked by .claude/hooks/block-generated-files.mjs: ${reason}\n`)
  process.exit(2)
}

process.exit(0)
