# Coffee Freshness Tracker

A Next.js web application for tracking office coffee freshness and daily consumption.

## Tech Stack
- **Next.js 15+ (App Router)**
- **Tailwind CSS**
- **Local CSV Storage (Node.js FS)**
- **Lucide React (Icons)**

## Core Features
- **Global Freshness Timer:** Tracks the exact timestamp of the last brew in a local CSV file.
- **Real-time Countdown:** Displays a 30-minute freshness window with a live countdown.
- **Dynamic Visual Cues:** Background and status colors change based on coffee age (Green, Orange, Red, Gray).
- **Daily Pot Counter:** Tracks total coffee pots brewed today, resetting automatically at midnight.

## Setup & Local Development

### 1. Data Persistence
The app uses a local file named `coffee_data.csv` in the project root to store status. This file is created automatically on the first run.

### 2. Local Development
```bash
npm install
npm run dev
```

## Note on Deployment
This app is currently configured for **local storage via CSV**. 

**Important for Vercel users:** Standard Vercel deployments use serverless functions with a **read-only** ephemeral filesystem. Writes to `coffee_data.csv` will not persist across requests or deployments. For persistent storage in a production Vercel environment, consider integrating a database like **Upstash Redis** or a similar external storage provider.
