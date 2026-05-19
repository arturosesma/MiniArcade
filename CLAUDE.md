# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Infrastructure
```bash
docker-compose up -d        # Start MySQL (required before running backend)
docker-compose down         # Stop MySQL
```

### Frontend (`/frontend`)
```bash
npm run dev                 # Dev server at http://localhost:5173
npm run build               # tsc -b && vite build
npm run lint                # ESLint
```

### Backend (`/backend`)
```bash
npm run start:dev           # Watch mode at http://localhost:3000
npm run build               # nest build
npm run lint                # ESLint with auto-fix
npm run test                # Jest unit tests
npm run test:watch          # Jest in watch mode
npm run test:cov            # Jest with coverage
npm run test:e2e            # E2E tests (test/jest-e2e.json)
```
Run a single test file: `npx jest src/games/games.service.spec.ts`

## Architecture

This is a monorepo with two independent apps and a shared Docker MySQL instance.

### Frontend
- **Tailwind v4** — configured via the `@tailwindcss/vite` Vite plugin (not a `tailwind.config.js`). Styles are imported as `@import "tailwindcss"` in `src/index.css`.
- **Routing** — React Router v7 with three routes defined in `src/App.tsx`: `/`, `/tic-tac-toe`, `/connect-four`.
- New game pages go in `src/pages/`. Register the route in `App.tsx`.

### Backend
- **NestJS** with feature modules. Each game or domain area gets its own module under `src/<feature>/` with a controller, service, and module file.
- **TypeORM** is configured in `app.module.ts` via `TypeOrmModule.forRootAsync` reading from env vars (`DB_*`). `synchronize: true` is active — schema changes apply automatically in dev. Disable this before production.
- **`autoLoadEntities: true`** — entities are registered by their module (via `TypeOrmModule.forFeature([Entity])`), not listed in the root config.
- **`ConfigModule`** is global — inject `ConfigService` anywhere without re-importing.
- Env vars live in `backend/.env` (not committed in production). The Docker MySQL container uses the same credentials as defaults.

### Database
- MySQL 8.0 via Docker. Database: `games_db`, user: `root`, password: `root`, port: `3306`.
- The `mysql_data` named volume persists data across container restarts.

### Adding a new game
1. Create `src/pages/<GameName>.tsx` in the frontend.
2. Add a `<Route>` in `src/App.tsx` and a card on `Dashboard.tsx`.
3. In the backend, generate a module: `npx nest g module <game> && npx nest g controller <game> && npx nest g service <game>`.
4. Import the new module in `app.module.ts`.
5. Create a TypeORM entity and register it with `TypeOrmModule.forFeature([Entity])` in the game module.
