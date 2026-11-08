# Breach Room frontend

React + TypeScript + Vite + Tailwind v4, wired to the C# SpacetimeDB module in `../backend/spacetimedb` (unchanged).

```bash
cp .env.example .env      # DB name: hackutd2026-h9s81 on maincloud
npm install
npm run dev
```

The top bar shows **Live · SpacetimeDB** when connected, or **Demo data** (local only, simulated teammates) when the server can't be reached.

## First run on a fresh database

1. Sign in with your name + personal phone → `register_phone`. There is no text-message verification yet; adding it needs a backend change (an SMS service such as Twilio).
2. Create your company → `create_organization`. You become its Owner.
3. Teammates sign in once with their phones, then the Owner adds them on **Team** → `add_org_member`.
4. Insurer / outside counsel: activate an incident first, then add them on **Team** with a guest role → `grant_guest` (1-30 days).
5. Owner: on **Reports**, click "Add insurer, counsel and regulator formats" once → `save_template`.

Demo shortcut: the backend allows phone takeover, so the "Registered people" list on the sign-in page switches who this browser is.

## How screens map to the backend

| Screen | Reads | Calls |
| --- | --- | --- |
| Incident | `incident` (newest non-drill), `timeline_entry` | `activate_incident`, `set_phase`, `close_incident`, `update_incident` |
| War room | `incident_messages`, `admin_messages`, `general_messages` views, `task` | `send_message` (chat 2 / 1 Executive / 3 Q&A), `create_task`, `update_task` |
| Scope | `scope_item` | `upsert_scope_item` |
| Audit log | `timeline_entry` | `log_action` |
| Reports | `doc_template`, `incident_document` | `save_document`, `save_template` |
| Export | everything above | `log_export` |
| Team | `org_member`, `user`, `guest_grant` | `add_org_member`, `set_org_role`, `grant_guest`, `revoke_guest` |
| Drill Night | `drill_scenario`, `drill_session`, `drill_player`, `drill_question`, `drill_answer` | `create_drill`, `join_drill`, `start_drill`, `answer_inject`, `next_inject_now`, `end_drill` |

All mapping lives in `src/lib/live.ts`. Broadcasts are war-room messages that start with `[BROADCAST] ` (the module has no broadcast table). Slow mode and removing a staff member are hidden in live mode because the module has no reducer for them.

After any backend change: `npm run spacetime:generate`.
