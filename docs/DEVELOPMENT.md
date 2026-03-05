# Development Guide

This guide covers local development setup for Kuramei.

## Prerequisites

- **Node.js**: v18+ (LTS recommended)
- **pnpm**: v8+ (package manager)
- **Git**: Latest version

## Quick Setup

### 1. Clone the repository

```bash
git clone https://github.com/aleparreira/kuramei.git
cd kuramei
```

### 2. Install dependencies

```bash
# Install pnpm if not already installed
npm install -g pnpm

# Install all dependencies
pnpm install
```

### 3. Start development

```bash
# Start all apps in development mode
pnpm dev

# Or start specific app
cd apps/web
pnpm dev
```

## Project Structure

```
kuramei/
├── apps/           # Application packages
│   ├── web/       # Web frontend
│   ├── mobile/    # Mobile app
│   └── server/    # Backend server
├── packages/       # Shared packages
│   ├── ui/        # UI components
│   ├── config/    # Shared configuration
│   └── utils/     # Utility functions
├── docs/           # Documentation
└── scripts/        # Build scripts
```

## Common Commands

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all dependencies |
| `pnpm dev` | Start development mode |
| `pnpm build` | Build for production |
| `pnpm test` | Run tests |
| `pnpm lint` | Lint code |

## Troubleshooting

### Node version issues

Use nvm to manage Node versions:

```bash
nvm install 18
nvm use 18
```

### pnpm not found

```bash
npm install -g pnpm
```

### Build errors

Clear cache and reinstall:

```bash
rm -rf node_modules
pnpm install
```

## IDE Setup

### VS Code Recommended Extensions

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- Error Lens

### Settings

Add to `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

---

For more help, check the main [AGENTS.md](../AGENTS.md)
