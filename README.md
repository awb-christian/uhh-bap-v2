# Odoo Attendance Pusher (Next.js)

A simple Next.js app that simulates collecting attendance from ZKTeco devices and pushing it to Odoo. It includes a basic activity log UI, simulated data sources, and an experimental UHH/Odoo connectivity flow.

## Quick start

1. Prerequisites: Node.js 18+ and npm
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the dev server (Turbopack, port 9002):
   ```bash
   npm run dev
   ```
4. Open the app at http://localhost:9002 (redirects to the Logs page).

Build and run in production:
```bash
npm run build
npm start
```

## Scripts
- `dev`: Next.js dev server on port 9002 (Turbopack)
- `build`: Build the app
- `start`: Start the production server
- `lint`: Run Next.js lint
- `typecheck`: TypeScript type checking
- `genkit:dev`, `genkit:watch`: Start Genkit AI dev flows (optional)

## Environment variables
These are optional and control simulated integrations:

- `NEXT_PUBLIC_ODOO_URL` — e.g. `your-odoo-instance.com`
- `NEXT_PUBLIC_ODOO_DB` — e.g. `your_database`
- `NEXT_PUBLIC_ZK_TIME_IP` — default `192.168.1.202`
- `NEXT_PUBLIC_ZK_TIME_PORT` — default `4370`
- `NEXT_PUBLIC_ZK_BIOTIME_IP` — default `192.168.1.201`
- `NEXT_PUBLIC_ZK_BIOTIME_PORT` — default `80`

Note: These are used on the client for demo/simulation. Do not put secrets in public env vars.

## Key pages
- `/logs` — Activity logs with filtering, retention policy simulation
- `/attendance-transactions` — View and manage simulated attendance transactions
- `/zkteco-time` — Simulated fetch from a standalone ZKTeco device (SDK-style)
- `/zkteco-biotime` — Simulated fetch from ZKTeco Biotime (HTTP API-style)
- `/securelink` — Simulated MDB (Access) connectivity UI
- `/uhh-connectivity` — Simulated UHH/Odoo authentication and push to Odoo

## Code layout
- `src/lib/` — Core helpers and simulated integrations
  - `app-logger.ts` — Client-side activity logging
  - `attendance-manager.ts` — Client-side transactions store (localStorage)
  - `zkteco/` — Simulated ZKTeco Time/Biotime APIs
  - `odoo/` — Odoo API placeholders
- `src/components/` — UI components
- `src/app/` — Next.js App Router routes (pages)

## Notes and caveats
- Integrations are simulated and intended for UI and flow prototyping.
- For production, move sensitive operations and credentials to a secure server or Electron main process.
- Avoid logging secrets or PII. Error logs are retained; non-critical debug logs were removed to reduce noise.
