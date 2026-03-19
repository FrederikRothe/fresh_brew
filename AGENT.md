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
- **Date Handling:** `date-fns` (week/year grouping) + native `Intl.DateTimeFormat` for all timezone-sensitive formatting (pinned to `Europe/Copenhagen`)

### Architecture
- **`src/app/page.tsx`**: Entry point (Server Component). Fetches initial brew status and renders the `Dashboard`.
- **`src/components/Dashboard.tsx`**: Main UI (Client Component). Orchestrates the dashboard using custom hooks.
- **`src/hooks/`**: Specialized client hooks for timer logic (`useTimer`), brew status polling (`useBrewStatus`), admin authentication (`useAdminAuth`), and theme-aware body styling (`useBodyBackground`).
- **`src/lib/`**: Shared logic including Redis storage (`storage.ts`), calculation helpers (`brew-utils.ts`), common thresholds (`constants.ts`), and styling utilities (`utils.ts`).
- **`src/app/actions.ts`**: Server Actions for data fetching and mutation. Includes Slack notification logic, brew analytics calculation, and admin password verification.
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
- `npm run db:populate`: Populate Redis with dummy brew history for testing.
- `npm run db:clear`: Clear all brew status and history from Redis.
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

### Timezone Handling
- All server-side date/time formatting is pinned to **`Europe/Copenhagen`** via `Intl.DateTimeFormat` to avoid server timezone drift.
- Three helpers in `src/lib/utils.ts` centralise this:
  - `formatCphDate(ts)` → `yyyy-MM-dd` (used for daily brew count tracking and analytics day grouping)
  - `formatCphTime(ts)` → `HH:mm` (used for Slack `estimated_time_of_completion`)
  - `getCphHour(ts)` → `0–23` (used for the hourly consumption rhythm chart)
- Never use `date-fns` `format()` or `getHours()` for server-side time output — use the helpers above instead.

### Authentication
- A simple "Brewer Mode" is used to prevent unauthorized resets.
- The admin password is managed via the `ADMIN_PSW` environment variable in `src/app/actions.ts`.
- Successful logins are stored in the browser's `localStorage` as `coffee_admin_password`.

### Notifications
- **Browser Notifications:** Permission is requested on the initial mount of the dashboard. Notifications are triggered client-side during the 30-second polling interval when a new brew timestamp is detected.
- **Slack Notifications:** When a new brew is started via `startBrew` in `src/app/actions.ts`, a message is sent to the configured Slack Webhook URL. The POST payload includes `batch_size` (Big/small) and `estimated_time_of_completion` (HH:mm). A JSON debug log is emitted to the server console before sending.

### Visual States & Features
- **Brewing:** Blue (`bg-blue-500`) - Countdown to ready. **BIG Brew: 7m**, **Small Brew: 4m**.
- **Fresh (0-25m since ready):** Green (`bg-emerald-500`)
- **Getting Sour (25-40m since ready):** Orange (`bg-amber-500`)
- **Stale (40-60m since ready):** Red (`bg-rose-500`)
- **Empty/Old (120m+):** Gray (`bg-slate-500`)
- **Daily Pot Count:** Automatically resets at midnight (calculated on-the-fly during data fetch).
- **Analyze Consumption:** Publicly accessible page (`/analyze`) visualizing brew history and usage patterns.
- **Admin Brewer Mode:** Secure login for starting new brews; stores session in `localStorage`.
- **Compact Landscape Mode:** Optimized layout for short viewports on mobile devices.

### Coding Style
- **Testing:** New features and core logic should be verified with Vitest. Tests are located in `src/__tests__`.
- **Server Components:** Used for initial data fetching to minimize client-side waterfall.
- **Server Actions:** Used for all mutations (`startBrew`).
- **Tailwind CSS:** Utility-first styling with Tailwind 4.
- **Lucide Icons:** Standardized icon set for the UI.

## Agent Operating Procedures

### Committing and Pushing Changes
- **ALWAYS** activate and use the `git-commit-push` skill (located in `.gemini/skills/git-commit-push`) for any git operations (stage, commit, or push).
- This ensures that `AGENT.md` and project documentation in the `README.md` are consistently updated according to the skill's expert workflow.
