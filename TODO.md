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
- [x] Scaffold React + TypeScript + Vite project
- [x] Verify project structure (`src/App.tsx`, `src/components/`, `src/pages/`, `src/lib/`)
- [x] Confirm app runs at `http://localhost:5173`
- [ ] Connect SpacetimeDB live WebSocket bindings (waiting on backend teammate module)
- [x] Add `.gitignore` and `.env.example`
- [x] Commit to `pato`

---

## Phase 2: Schema (Backend Skeleton)
*(Being developed by teammate in `backend/`)*
- [ ] Define tables in SpacetimeDB:
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

---

## Phase 3: Baseline Frontend (Test Harness)
- [x] Top bar on all pages: connection status, shortened identity, name, phone, role, org
- [x] Structure: `src/pages/`, `src/components/` (`DataTable`, `Field`, `RoleBadge`), `src/lib/` (connection & auth hooks, constants, reactive store)
- [x] Pages (live subscriptions + form for each action):
  - [x] `/login` - placeholder with "Continue as test user" + role switchers + SMS OTP simulator
  - [x] `/members` - list, add member, change role, guest expiry, remove
  - [x] `/incident` - status, "Activate incident", "Close incident", phase selector
  - [x] `/warroom` - live messages, send box, role-based task list
  - [x] `/docs` - phase documentation, read-only audit log table
  - [x] `/scope` - scope items table + add/update form
  - [x] `/notify` - state notification laws & countdowns with disclaimer
  - [x] `/editor` - report templates + draft editor textarea
  - [x] `/export` - PDF export stub + checklist
  - [x] `/drill` - start session, scenario picker, event feed, players, leaderboard
  - [x] `/debug` - raw JSON dump of tables + reducer call log
- [x] Multi-tab verification (cross-tab reactive sync via storage events)
- [x] Commit to `pato`

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
