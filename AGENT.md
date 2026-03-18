# Coffee Freshness Tracker (isitfresh)

A Next.js 16 application for tracking office coffee freshness and daily consumption.

## Project Overview
This project provides a real-time dashboard to monitor when the last pot of coffee was brewed and how many pots have been brewed today. It features a 30-minute freshness countdown, dynamic visual status updates, and a protected administrative interface for starting new brews.

### Core Technologies
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **State/Countdown:** React Client Components with `useEffect` timers
- **Backend/Logic:** Next.js Server Actions
- **Storage:** Redis (via `redis` package)
- **Icons:** Lucide React
- **Date Handling:** `date-fns`

### Architecture
- **`src/app/page.tsx`**: Entry point (Server Component). Fetches initial brew status and renders the `Dashboard`.
- **`src/components/Dashboard.tsx`**: Main UI (Client Component). Manages the live countdown timer, status-based color changes, and admin authentication (via `localStorage`).
- **`src/app/actions.ts`**: Server Actions for data fetching and mutation. Includes a hardcoded admin password: `freshbrew`.
- **`src/lib/storage.ts`**: Redis storage abstraction layer. Uses the `STORAGE_REDIS_URL` environment variable.
- **`src/app/globals.css`**: Tailwind 4 configuration and global styles.

## Building and Running

### Prerequisites
- Node.js (Latest LTS recommended)
- A running Redis instance (URL configured in `.env`)

### Key Commands
- `npm install`: Install dependencies.
- `npm run dev`: Start the development server with Turbopack.
- `npm run build`: Build the production application.
- `npm run start`: Start the production server.
- `npm run lint`: Run ESLint for code quality.

## Development Conventions

### Data Storage
- Although the `README.md` mentions a local CSV file, the current implementation strictly uses **Redis**.
- The `STORAGE_REDIS_URL` must be defined in the `.env` file.
- The storage model is defined in `BrewData` within `src/lib/storage.ts`.

### Authentication
- A simple "Brewer Mode" is used to prevent unauthorized resets.
- The admin password is hardcoded as `freshbrew` in `src/app/actions.ts`.
- Successful logins are stored in the browser's `localStorage` as `coffee_admin_password`.

### Visual States
- **Fresh (0-10m):** Green (`bg-emerald-500`)
- **Still Good (10-20m):** Orange (`bg-amber-500`)
- **Drink at Own Risk (20-30m):** Red (`bg-rose-500`)
- **Stale (30m+):** Gray (`bg-slate-500`)

### Coding Style
- **Server Components:** Used for initial data fetching to minimize client-side waterfall.
- **Server Actions:** Used for all mutations (`startBrew`).
- **Tailwind CSS:** Utility-first styling with Tailwind 4.
- **Lucide Icons:** Standardized icon set for the UI.

## Agent Operating Procedures

### Committing and Pushing Changes
- **ALWAYS** activate and use the `git-commit-push` skill (located in `.gemini/skills/git-commit-push`) for any git operations (stage, commit, or push).
- This ensures that `AGENT.md` and project documentation are consistently updated according to the skill's expert workflow.
