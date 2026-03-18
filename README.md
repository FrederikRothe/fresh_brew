# Coffee Tracker (isitfresh) ☕

A high-performance Next.js 16 dashboard for tracking office coffee freshness and consumption patterns.

## The Essence
This project provides a real-time, high-visibility dashboard for shared office environments. It solves the "is there fresh coffee?" problem by tracking brew timestamps, managing freshness countdowns, and visualizing historical consumption habits.

- **Real-time Status:** Live countdowns and color-coded freshness states (Fresh → Sour → Stale → Empty).
- **Daily Counter:** Automatic midnight reset to track today's caffeine output.
- **Consumption Analytics:** A dedicated public `/analyze` page visualizing weekly rhythms and usage peaks.
- **Admin Control:** Secure "Brewer Mode" for starting Big (7m) or Small (4m) pots.
- **Notifications:** Integrated Web Notifications and Slack Webhook alerts.

## Tech Stack
- **Framework:** Next.js 16 (App Router + Server Actions)
- **Styling:** Tailwind CSS 4 (with optimized landscape mobile support)
- **Storage:** Redis (Persistent status and historical logs)
- **Icons:** Lucide React
- **Testing:** Vitest + React Testing Library

## Quick Start

### 1. Environment Setup
Create a `.env` file with the following:
```bash
STORAGE_REDIS_URL=redis://localhost:6379
ADMIN_PSW=your_secret_password
SLACK_WEBHOOK_URL=your_slack_webhook (optional)
```

### 2. Run with Docker (Redis)
```bash
docker-compose up -d
npm install
npm run dev
```

## Essential Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Build for production |
| `npm run test` | Execute Vitest suite |
| `npm run lint` | Run ESLint checks |
| `npm run db:populate` | Seed Redis with dummy history for analytics testing |
| `npm run db:clear` | Wipe all brew data and history from Redis |

## Architecture
- **`/analyze`**: Public consumption analytics dashboard.
- **`/src/lib/storage.ts`**: Redis abstraction layer.
- **`/src/app/actions.ts`**: Server-side logic for brews and analytics.
- **`/src/components/Dashboard.tsx`**: Main interactive dashboard.
