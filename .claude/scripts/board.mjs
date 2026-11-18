#!/usr/bin/env node
/**
 * Board CLI: the one way the skills read and change the board.
 *
 *   node .claude/scripts/board.mjs <command> [options]     (run from the repository root)
 *   node .claude/scripts/board.mjs --help                  every command, flag and exit code
 *
 * It wraps the board server's HTTP API (board-server.mjs). The server decides who may move what;
 * this CLI only sends the role and shows the server's message. Plain Node, no dependencies.
 */
import fs from "node:fs"
import path from "node:path"
import { parseArgs } from "node:util"

const STATUSES = ["New", "In Progress", "In Review", "In QA", "In Acceptance", "Done"]
const TYPES = ["Story", "Epic"]
const RESULTS = ["pass", "fail"]
const ATTACHMENT_TYPES = ["video", "image", "link"]
const DEFAULT_PORT = 4000
const DEFAULT_MIN_BYTES = 204800
const REQUEST_TIMEOUT_MS = 60_000

// --as picks the role the server needs for a move and the role label shown on a comment.
const ROLES = {
  dev: { move: "Developer", comment: "AI Dev" },
  review: { move: "QA", comment: "AI Review" },
  qa: { move: "QA", comment: "AI QA" },
}

const OPTIONS = {
  port: { type: "string" },
  as: { type: "string" },
  author: { type: "string" },
  to: { type: "string" },
  from: { type: "string" },
  comment: { type: "string" },
  "comment-file": { type: "string" },
  body: { type: "string" },
  "body-file": { type: "string" },
  attach: { type: "string" },
  type: { type: "string" },
  label: { type: "string" },
  ac: { type: "string" },
  result: { type: "string" },
  name: { type: "string" },
  video: { type: "string" },
  "min-bytes": { type: "string" },
  status: { type: "string" },
  parent: { type: "string" },
  help: { type: "boolean", short: "h" },
}

const USAGE = `Board CLI. Run from the repository root:
  node .claude/scripts/board.mjs <command> [options]

Commands
  health                      Check the board server answers.
  url [KEY]                   Print the board link, or the link to one ticket.
  list [--status S] [--parent KEY] [--type Story|Epic]
                              One line per item, in board order, tab separated:
                              key, type, status, parent (empty for epics), title.
  show KEY                    The item as pretty JSON (title, status, source,
                              acceptanceCriteria, comments, ...).
  move KEY --to STATUS --from STATUS --as ROLE
       [--comment TEXT | --comment-file PATH | --comment -]
                              Move a ticket. --from is the column you expect it to be in
                              now. The comment is the reason, required when pushing a
                              ticket back to In Progress. Epics cannot be moved.
  comment KEY --as ROLE (--body TEXT | --body-file PATH | --body -)
       [--attach PATH_OR_URL --type video|image|link --label TEXT --ac N --result pass|fail]
                              Post a comment with at most one attachment. --attach is a
                              repo-relative path that "upload" returned, or an http(s) URL.
                              --type defaults to video (.webm .mp4), image (.png .jpg .jpeg
                              .gif .webp) or link (everything else, and every URL).
                              --label, --ac and --result need --attach.
  upload KEY FILE [--name NAME]
                              Upload a file; it is saved under docs/qa/KEY/. Prints the
                              saved path. NAME defaults to the file's own name.
  evidence KEY --ac N --result pass|fail --video FILE
       (--body TEXT | --body-file PATH | --body -) [--min-bytes N]
                              Upload FILE as ac<N>.webm and post one QA comment with the
                              video attached. Refuses a missing file, or one under
                              --min-bytes (default ${DEFAULT_MIN_BYTES}): a tiny video is not evidence.
  help                        This text.

Common options
  --port N        Board server port. Else env BOARD_PORT, else "port" in .board-server.json
                  (searched from the current folder upwards), else ${DEFAULT_PORT}.
  --as ROLE       dev, review or qa (see the table below).
  --author NAME   Who is writing. Default: Claude.
  -h, --help      This text.

Text values: pass "-" to read all of stdin (use a heredoc for multi-line text), or use the
matching --...-file option. A value that starts with a dash, like "- fixed", works too.

Roles
  --as     sent when moving   sent on comments
  dev      Developer          AI Dev
  review   QA                 AI Review
  qa       QA                 AI QA

Statuses: ${STATUSES.join(", ")} (any letter case).

Exit codes
  0  ok
  1  bad usage, or the server refused the request (its message is printed as is)
  2  the board server does not answer: start it with "pnpm board" in src/frontend
  3  conflict: a person moved the ticket since you looked; stop, leave it, report it
`

