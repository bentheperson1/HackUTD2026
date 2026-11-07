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
