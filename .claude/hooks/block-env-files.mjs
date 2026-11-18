#!/usr/bin/env node
// PreToolUse hook: stop Claude from reading secret env files (.env, .env.local,
// .env.production, any other .env.*), while still allowing the safe template .env.example.
//
// Registered in .claude/settings.json for the Read, Grep and Bash tools. Claude Code sends the
// tool call as JSON on stdin; exiting with code 2 blocks the call and hands stderr to Claude as
// the reason. Exit 0 lets the call continue through the normal permission flow.
//
// Plain Node with no dependencies and no shell, so it runs the same on macOS, Linux and Windows.

const ALLOWED = new Set([".env.example"])

/** The last path segment, whichever separator the OS uses. */
function baseName(value) {
  return String(value).split(/[\\/]/).pop() ?? ""
}

/** True for `.env`, `.env.<anything>` and wildcards that could expand to them (`.env*`). */
function isSecretEnvName(name) {
  const lower = name.toLowerCase()
  if (ALLOWED.has(lower)) return false
  return /^\.env($|[.*?[{])/.test(lower)
}

function isSecretEnvPath(value) {
  return typeof value === "string" && isSecretEnvName(baseName(value))
}

/** Split a shell command into rough words, so `cat ./.env`, `--env-file=.env` and `$(<.env)` are all seen. */
function commandWords(command) {
  return String(command)
    .split(/[\s;|&<>()"'`=,:]+/)
    .filter(Boolean)
}

/** Returns the offending file name, or null when the call is fine. */
function findSecret(toolName, input) {
  if (toolName === "Read") {
    return isSecretEnvPath(input.file_path) ? baseName(input.file_path) : null
  }
  if (toolName === "Grep") {
    if (isSecretEnvPath(input.path)) return baseName(input.path)
    if (isSecretEnvPath(input.glob)) return baseName(input.glob)
    return null
  }
  if (toolName === "Bash") {
    const hit = commandWords(input.command ?? "").find(isSecretEnvPath)
    return hit ? baseName(hit) : null
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

const secret = findSecret(call.tool_name, call.tool_input ?? {})

if (secret) {
  process.stderr.write(
    `Blocked by .claude/hooks/block-env-files.mjs: "${secret}" is a secret env file and may hold ` +
      `credentials, so Claude must not read it. Use .env.example to see which variables exist, ` +
      `or ask the user for the specific value you need.\n`,
  )
  process.exit(2)
}

process.exit(0)