class CliError extends Error {
  constructor(message, code = 1) {
    super(message)
    this.code = code
  }
}

// ---------------------------------------------------------------- arguments
// node:util parseArgs rejects "--body '- fixed'" (a value that starts with a dash). Join such a
// value to its flag as --body=- fixed, which it accepts. A lone "-" is already fine.
function joinDashValues(argv) {
  const out = []
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]
    const next = argv[i + 1]
    const name = /^--([a-z-]+)$/.exec(token)?.[1]
    const takesValue = name && OPTIONS[name]?.type === "string"
    const nextIsFlag = typeof next === "string" && next.startsWith("--") && OPTIONS[next.slice(2).split("=")[0]]
    if (takesValue && typeof next === "string" && next.startsWith("-") && next !== "-" && !nextIsFlag) {
      out.push(`${token}=${next}`)
      i++
    } else {
      out.push(token)
    }
  }
  return out
}

function parsePort(value, where) {
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1 || n > 65535) throw new CliError(`${where} must be a port number, got: ${value}`)
  return n
}

// .board-server.json sits at the repository root; look for it from the current folder upwards.
function portFromStateFile() {
  let dir = process.cwd()
  for (;;) {
    const file = path.join(dir, ".board-server.json")
    if (fs.existsSync(file)) {
      try {
        const port = JSON.parse(fs.readFileSync(file, "utf8")).port
        if (Number.isInteger(port)) return port
      } catch {
        // an unreadable state file counts as missing
      }
      return undefined
    }
    const parent = path.dirname(dir)
    if (parent === dir) return undefined
    dir = parent
  }
}

function resolvePort(values) {
  if (values.port !== undefined) return parsePort(values.port, "--port")
  if (process.env.BOARD_PORT) return parsePort(process.env.BOARD_PORT, "BOARD_PORT")
  return portFromStateFile() ?? DEFAULT_PORT
}

function status(value, flag) {
  if (value === undefined) throw new CliError(`${flag} is required (one of: ${STATUSES.join(", ")}).`)
  const found = STATUSES.find((s) => s.toLowerCase() === String(value).trim().toLowerCase())
  if (!found) throw new CliError(`${flag} must be one of: ${STATUSES.join(", ")}. Got: ${value}`)
  return found
}

function role(values) {
  const found = ROLES[values.as]
  if (!found) throw new CliError(`--as is required and must be one of: ${Object.keys(ROLES).join(", ")}.`)
  return found
}

function oneOf(value, allowed, flag) {
  const found = allowed.find((a) => a.toLowerCase() === String(value).trim().toLowerCase())
  if (!found) throw new CliError(`${flag} must be one of: ${allowed.join(", ")}. Got: ${value}`)
  return found
}

function positiveInt(value, flag) {
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1) throw new CliError(`${flag} must be a whole number of 1 or more. Got: ${value}`)
  return n
}

function needKey(positionals, command) {
  const key = positionals[0]
  if (!key) throw new CliError(`${command} needs a ticket key, for example: ${command} XC-5`)
  return key
}

