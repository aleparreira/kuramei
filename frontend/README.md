# Kuramei Frontend

React + Vite + TypeScript frontend for the Kuramei AI Architecture Platform.

## Stack

- **Vite** - Fast build tool and dev server
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling
- **shadcn/ui** - UI components
- **React Flow** - Diagram canvas

## Quick Start

```bash
# Install dependencies
pnpm install

# Run development server (port 3001)
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Architecture Decision

**Why Vite instead of Next.js?**

The editor is a 100% client-side SPA (React Flow canvas, local state, no SEO needed). Next.js's SSR/SSG features add overhead without benefit for this use case. Vite provides:

- Faster HMR (instant feedback)
- Smaller bundle size
- No SSR workarounds (`ssr: false`, dynamic imports)
- Simpler mental model for SPA

The `landing/` page (kuramei.ai) remains Next.js for SEO benefits.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8000` | Backend API URL |

## Project Structure

```
src/
├── components/
│   ├── diagram/       # React Flow components
│   └── ui/            # shadcn/ui components
├── lib/
│   ├── api.ts         # Backend API client
│   └── utils.ts       # Utility functions
├── App.tsx            # Main app component
├── main.tsx           # Entry point
└── index.css          # Global styles + Kuramei theme
```

## Development

The frontend expects the backend running on port 8000:

```bash
# Terminal 1 - Backend
cd backend
source .venv/bin/activate
uvicorn src.main:app --reload --port 8000

# Terminal 2 - Frontend
cd frontend
pnpm dev
```

Then open http://localhost:3001
