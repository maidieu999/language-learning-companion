# Language Learning Companion

A monorepo for a personal language-learning app. Learners upload lesson material (text, PDF, or `.txt`), ask questions grounded in that content via vector search and RAG, and will practice describing images with AI feedback (in progress). Built with a Next.js web app and a NestJS API backed by Postgres (pgvector) and Gemini.

## Structure

- `apps/web` — Next.js frontend
- `apps/api` — NestJS backend
- `packages/` — shared libraries (future)
- `docs/` — project documentation
- [ROADMAP.md](ROADMAP.md) — build progress and feature steps

## Development

```bash
# Postgres (pgvector) + LocalStack (S3) — see apps/api/.env.example for S3_* / AWS_* vars
docker compose up -d

# API (copy apps/api/.env.example to .env, then migrate + seed + run) — port 3000
# Uploaded PDFs and text files are stored in S3 (LocalStack at http://localhost:4566 in dev)
cd apps/api && npm install && npx prisma migrate dev && npx prisma db seed && npm run start:dev

# Web — port 3001 (calls API at http://localhost:3000)
cd apps/web && npm install && npm run dev
```

Open `http://localhost:3001/login` to sign in or create a learner account. The seeded admin uses `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `apps/api/.env` (defaults in `.env.example`).

Optional: in `apps/web`, set `NEXT_PUBLIC_API_URL=http://localhost:3000` if the API runs elsewhere.
