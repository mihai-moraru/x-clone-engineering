// Tests for board.mjs. Run from the repository root:
//   node --test '.claude/scripts/*.test.mjs'
//
// Every test talks to a throwaway board server (its own temp folder, its own port), never to the
// real board. Each CLI call passes --port or runs inside the temp folder, and BOARD_PORT is cleared.
import { test, before, after } from "node:test"
import assert from "node:assert/strict"
import { spawn, spawnSync } from "node:child_process"
import fs from "node:fs"
import net from "node:net"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const HERE = path.dirname(fileURLToPath(import.meta.url))
const CLI = path.join(HERE, "board.mjs")
const SERVER = path.join(HERE, "..", "..", "board-server.mjs")

let root
let port
let server

const board = {
  items: [
    { key: "XC-1", type: "Epic", title: "Epic one", status: "In Progress", parent: null, acceptanceCriteria: [] },
    {
      key: "XC-2",
      type: "Story",
      title: "Story in review",
      status: "In Review",
      parent: "XC-1",
      source: "docs/stories/x.md#a",
      acceptanceCriteria: ["It works.", "It fails safely."],
    },
    {
      key: "XC-3",
      type: "Story",
      title: "Story in QA",
      status: "In QA",
      parent: "XC-1",
      source: "docs/stories/x.md#b",
      acceptanceCriteria: ["It shows a message."],
    },
  ],
}

function resetBoard() {
  fs.mkdirSync(path.join(root, "docs", "tracker"), { recursive: true })
  fs.writeFileSync(path.join(root, "docs", "tracker", "board-data.js"), `window.BOARD = ${JSON.stringify(board, null, 2)};\n`)
  fs.rmSync(path.join(root, "docs", "qa"), { recursive: true, force: true })
}

function readBoard() {
  const text = fs.readFileSync(path.join(root, "docs", "tracker", "board-data.js"), "utf8")
  return JSON.parse(text.replace(/^window\.BOARD = /, "").replace(/;\s*$/, ""))
}

function item(key) {
  return readBoard().items.find((i) => i.key === key)
}

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer()
    s.once("error", reject)
    s.listen(0, "127.0.0.1", () => {
      const { port: p } = s.address()
      s.close(() => resolve(p))
    })
  })
}

// cwd is the temp folder, so a missing --port can never find the real .board-server.json.
function cli(args, { input, env = {}, cwd = root } = {}) {
  const clean = { ...process.env }
  delete clean.BOARD_PORT
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd, input, encoding: "utf8", env: { ...clean, ...env } })
  return { code: r.status, out: r.stdout, err: r.stderr }
}

const p = () => ["--port", String(port)]

before(async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "board-cli-test-"))
  resetBoard()
  port = await freePort()
  server = spawn(process.execPath, [SERVER, "--root", root, "--port", String(port)], { stdio: ["ignore", "pipe", "pipe"] })
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("the test board server did not start")), 10_000)
    server.stdout.on("data", (chunk) => {
      const m = /Board: http:\/\/localhost:(\d+)/.exec(String(chunk))
      if (m) {
        port = Number(m[1])
        clearTimeout(timer)
        resolve()
      }
    })
    server.once("exit", (code) => reject(new Error(`the test board server exited with ${code}`)))
  })
})

after(() => {
  server?.kill()
  if (root) fs.rmSync(root, { recursive: true, force: true })
})

test("help documents every command and flag, and exits 0", () => {
  for (const args of [["help"], ["--help"]]) {
    const r = cli(args)
    assert.equal(r.code, 0)
    for (const word of ["health", "url", "list", "show", "move", "comment", "upload", "evidence"]) assert.match(r.out, new RegExp(`\\b${word}\\b`))
    for (const flag of ["--port", "--as", "--author", "--to", "--from", "--comment", "--comment-file", "--body", "--body-file", "--attach", "--type", "--label", "--ac", "--result", "--name", "--video", "--min-bytes", "--status", "--parent"]) {
      assert.ok(r.out.includes(flag), `help mentions ${flag}`)
    }
    assert.match(r.out, /AI Review/)
    assert.match(r.out, /Exit codes/)
  }
})

test("no command or an unknown command: usage on stderr, exit 1", () => {
  for (const args of [[], ["frobnicate"]]) {
    const r = cli(args)
    assert.equal(r.code, 1)
    assert.equal(r.out, "")
    assert.match(r.err, /Commands/)
  }
})

