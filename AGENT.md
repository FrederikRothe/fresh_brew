# Coffee Freshness Tracker (isitfresh)

A Next.js 16 application for tracking office coffee freshness and daily consumption.

## Project Overview
This project provides a real-time dashboard to monitor when the last pot of coffee was brewed and how many pots have been brewed today. It features a 30-minute freshness countdown, dynamic visual status updates, brew history tracking, and a protected administrative interface for starting new brews and viewing usage analytics.

### Core Technologies
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **State/Countdown:** React Client Components with `useEffect` timers
- **Notifications:** Standard Web Notification API (client-side polling) and Slack (via Webhook)
- **Backend/Logic:** Next.js Server Actions
- **Storage:** Redis (via `redis` package)
- **Deployment:** Docker Compose (local Redis service)
- **Testing:** Vitest, React Testing Library, JSDOM
- **Icons:** Lucide React
- **Date Handling:** `date-fns`

### Architecture
### Architecture
- **`src/app/page.tsx`**: Entry point (Server Component). Fetches initial brew status and renders the `Dashboard`.
- **`src/components/Dashboard.tsx`**: Main UI (Client Component). Manages the live countdown timer, status-based color changes, admin authentication (via `localStorage`), and the **Admin Stats Panel**.
- **`src/app/actions.ts`**: Server Actions for data fetching and mutation. Includes Slack notification logic, **brew analytics calculation**, and admin password verification via the `ADMIN_PSW` environment variable.
- **`src/lib/storage.ts`**: Redis storage abstraction layer. Handles `BrewData` (current status) and `BrewHistory` (record list).
- **`src/app/globals.css`**: Tailwind 4 configuration and global styles.

## Building and Running

### Prerequisites
- Node.js (Latest LTS recommended)
- A running Redis instance (URL configured in `.env` as `STORAGE_REDIS_URL`).
- **Docker Compose** (optional, for local Redis).
- A Slack Webhook URL (configured in `.env` as `SLACK_WEBHOOK_URL`) for brew alerts.
- **`ADMIN_PSW`**: Set in `.env` for admin authentication.

### Key Commands
- `npm install`: Install dependencies.
- `docker-compose up -d`: Start a local Redis instance.
- `npm run dev`: Start the development server with Turbopack.
- `npm run build`: Build the production application.
- `npm run start`: Start the production server.
- `npm run lint`: Run ESLint for code quality.
- `npm run test`: Run the Vitest test suite.
...
## Development Conventions

### Data Storage
- Although the `README.md` mentions a local CSV file, the current implementation strictly uses **Redis**.
- The `STORAGE_REDIS_URL` must be defined in the `.env` file.
- The storage model includes `BrewData` (current) and a list of `BrewRecord` objects for historical analytics.

### Authentication
- A simple "Brewer Mode" is used to prevent unauthorized resets.
- The admin password is managed via the `ADMIN_PSW` environment variable in `src/app/actions.ts`.
- Successful logins are stored in the browser's `localStorage` as `coffee_admin_password`.

### Notifications
- **Browser Notifications:** Permission is requested on the initial mount of the dashboard. Notifications are triggered client-side during the 30-second polling interval when a new brew timestamp is detected.
- **Slack Notifications:** When a new brew is started via `startBrew` in `src/app/actions.ts`, a message is sent to the configured Slack Webhook URL.

### Visual States & Features
- **Brewing:** Blue (`bg-blue-500`) - Countdown to ready. **BIG Brew: 7m**, **Small Brew: 4m**.
- **Fresh (0-25m since ready):** Green (`bg-emerald-500`)
- **Getting Sour (25-40m since ready):** Orange (`bg-amber-500`)
- **Stale (40-60m since ready):** Red (`bg-rose-500`)
- **Empty/Old (120m+):** Gray (`bg-slate-500`)
- **Admin Stats Panel:** Accessible to logged-in brewers. Displays all-time brew counts, peak hours, and average daily consumption.
- **Compact Landscape Mode:** Specialized Tailwind classes (`landscape:`) are used to optimize for short viewports on mobile devices.

### Coding Style
- **Testing:** New features and core logic should be verified with Vitest. Tests are located in `src/__tests__`.
- **Server Components:** Used for initial data fetching to minimize client-side waterfall.
- **Server Actions:** Used for all mutations (`startBrew`).
- **Tailwind CSS:** Utility-first styling with Tailwind 4.
- **Lucide Icons:** Standardized icon set for the UI.

## Agent Operating Procedures

### Committing and Pushing Changes
- **ALWAYS** activate and use the `git-commit-push` skill (located in `.gemini/skills/git-commit-push`) for any git operations (stage, commit, or push).
- This ensures that `AGENT.md` and project documentation are consistently updated according to the skill's expert workflow.