// Text from --name, --name-file, or stdin when the value is "-".
function readText(values, name, required) {
  const inline = values[name]
  const file = values[`${name}-file`]
  if (inline !== undefined && file !== undefined) throw new CliError(`Use only one of --${name} and --${name}-file.`)
  if (inline === undefined && file === undefined) {
    if (required) throw new CliError(`--${name} (or --${name}-file, or --${name} -) is required.`)
    return undefined
  }
  if (inline === "-" || file === "-") return fs.readFileSync(0, "utf8")
  if (inline !== undefined) return inline
  try {
    return fs.readFileSync(file, "utf8")
  } catch (err) {
    throw new CliError(`Cannot read --${name}-file ${file}: ${err.message}`)
  }
}

// ---------------------------------------------------------------- server
async function request(port, method, route, { json, raw } = {}) {
  const headers = {}
  let body
  if (json !== undefined) {
    headers["Content-Type"] = "application/json"
    body = JSON.stringify(json)
  } else if (raw !== undefined) {
    headers["Content-Type"] = "application/octet-stream"
    body = raw
  }
  let res
  try {
    res = await fetch(`http://127.0.0.1:${port}${route}`, { method, headers, body, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
  } catch {
    throw new CliError(
      `The board server doesn't answer on port ${port}. Ask the person to start it with "pnpm board" in src/frontend, in its own terminal, then try again.`,
      2,
    )
  }
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    // not JSON: fall through to the status code
  }
  if (res.ok) return data
  const message = data?.error ?? `The board server answered HTTP ${res.status}`
  if (res.status === 409) {
    throw new CliError(
      `${message}\nA person moved this ticket since you looked. Stop work on it, leave it where it is, report it, and never move it back.`,
      3,
    )
  }
  throw new CliError(message, 1)
}

async function readBoard(port) {
  const board = await request(port, "GET", "/api/board")
  return Array.isArray(board?.items) ? board.items : []
}

const link = (port, key) => `http://localhost:${port}/${key ? `#${key}` : ""}`
const out = (line) => process.stdout.write(`${line}\n`)

// ---------------------------------------------------------------- commands
const COMMANDS = {
  async health({ values }) {
    const port = resolvePort(values)
    const data = await request(port, "GET", "/api/health")
    const actual = data?.port ?? port
    out(`board ok on port ${actual} (http://localhost:${actual})`)
  },

  async url({ values, positionals }) {
    out(link(resolvePort(values), positionals[0]))
  },

  async list({ values }) {
    const port = resolvePort(values)
    const wantStatus = values.status === undefined ? undefined : status(values.status, "--status")
    const wantType = values.type === undefined ? undefined : oneOf(values.type, TYPES, "--type")
    for (const item of await readBoard(port)) {
      if (wantStatus && item.status !== wantStatus) continue
      if (values.parent !== undefined && item.parent !== values.parent) continue
      if (wantType && item.type !== wantType) continue
      const title = String(item.title ?? "").replace(/\s+/g, " ")
      out([item.key, item.type, item.status, item.parent ?? "", title].join("\t"))
    }
  },

  async show({ values, positionals }) {
    const key = needKey(positionals, "show")
    const item = (await readBoard(resolvePort(values))).find((i) => i.key === key)
    if (!item) throw new CliError(`No item ${key} on the board`)
    out(JSON.stringify(item, null, 2))
  },

  async move({ values, positionals }) {
    const key = needKey(positionals, "move")
    const to = status(values.to, "--to")
    const from = status(values.from, "--from")
    const who = role(values)
    const reason = readText(values, "comment", false)
    const port = resolvePort(values)
    await request(port, "POST", `/api/items/${key}/status`, {
      json: { status: to, from, role: who.move, author: values.author ?? "Claude", ...(reason ? { comment: reason } : {}) },
    })
    out(`${key}: ${from} -> ${to}`)
  },

  async comment({ values, positionals }) {
    const key = needKey(positionals, "comment")
    const who = role(values)
    const body = readText(values, "body", true)
    const attach = values.attach
    if (attach === undefined && (values.type !== undefined || values.label !== undefined || values.ac !== undefined || values.result !== undefined)) {
      throw new CliError("--type, --label, --ac and --result only go with --attach.")
    }
    const payload = { author: values.author ?? "Claude", role: who.comment, body }
    if (attach !== undefined) payload.attachments = [attachment(attach, values)]
    await request(resolvePort(values), "POST", `/api/items/${key}/comments`, { json: payload })
    out(`commented on ${key}`)
  },

  async upload({ values, positionals }) {
    const key = needKey(positionals, "upload")
    const file = positionals[1]
    if (!file) throw new CliError("upload needs a file, for example: upload XC-5 test-results/video.webm")
    const saved = await uploadFile(resolvePort(values), key, file, values.name ?? path.basename(file))
    out(saved)
  },

  async evidence({ values, positionals }) {
    const key = needKey(positionals, "evidence")
    const ac = positiveInt(values.ac, "--ac")
    const result = oneOf(values.result ?? "", RESULTS, "--result")
    if (values.video === undefined) throw new CliError("--video FILE is required.")
    const minBytes = values["min-bytes"] === undefined ? DEFAULT_MIN_BYTES : Number(values["min-bytes"])
    if (!Number.isInteger(minBytes) || minBytes < 0) throw new CliError(`--min-bytes must be a whole number. Got: ${values["min-bytes"]}`)
    const body = readText(values, "body", true)
    let size
    try {
      size = fs.statSync(values.video).size
    } catch {
      throw new CliError(`No video at ${values.video}: nothing to attach, so there is no evidence.`)
    }
    if (size < minBytes) {
      throw new CliError(`${values.video} is only ${size} bytes (the minimum is ${minBytes}): too small to be real evidence, so nothing was posted.`)
    }
    const port = resolvePort(values)
    const saved = await uploadFile(port, key, values.video, `ac${ac}.webm`)
    await request(port, "POST", `/api/items/${key}/comments`, {
      json: {
        author: values.author ?? "Claude",
        role: ROLES.qa.comment,
        body,
        attachments: [{ type: "video", path: saved, label: `AC${ac}`, ac, result }],
      },
    })
    out(saved)
  },
}

function attachment(ref, values) {
  const isUrl = /^https?:\/\//i.test(ref)
  let type
  if (values.type !== undefined) {
    type = oneOf(values.type, ATTACHMENT_TYPES, "--type")
  } else if (isUrl) {
    type = "link"
  } else {
    const ext = path.extname(ref).toLowerCase()
    type = [".webm", ".mp4"].includes(ext) ? "video" : [".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext) ? "image" : "link"
  }
  const item = { type, path: ref }
  if (values.label !== undefined) item.label = values.label
  if (values.ac !== undefined) item.ac = positiveInt(values.ac, "--ac")
  if (values.result !== undefined) item.result = oneOf(values.result, RESULTS, "--result")
  return item
}

async function uploadFile(port, key, file, name) {
  let data
  try {
    data = fs.readFileSync(file)
  } catch (err) {
    throw new CliError(`Cannot read ${file}: ${err.message}`)
  }
  const saved = await request(port, "POST", `/api/items/${key}/attachments?name=${encodeURIComponent(name)}`, { raw: data })
  return saved.path
}

// ---------------------------------------------------------------- main
async function main(argv) {
  let parsed
  try {
    parsed = parseArgs({ args: joinDashValues(argv), options: OPTIONS, allowPositionals: true, strict: true })
  } catch (err) {
    throw new CliError(`${err.message}\n\n${USAGE}`)
  }
  const { values, positionals } = parsed
  const [command, ...rest] = positionals
  if (values.help || command === "help") {
    process.stdout.write(USAGE)
    return
  }
  if (!command) throw new CliError(USAGE)
  const run = Object.hasOwn(COMMANDS, command) ? COMMANDS[command] : undefined
  if (!run) throw new CliError(`Unknown command: ${command}\n\n${USAGE}`)
  await run({ values, positionals: rest })
}

try {
  await main(process.argv.slice(2))
} catch (err) {
  if (!(err instanceof CliError)) throw err
  process.stderr.write(`${err.message.trimEnd()}\n`)
  process.exitCode = err.code
}