test("health and url", () => {
  assert.equal(cli(["health", ...p()]).out, `board ok on port ${port} (http://localhost:${port})\n`)
  assert.equal(cli(["url", ...p()]).out, `http://localhost:${port}/\n`)
  assert.equal(cli(["url", "XC-5", ...p()]).out, `http://localhost:${port}/#XC-5\n`)
})

test("list: board order, tab separated, with filters", () => {
  const all = cli(["list", ...p()])
  assert.equal(all.code, 0)
  assert.deepEqual(all.out.trimEnd().split("\n"), [
    "XC-1\tEpic\tIn Progress\t\tEpic one",
    "XC-2\tStory\tIn Review\tXC-1\tStory in review",
    "XC-3\tStory\tIn QA\tXC-1\tStory in QA",
  ])
  assert.equal(cli(["list", "--type", "Epic", ...p()]).out, "XC-1\tEpic\tIn Progress\t\tEpic one\n")
  assert.equal(cli(["list", "--status", "in qa", ...p()]).out, "XC-3\tStory\tIn QA\tXC-1\tStory in QA\n")
  assert.equal(cli(["list", "--parent", "XC-1", "--type", "Story", ...p()]).out.trimEnd().split("\n").length, 2)
  assert.equal(cli(["list", "--status", "Nope", ...p()]).code, 1)
})

test("show prints the item as JSON; an unknown key exits 1", () => {
  const r = cli(["show", "XC-2", ...p()])
  assert.equal(r.code, 0)
  const data = JSON.parse(r.out)
  assert.equal(data.status, "In Review")
  assert.deepEqual(data.acceptanceCriteria, ["It works.", "It fails safely."])
  const missing = cli(["show", "XC-99", ...p()])
  assert.equal(missing.code, 1)
  assert.match(missing.err, /No item XC-99/)
})

test("move: prints the move, the server records it", () => {
  resetBoard()
  const r = cli(["move", "XC-2", "--from", "In Review", "--to", "in qa", "--as", "review", ...p()])
  assert.equal(r.code, 0)
  assert.equal(r.out, "XC-2: In Review -> In QA\n")
  assert.equal(item("XC-2").status, "In QA")
})

