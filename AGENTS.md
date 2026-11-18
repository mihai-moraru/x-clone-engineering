# AGENTS.md

X Clone Engineering is a frontend-only X (Twitter)-style clone under `src/frontend/`; the API is already deployed.
The full conventions live in `CLAUDE.md`; this file lists the rules morch checks on every task branch.
Commands run from `src/frontend/`: `pnpm lint`, `pnpm build`, `pnpm test`.

## Rules

- Never edit story, epic, PRD or handoff text under `docs/`; it belongs to the product owner.
- Never hand-edit lockfiles or generated `*.gen.ts` files such as `routeTree.gen.ts`: for a lockfile, change `package.json` and run `pnpm install`, `pnpm add` or `pnpm remove`; for `routeTree.gen.ts`, change the files under `src/frontend/src/routes/` and let `pnpm dev` or `pnpm build` regenerate it. A hook blocks these edits.
- Never read secret env files (`.env`, `.env.local`, `.env.production`, any other `.env.*`) with Read, Grep or Bash; to see which variables exist, read `.env.example`, otherwise ask the user for the specific value. A hook blocks this.
- Never work around a hook block: do not use another tool, spelling or path to reach the same file, and never edit `.claude/hooks/**` or the hook wiring in `.claude/settings.json`; do what the block message says, or ask the user.
- Never skip, weaken or delete an e2e test to get green. `forbid: \.(skip|fixme|only)\( in src/frontend/e2e/**`
- Never click Sign out in an e2e spec that uses the saved sign-in; it ends the session on the server. `forbid: ([Ss]ign.?[Oo]ut.*\.click\(|\.click\(.*[Ss]ign.?[Oo]ut) in src/frontend/e2e/*.spec.ts`
- Never hardcode the API origin in application code; read it from `VITE_API_URL`.
- API calls live in `src/frontend/src/queries/<domain>.ts` as plain `fetch` wrapped in `queryOptions(...)`, always passing credentials: "include" on every request.
- Reuse the primitives in `src/frontend/src/components/ui/` and match neighbouring Tailwind utility patterns; prefer editing existing components over creating new ones or writing custom CSS.
- When the call to `/__xbot/answer` fails, show a quiet "@xbot is asleep" message; never post a placeholder reply to the shared API.
- Run `pnpm lint` from `src/frontend/` and fix all ESLint and TypeScript errors it reports. `run: cd src/frontend && pnpm lint`
- Run `pnpm build` from `src/frontend/` and make it pass (typecheck plus production build). `run: cd src/frontend && pnpm build`
- Run `pnpm test` from `src/frontend/` and make it pass. `run: cd src/frontend && pnpm test`
