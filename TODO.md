# Drill Night - Project Checklist & TODO

Crisis command center for small/mid-size businesses hit by ransomware with built-in multiplayer drill mode.

---

## Phase 0: Environment Check
- [x] Check Node.js 18+ and Git (`node -v`, `git --version`)
- [x] Check SpacetimeDB CLI installed (`spacetime --version`)
- [x] Clone repo / branch `pato` checked out
- [x] Confirm `spacetime login` completed
- [x] Create `TODO.md` checklist

---

## Phase 1: Connect SpacetimeDB + React
- [ ] Scaffold with `spacetime dev --template react-ts` into project
- [ ] Verify project structure (`spacetimedb/src/index.ts`, `src/App.tsx`, `src/module_bindings/`, `spacetime.json`)
- [ ] Confirm app runs at `http://localhost:5173` and connects to database
- [ ] Test DB with template sample reducer using `spacetime call`, `spacetime sql`, `spacetime logs`
- [ ] Add `.gitignore` and `.env.example`
- [ ] Commit and push: `git push -u origin pato`

---

## Phase 2: Schema (Backend Skeleton)
- [ ] Define tables in `spacetimedb/src/index.ts`:
  - [ ] `org`
  - [ ] `member` (identity, name, phone, role, org_id, expires_at)
  - [ ] `incident` (status, phase)
  - [ ] `message`
  - [ ] `task` (role, assignee, done)
  - [ ] `audit_log` (APPEND-ONLY: strictly no update or delete reducers)
  - [ ] `scope_item` (data category, status locked|exfiltrated|restored|unknown, affected_states)
  - [ ] `report_template`, `report_draft`
  - [ ] `drill_session`, `drill_player`, `drill_score`, `drill_event`
- [ ] Define Roles: `owner`, `it_lead`, `legal`, `comms`, `insurer`, `outside_counsel` (with expiry for guests)
- [ ] Enforce audit logging in reducers (`actor`, `action`, `timestamp`)
- [ ] Enforce `SenderError` when unauthorized
- [ ] Create Views filtering data by caller's role
- [ ] Add dev/seed reducer for test fake data
- [ ] Commit and push to `pato`

---

## Phase 3: Baseline Frontend (Test Harness)
- [ ] Top bar on all pages: connection status, shortened identity, name, phone, role, org
- [ ] Structure: `src/pages/`, `src/components/` (`DataTable`, `Field`, `RoleBadge`), `src/lib/` (connection & auth hooks, constants)
- [ ] Pages (live subscriptions + form for each action):
  - [ ] `/login` - placeholder with "Continue as test user"
  - [ ] `/members` - list, add member, change role, guest expiry, remove
  - [ ] `/incident` - status, "Activate incident", "Close incident", phase selector
  - [ ] `/warroom` - live messages, send box, role-based task list
  - [ ] `/docs` - phase documentation, read-only audit log table
  - [ ] `/scope` - scope items table + add/update form
  - [ ] `/notify` - state notification laws & countdowns with disclaimer
  - [ ] `/editor` - report templates + draft editor textarea
  - [ ] `/export` - PDF export stub + checklist
  - [ ] `/drill` - start session, scenario picker, event feed, players, leaderboard
  - [ ] `/debug` - raw JSON dump of tables + reducer call log
- [ ] Multi-tab verification (two browser tabs open simultaneously)
- [ ] Commit and push to `pato`

---

## Phase 4: Features
- [ ] 4a. Login with personal phone number (SMS one-time code OIDC / Clerk)
- [ ] 4b. Roles & access control enforced in reducers and Views
- [ ] 4c. War room + realtime chat + role-based tasks
- [ ] 4d. Incident documentation by phase + append-only audit log
- [ ] 4e. Scope definitions (category + status + affected states)
- [ ] 4f. Breach-notification engine (TX, CA, NY rules with countdown deadlines)
- [ ] 4g. Editor for documentation formats (insurer, lawyer, regulator drafts)
- [ ] 4h. Bulk export to PDF (client-side jsPDF / react-pdf)
- [ ] 4i. Drill Night multiplayer simulation & leaderboard
- [ ] 4j. Passkeys & design polish
