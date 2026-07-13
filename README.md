# SC Aura Kurtis · Wholesale ERP (Frontend)

React 19 + Vite frontend for the SC Aura Kurtis Wholesale ERP.

## Requirements

- Node.js 18+ (Node 20+ recommended)
- npm 9+

## Setup

```bash
npm install
```

Copy `.env.example` to `.env` and update if needed:

```bash
cp .env.example .env
```

Environment variables:

| Variable        | Description                              | Default                          |
| --------------- | ---------------------------------------- | -------------------------------- |
| `VITE_API_URL`  | Base URL of the FastAPI backend          | `https://erp.scaurakurtis.com`   |

The frontend automatically appends `/api` to `VITE_API_URL` when calling the backend.

## Development

```bash
npm run dev
```

App runs at http://localhost:3000

## Production Build

```bash
npm run build
```

Output goes to `build/`.

Preview the build locally:

```bash
npm run preview
```

## Deploy to Vercel

The included `vercel.json` handles SPA routing and configures the build. Simply
connect the repo to Vercel; no manual settings required. Set `VITE_API_URL` in
the Vercel project's Environment Variables if you want to override the default.

## Stack

- React 19
- Vite 5
- Tailwind CSS 3
- shadcn/ui + Radix UI
- React Router 7
- Axios
- Framer Motion / Recharts / jsPDF / html5-qrcode
