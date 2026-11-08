# Drill Night: Crisis Command Center

An out-of-band crisis command center for small/mid-size businesses hit by ransomware. It runs on infrastructure and logins fully separate from company email/Slack/SSO, with a built-in monthly 15-minute multiplayer drill mode.

Built with **SpacetimeDB 2.0 (TypeScript module)** + **React + TypeScript (Vite)**.

## Quickstart

1. **Install SpacetimeDB CLI**:
   - Windows PowerShell: `iwr https://windows.spacetimedb.com -useb | iex`
   - Mac/Linux: `curl -sSf https://install.spacetimedb.com | sh`

2. **Install dependencies**:
   ```bash
   npm install
   cd spacetimedb && npm install && cd ..
   ```

3. **Environment**:
   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

4. **Run Vite Frontend**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173).

5. **SpacetimeDB Commands**:
   - Generate bindings: `npm run spacetime:generate`
   - Publish module: `npm run spacetime:publish`
   - Run SQL queries: `spacetime sql drillnight-dev "SELECT * FROM person"`
   - Check module logs: `spacetime logs drillnight-dev`

---

## Go live (Phase 1)

The app runs in two modes. The top bar shows which one you're in:

- **Live · SpacetimeDB**: every screen reads from the SpacetimeDB tables, and every action calls a server reducer. Open it in two browsers and changes appear on both instantly.
- **Demo data**: SpacetimeDB isn't reachable or the module isn't published, so the app uses local demo data in this browser only.

### Steps (run from `frontend/`)

```bash
spacetime login                       # once per machine
npm run spacetime:publish:fresh       # first time only: replaces the old test module (WIPES its data)
npm run spacetime:generate            # replaces the hand-written client bindings with the official ones
npm run dev
```

After the first publish, use `npm run spacetime:publish` (no wipe) for updates. `npm run spacetime:logs` shows server logs.

### Seeded roster (sign in with any of these)

| Name | Phone | Role |
| --- | --- | --- |
| Alex Rivera | (555) 302-8841 | Owner, admin |
| Taylor Brooks | (555) 771-4920 | IT lead |
| Morgan Lee | (555) 604-1290 | Legal |
| Jordan Kim | (555) 221-0087 | Comms |
| Sam Ortiz | (555) 919-4402 | Insurer (guest, 7 days) |

Demo note: there's no SMS check yet, so any code works and anyone can claim any roster phone.

### What the server enforces (try these)

- Only owner/IT lead can activate, close, or change phase.
- Only owner/IT lead/legal can edit scope. Comms gets a "Server said no" message.
- Only admins can add, remove, or change roles, or post in the Executive room.
- Slow mode is enforced on the server for non-admins.
- Timeline entries can't be edited or deleted. No reducer exists for it.

## Drill Night (Phase 2)

A 5-minute multiplayer practice run. Everyone plays on their own phone.

1. An owner or IT lead opens **Drill Night**, picks a scenario, and clicks **Open lobby**. A 6-letter join code appears.
2. Everyone else enters the code. People can join after it starts, too.
3. The host clicks **Start drill**. Each inject is open for 45 seconds. Pick an answer. Faster correct answers earn up to 50% more points.
4. The inject closes when the timer runs out, when everyone has answered, or when the host clicks **Close now**. Then the right answer and the reason for it appear.
5. After the last inject you get results and a debrief. Points are added to each person's all-time drill score, and the run is written to the audit log.

Scenarios: Ransomware Outbreak, Payroll Wire Fraud (cyber), Tornado Hits the Warehouse, Server Room Flood (catastrophe). They live in `spacetimedb/src/drillContent.ts`. After editing them, republish and have an admin call `reloadDrillLibrary` (no wipe needed).

How it stays fair and secure (all on the server):

- The answer key is in a **private** table (`drill_inject`). Clients can't read it. An inject's text is copied to the public `drill_round` table only once it goes live, so nobody can read ahead.
- A locked-in answer shows as `-1` (sealed) in the public `drill_answer` table. The real choice sits in a private table until the round closes, so nobody can copy a teammate.
- A **scheduled reducer** (`drillTick`) closes each round on time. It refuses calls from clients, and it ignores stale timers if the host already skipped ahead.
- Only the host or an admin can start, skip, or end a drill. No drills run while a real incident is active. There's one open drill per company at a time.

In demo mode (no server), three teammates are simulated so one person can play through the whole thing.

> Phase 2 adds tables, so publish with a wipe once: `npm run spacetime:publish:fresh`, then `npm run spacetime:generate`.
