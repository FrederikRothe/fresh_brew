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

## Commit 2026-03-18 08:26:57

```diff
diff --git a/AGENT.md b/AGENT.md
new file mode 100644
index 0000000..976f6ff
--- /dev/null
+++ b/AGENT.md
@@ -0,0 +1,60 @@
+# Coffee Freshness Tracker (isitfresh)
+
+A Next.js 16 application for tracking office coffee freshness and daily consumption.
+
+## Project Overview
+This project provides a real-time dashboard to monitor when the last pot of coffee was brewed and how many pots have been brewed today. It features a 30-minute freshness countdown, dynamic visual status updates, and a protected administrative interface for starting new brews.
+
+### Core Technologies
+- **Framework:** Next.js 16 (App Router)
+- **Language:** TypeScript
+- **Styling:** Tailwind CSS 4
+- **State/Countdown:** React Client Components with `useEffect` timers
+- **Backend/Logic:** Next.js Server Actions
+- **Storage:** Redis (via `redis` package)
+- **Icons:** Lucide React
+- **Date Handling:** `date-fns`
+
+### Architecture
+- **`src/app/page.tsx`**: Entry point (Server Component). Fetches initial brew status and renders the `Dashboard`.
+- **`src/components/Dashboard.tsx`**: Main UI (Client Component). Manages the live countdown timer, status-based color changes, and admin authentication (via `localStorage`).
+- **`src/app/actions.ts`**: Server Actions for data fetching and mutation. Includes a hardcoded admin password: `freshbrew`.
+- **`src/lib/storage.ts`**: Redis storage abstraction layer. Uses the `STORAGE_REDIS_URL` environment variable.
+- **`src/app/globals.css`**: Tailwind 4 configuration and global styles.
+
+## Building and Running
+
+### Prerequisites
+- Node.js (Latest LTS recommended)
+- A running Redis instance (URL configured in `.env`)
+
+### Key Commands
+- `npm install`: Install dependencies.
+- `npm run dev`: Start the development server with Turbopack.
+- `npm run build`: Build the production application.
+- `npm run start`: Start the production server.
+- `npm run lint`: Run ESLint for code quality.
+
+## Development Conventions
+
+### Data Storage
+- Although the `README.md` mentions a local CSV file, the current implementation strictly uses **Redis**.
+- The `STORAGE_REDIS_URL` must be defined in the `.env` file.
+- The storage model is defined in `BrewData` within `src/lib/storage.ts`.
+
+### Authentication
+- A simple "Brewer Mode" is used to prevent unauthorized resets.
+- The admin password is hardcoded as `freshbrew` in `src/app/actions.ts`.
+- Successful logins are stored in the browser's `localStorage` as `coffee_admin_password`.
+
+### Visual States
+- **Fresh (0-10m):** Green (`bg-emerald-500`)
+- **Still Good (10-20m):** Orange (`bg-amber-500`)
+- **Drink at Own Risk (20-30m):** Red (`bg-rose-500`)
+- **Stale (30m+):** Gray (`bg-slate-500`)
+
+### Coding Style
+- **Server Components:** Used for initial data fetching to minimize client-side waterfall.
+- **Server Actions:** Used for all mutations (`startBrew`).
+- **Tailwind CSS:** Utility-first styling with Tailwind 4.
+- **Lucide Icons:** Standardized icon set for the UI.
diff --git a/skills/git-commit-push.skill b/skills/git-commit-push.skill
new file mode 100644
index 0000000..203de93
Binary files /dev/null and b/skills/git-commit-push.skill differ
diff --git a/skills/git-commit-push/SKILL.md b/skills/git-commit-push/SKILL.md
new file mode 100644
index 0000000..19bcfbb
--- /dev/null
+++ b/skills/git-commit-push/SKILL.md
@@ -0,0 +1,30 @@
+---
+name: git-commit-push
+description: Commits and pushes staged changes while automatically documenting them in AGENT.md. Use when the user wants to commit changes and ensure the project's record is up-to-date.
+---
+
+# Git Commit and Push with Documentation
+
+This skill streamlines the workflow of committing and pushing changes, ensuring every commit is documented in `AGENT.md` with the staged diff.
+
+## Workflow
+
+1. **Verify Staged Changes**: Ensure all relevant changes are staged with `git add`.
+2. **Update AGENT.md**: Run the documentation script to append staged changes to `AGENT.md`.
+3. **Stage AGENT.md**: Stage the updated `AGENT.md` itself.
+4. **Commit**: Perform a standard commit with a descriptive message.
+5. **Push**: Push the changes to the remote repository.
+
+## Commands
+
+To update the documentation:
+```bash
+./skills/git-commit-push/scripts/update_agent_md.sh
+```
+
+## Implementation Guide
+
+1. Run the script: `./skills/git-commit-push/scripts/update_agent_md.sh`.
+2. Run `git add AGENT.md` to include the documentation change in the commit.
+3. Use `git commit -m "..."` to commit the changes.
+4. Use `git push` to push to the current branch.
diff --git a/skills/git-commit-push/scripts/update_agent_md.sh b/skills/git-commit-push/scripts/update_agent_md.sh
new file mode 100755
index 0000000..0bc3db1
--- /dev/null
+++ b/skills/git-commit-push/scripts/update_agent_md.sh
@@ -0,0 +1,17 @@
+#!/bin/bash
+
+# Get the staged changes
+staged_diff=$(git diff --staged)
+
+if [ -z "$staged_diff" ]; then
+  echo "No staged changes to document."
+  exit 0
+fi
+
+# Create a entry with timestamp
+echo -e "\n## Commit $(date '+%Y-%m-%d %H:%M:%S')\n" >> AGENT.md
+echo '```diff' >> AGENT.md
+echo "$staged_diff" >> AGENT.md
+echo '```' >> AGENT.md
+
+echo "Successfully updated AGENT.md with staged changes."
```
