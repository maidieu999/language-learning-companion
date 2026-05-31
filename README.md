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

# Web
cd apps/web && npm install && npm run dev

# API (copy apps/api/.env.example to .env, then migrate + run)
cd apps/api && npm install && npx prisma migrate dev && npm run start:dev
```
