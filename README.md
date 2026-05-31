# Language Learning Companion

AI language learning companion monorepo.

## Structure

- `apps/web` — Next.js frontend
- `apps/api` — NestJS backend
- `packages/` — shared libraries (future)
- `docs/` — project documentation
- [ROADMAP.md](ROADMAP.md) — build progress and feature steps

## Development

```bash
# Postgres (pgvector) — host port 5433 to avoid clashing with local Postgres on 5432
docker compose up -d postgres

# API (copy apps/api/.env.example to .env, then migrate + seed + run) — port 3000
cd apps/api && npm install && npx prisma migrate dev && npx prisma db seed && npm run start:dev

# Web — port 3001 (calls API at http://localhost:3000)
cd apps/web && npm install && npm run dev
```

Open `http://localhost:3001/login` to sign in or create a learner account. The seeded admin uses `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `apps/api/.env` (defaults in `.env.example`).

Optional: in `apps/web`, set `NEXT_PUBLIC_API_URL=http://localhost:3000` if the API runs elsewhere.
