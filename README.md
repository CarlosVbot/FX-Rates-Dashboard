# FX Rates Dashboard (React + TypeScript)

A small, production-style front-end demo that consumes a public FX reference rates API and showcases typical “senior front-end” concerns: clean architecture, strong typing, responsive UI, accessible forms, caching, and predictable state.

## Screenshots
![converter](https://github.com/user-attachments/assets/aab123dc-f861-477f-96e9-e975400b62ef)
![history](https://github.com/user-attachments/assets/a0a27685-464f-4da3-9e95-0a743a8649b0)
![watchlist](https://github.com/user-attachments/assets/21e70890-fe84-4429-b6b7-950a36be45d2)

## Features

### ✅ Converter
- Convert an amount between two currencies (swap supported)
- Form validation (required fields, positive amount, base != target)
- Loading / error / empty states

### ✅ Rate History
- 7 / 30 / 90 day view for a currency pair
- Line chart visualization
- Basic analytics: min / avg / max / number of points

### ✅ Watchlist
- Save favorite currency pairs
- Persisted with `localStorage`
- Fetch latest rate per pair
- “Refresh all” action

---

## Tech Stack
- **React + TypeScript** (Vite)
- **React Router** (multi-page navigation)
- **TanStack React Query** (data fetching, caching, invalidation)
- **React Hook Form + Zod** (typed forms + validation)
- **Recharts** (history chart)

---

## Data Source
This app uses the **Frankfurter** public API (no API key required). Rates are reference rates and may update on a daily schedule, which is ideal for demos and UX flows but not intended for real-time trading.

---

## Architecture Notes
- API calls are isolated in `src/api/` to keep UI components clean
- Pages live under `src/pages/`
- Small utilities (like localStorage persistence) live under `src/utils/`
- React Query handles caching and refetch strategies (stale times, manual refresh)

---

## Getting Started

### Requirements
- Node.js 18+ recommended

### Install & Run
```bash
npm install
npm run dev