test("move: a refused move exits 1 with the server's message", () => {
  resetBoard()
  const r = cli(["move", "XC-2", "--from", "In Review", "--to", "In QA", "--as", "dev", ...p()])
  assert.equal(r.code, 1)
  assert.match(r.err, /Developer can't move XC-2 from In Review to In QA/)
  assert.equal(item("XC-2").status, "In Review")
})

test("move: an epic cannot be moved", () => {
  const r = cli(["move", "XC-1", "--from", "In Progress", "--to", "New", "--as", "dev", ...p()])
  assert.equal(r.code, 1)
  assert.match(r.err, /is an epic/)
})

test("move: an unknown key exits 1", () => {
  const r = cli(["move", "XC-99", "--from", "New", "--to", "In Progress", "--as", "dev", ...p()])
  assert.equal(r.code, 1)
  assert.match(r.err, /No item XC-99/)
})

test("move: a --from mismatch is a conflict, exit 3", () => {
  resetBoard()
  const r = cli(["move", "XC-2", "--from", "In QA", "--to", "In Acceptance", "--as", "qa", ...p()])
  assert.equal(r.code, 3)
  assert.match(r.err, /someone moved it/)
  assert.match(r.err, /never move it back/)
  assert.equal(item("XC-2").status, "In Review")
})

test("move: usage errors exit 1 before any request", () => {
  assert.equal(cli(["move", "XC-2", "--to", "In QA", "--as", "qa", ...p()]).code, 1) // no --from
  assert.equal(cli(["move", "XC-2", "--from", "In Review", "--as", "qa", ...p()]).code, 1) // no --to
  assert.equal(cli(["move", "XC-2", "--from", "In Review", "--to", "In QA", ...p()]).code, 1) // no --as
  assert.equal(cli(["move", "XC-2", "--from", "In Review", "--to", "In QA", "--as", "boss", ...p()]).code, 1)
  assert.equal(cli(["move", "--from", "In Review", "--to", "In QA", "--as", "qa", ...p()]).code, 1) // no key
})

test("move: a push back to In Progress needs a reason; stdin works; the reason is saved as a comment", () => {
  resetBoard()
  const refused = cli(["move", "XC-3", "--from", "In QA", "--to", "In Progress", "--as", "qa", ...p()])
  assert.equal(refused.code, 1)
  assert.match(refused.err, /needs a comment/)
  assert.equal(item("XC-3").status, "In QA")

  const reason = "AC1 failed:\nexpected a message, got none"
  const ok = cli(["move", "XC-3", "--from", "In QA", "--to", "In Progress", "--as", "qa", "--comment", "-", ...p()], { input: reason })
  assert.equal(ok.code, 0)
  assert.equal(ok.out, "XC-3: In QA -> In Progress\n")
  const saved = item("XC-3")
  assert.equal(saved.status, "In Progress")
  assert.equal(saved.comments.at(-1).body, reason)
})

test("move: --comment-file and a reason that starts with a dash", () => {
  resetBoard()
  const file = path.join(root, "reason.txt")
  fs.writeFileSync(file, "from a file")
  assert.equal(cli(["move", "XC-3", "--from", "In QA", "--to", "In Progress", "--as", "qa", "--comment-file", file, ...p()]).code, 0)
  assert.equal(item("XC-3").comments.at(-1).body, "from a file")

  resetBoard()
  const dash = cli(["move", "XC-3", "--from", "In QA", "--to", "In Progress", "--as", "qa", "--comment", "- fixed the label", ...p()])
  assert.equal(dash.code, 0)
  assert.equal(item("XC-3").comments.at(-1).body, "- fixed the label")
})

test("comment: role comes from --as, the author defaults to Claude", () => {
  resetBoard()
  const r = cli(["comment", "XC-2", "--as", "review", "--body", "Looks fine", ...p()])
  assert.equal(r.code, 0)
  assert.equal(r.out, "commented on XC-2\n")
  const c = item("XC-2").comments.at(-1)
  assert.equal(c.author, "Claude")
  assert.equal(c.role, "AI Review")
  assert.equal(c.body, "Looks fine")
  const named = cli(["comment", "XC-2", "--as", "dev", "--author", "Ada", "--body", "hi", ...p()])
  assert.equal(named.code, 0)
  assert.equal(item("XC-2").comments.at(-1).author, "Ada")
  assert.equal(item("XC-2").comments.at(-1).role, "AI Dev")
})

test("comment: the body can come from stdin or a file; a body is required", () => {
  resetBoard()
  const body = 'line one\nline "two" with quotes'
  assert.equal(cli(["comment", "XC-2", "--as", "dev", "--body", "-", ...p()], { input: body }).code, 0)
  assert.equal(item("XC-2").comments.at(-1).body, body)
  assert.equal(cli(["comment", "XC-2", "--as", "dev", ...p()]).code, 1)
  assert.equal(cli(["comment", "XC-99", "--as", "dev", "--body", "x", ...p()]).code, 1)
})

test("comment: an attachment stores type, label, ac and result", () => {
  resetBoard()
  const r = cli(["comment", "XC-3", "--as", "qa", "--body", "AC1: pass", "--attach", "docs/qa/XC-3/ac1.webm", "--label", "AC1", "--ac", "1", "--result", "pass", ...p()])
  assert.equal(r.code, 0)
  const a = item("XC-3").comments.at(-1).attachments[0]
  assert.deepEqual(a, { type: "video", path: "docs/qa/XC-3/ac1.webm", label: "AC1", ac: 1, result: "pass" })

  const image = cli(["comment", "XC-3", "--as", "qa", "--body", "shot", "--attach", "docs/qa/XC-3/s.png", ...p()])
  assert.equal(image.code, 0)
  assert.equal(item("XC-3").comments.at(-1).attachments[0].type, "image")

  const url = cli(["comment", "XC-3", "--as", "qa", "--body", "see", "--attach", "https://example.com/x.webm", ...p()])
  assert.equal(url.code, 0)
  const u = item("XC-3").comments.at(-1).attachments[0]
  assert.equal(u.type, "link")
  assert.equal(u.url, "https://example.com/x.webm")
})

test("comment: attachment flags without --attach, and a bad result, exit 1", () => {
  assert.equal(cli(["comment", "XC-3", "--as", "qa", "--body", "x", "--ac", "1", ...p()]).code, 1)
  assert.equal(cli(["comment", "XC-3", "--as", "qa", "--body", "x", "--attach", "docs/qa/a.webm", "--result", "maybe", ...p()]).code, 1)
})

test("upload lands under docs/qa/<KEY>/ and prints the saved path", () => {
  resetBoard()
  const file = path.join(root, "clip.webm")
  fs.writeFileSync(file, Buffer.alloc(1000, 1))
  const r = cli(["upload", "XC-3", file, ...p()])
  assert.equal(r.code, 0)
  assert.equal(r.out, "docs/qa/XC-3/clip.webm\n")
  assert.equal(fs.statSync(path.join(root, "docs", "qa", "XC-3", "clip.webm")).size, 1000)

  const renamed = cli(["upload", "XC-3", file, "--name", "ac2.webm", ...p()])
  assert.equal(renamed.out, "docs/qa/XC-3/ac2.webm\n")
  assert.equal(cli(["upload", "XC-3", path.join(root, "missing.webm"), ...p()]).code, 1)
  assert.equal(cli(["upload", "XC-99", file, ...p()]).code, 1)
})

test("evidence refuses a missing or small file and posts nothing", () => {
  resetBoard()
  const small = path.join(root, "small.webm")
  fs.writeFileSync(small, Buffer.alloc(1000, 1))
  const tooSmall = cli(["evidence", "XC-3", "--ac", "1", "--result", "pass", "--video", small, "--body", "AC1: pass", ...p()])
  assert.equal(tooSmall.code, 1)
  assert.match(tooSmall.err, /too small/)
  const missing = cli(["evidence", "XC-3", "--ac", "1", "--result", "pass", "--video", path.join(root, "nope.webm"), "--body", "x", ...p()])
  assert.equal(missing.code, 1)
  assert.equal(item("XC-3").comments, undefined)
  assert.equal(fs.existsSync(path.join(root, "docs", "qa")), false)
})

test("evidence uploads as ac<N>.webm and posts the QA comment with the video attached", () => {
  resetBoard()
  const big = path.join(root, "big.webm")
  fs.writeFileSync(big, Buffer.alloc(300_000, 2))
  const r = cli(["evidence", "XC-3", "--ac", "2", "--result", "fail", "--video", big, "--body", "AC2: fail", ...p()])
  assert.equal(r.code, 0)
  assert.equal(r.out, "docs/qa/XC-3/ac2.webm\n")
  assert.equal(fs.statSync(path.join(root, "docs", "qa", "XC-3", "ac2.webm")).size, 300_000)
  const c = item("XC-3").comments.at(-1)
  assert.equal(c.role, "AI QA")
  assert.equal(c.body, "AC2: fail")
  assert.deepEqual(c.attachments, [{ type: "video", path: "docs/qa/XC-3/ac2.webm", label: "AC2", ac: 2, result: "fail" }])
})

test("evidence: --min-bytes lowers the bar", () => {
  resetBoard()
  const file = path.join(root, "tiny.webm")
  fs.writeFileSync(file, Buffer.alloc(500, 3))
  const r = cli(["evidence", "XC-3", "--ac", "1", "--result", "pass", "--video", file, "--body", "ok", "--min-bytes", "100", ...p()])
  assert.equal(r.code, 0)
})

test("no server listening: exit 2 with how to start it", async () => {
  const dead = await freePort()
  const r = cli(["health", "--port", String(dead)])
  assert.equal(r.code, 2)
  assert.match(r.err, new RegExp(`doesn't answer on port ${dead}`))
  assert.match(r.err, /pnpm board/)
  assert.equal(r.out, "")
})

test("port resolution: --port, then BOARD_PORT, then .board-server.json, then 4000", async () => {
  const dead = await freePort()
  const stateRoot = fs.mkdtempSync(path.join(os.tmpdir(), "board-cli-state-"))
  try {
    // 4000 is the fallback when nothing else is set. `url` prints it without making a request,
    // so this never touches a real board running on that port.
    assert.equal(cli(["url"], { cwd: stateRoot }).out, "http://localhost:4000/\n")

    fs.writeFileSync(path.join(stateRoot, ".board-server.json"), JSON.stringify({ port }) + "\n")
    assert.equal(cli(["url"], { cwd: stateRoot }).out, `http://localhost:${port}/\n`)

    // BOARD_PORT beats the state file
    assert.equal(cli(["url"], { cwd: stateRoot, env: { BOARD_PORT: String(dead) } }).out, `http://localhost:${dead}/\n`)

    // --port beats BOARD_PORT
    assert.equal(cli(["url", "--port", String(port)], { cwd: stateRoot, env: { BOARD_PORT: String(dead) } }).out, `http://localhost:${port}/\n`)

    // the state file is found from a sub folder
    const sub = path.join(stateRoot, "a", "b")
    fs.mkdirSync(sub, { recursive: true })
    assert.equal(cli(["url"], { cwd: sub }).out, `http://localhost:${port}/\n`)

    assert.equal(cli(["url", "--port", "banana"], { cwd: stateRoot }).code, 1)
  } finally {
    fs.rmSync(stateRoot, { recursive: true, force: true })
  }
})
