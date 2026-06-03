# Roadmap

## 1. Data ingestion pipeline — done

Ingest plain-text learning material and store it for later retrieval: document → chunks → embeddings in Postgres with pgvector.

### Flow

1. **Create document (paste)** — `POST /documents` with `title` and `content`
2. **Create document (file)** — `POST /documents/from-file` with `multipart` field `file` (PDF or `.txt`) and optional `title`
3. **List documents** — `GET /documents` (newest first)
4. **Get document** — `GET /documents/:id` (current user only)
5. **Update document (paste)** — `PATCH /documents/:id` with optional `title` and/or `content`; re-chunks and re-embeds when `content` changes
6. **Replace file** — `PATCH /documents/:id/file` with a new PDF or `.txt`; updates extracted text and re-indexes
7. **Download original** — `GET /documents/:id/file` streams the stored upload
8. **Delete document** — `DELETE /documents/:id` removes the document, its chunks, embeddings, and stored file
9. **Chunk** — sliding window (1000 characters, 200 overlap) via `ChunkingService`
10. **Embed** — Gemini `gemini-embedding-001` (1536 dimensions, `RETRIEVAL_DOCUMENT`) via `AiService`
11. **Store** — rows in `Document`, `Chunk`, and `Embedding` (`vector(1536)`); original files in S3 at `{userId}/{documentId}/original.{pdf|txt}`

Orchestration: `apps/api/src/documents/documents.service.ts`

### Data model

- `Document` — source title, full extracted text, `sourceType` (`PASTE`, `PDF`, `TEXT_FILE`), optional file metadata
- `Chunk` — indexed text segments per document
- `Embedding` — one vector per chunk (pgvector)

### Try it locally

1. Start Postgres and the API (see [README](README.md#development))
2. Set `GEMINI_API_KEY` in `apps/api/.env`
3. Open Swagger at `http://localhost:3000/api`
4. Call **POST /documents**, for example:

```json
{
  "title": "Intro to Vietnamese",
  "content": "Xin chào means hello."
}
```

### Tests

```bash
cd apps/api && npm test -- documents.service.spec
```

### Config

- `S3_BUCKET` — bucket name (default `llc-documents`)
- `AWS_REGION` — region (default `us-east-1`)
- `AWS_ENDPOINT_URL` — LocalStack URL in dev (`http://localhost:4566`); unset for real AWS
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` — `test` / `test` for LocalStack
- `MAX_UPLOAD_BYTES` — max upload size (default 10 MB)

### Out of scope (for now)

- Audio, DOCX
- Presigned browser uploads
- Background jobs for large documents

## 2. Vector similarity search + RAG — done

Answer questions from ingested material: embed the query, find the closest chunks with pgvector, then generate a grounded reply with Gemini.

### Flow

1. **Embed query** — `RETRIEVAL_QUERY` via `AiService.createQueryEmbedding`
2. **Retrieve** — cosine distance (`<=>`) on `Embedding.vector`, join `Chunk` and `Document`, optional filter by `documentId`
3. **Rank** — top `topK` chunks (default 5, max 20); `similarity = 1 - distance`
4. **Generate** — `AiService.generateAnswerFromContext` with `gemini-2.5-flash` over retrieved chunk text (skipped when no hits)

Orchestration: `apps/api/src/search/search.service.ts`

### API

**POST /search**

```json
{
  "query": "What does Xin chào mean?",
  "topK": 5
}
```

Optional: `"documentId": "<uuid>"` to search within one document.

Response:

```json
{
  "answer": "Xin chào is a common way to say hello in Vietnamese.",
  "sources": [
    {
      "chunkId": "...",
      "content": "Xin chào is the most common way to say hello...",
      "chunkIndex": 0,
      "documentId": "...",
      "documentTitle": "Vietnamese greetings — lesson 1",
      "similarity": 0.85
    }
  ]
}
```

### Try it locally

1. Complete [section 1](#1-data-ingestion-pipeline--done) so chunks and embeddings exist.
2. Open Swagger at `http://localhost:3000/api`
3. Call **POST /search** with a question that matches your ingested content.

Example after ingesting the section 1 sample:

```json
{
  "query": "What does Xin chào mean?",
  "topK": 5
}
```

### Tests

```bash
cd apps/api && npm test -- search.service.spec
```

### Out of scope (for now)

- pgvector HNSW / IVFFlat index (sequential scan is fine for small corpora)
- Streaming responses
- Chat history or multi-turn sessions
- Inline citation markers in the answer text

## 3. Learning companion UI — done

Next.js app to add lesson material and ask questions without Swagger.

### Flow

1. **View material** — `GET /documents` on load; expandable list in the UI
2. **Add material** — paste (`POST /documents`) or upload PDF/`.txt` (`POST /documents/from-file`)
3. **Edit material** — paste docs use `PATCH /documents/:id`; file docs use replace upload and optional title
4. **Download original** — file-based docs can download via `GET /documents/:id/file`
5. **Delete material** — `DELETE /documents/:id` with confirmation
5. **Ask** — form calls `POST /search` with optional scope to any listed document
6. **View answers** — answer plus source chunks with similarity scores

App: `apps/web/app/components/companion-app.tsx`

### Try it locally

1. Start Postgres, API (port 3000), and web (port 3001) — see [README](README.md#development)
2. Open `http://localhost:3001`
3. Add material, then ask a question that matches what you pasted

### Out of scope (for now)

- Mobile layout polish

## 4. User authentication — done

Email/password accounts with JWT access tokens, per-user documents, and auth pages in the web app.

### Data model

- `User` — `email`, `passwordHash`, `role` (`LEARNER` or `ADMIN`)
- `PasswordResetToken` — hashed reset tokens for dev password recovery
- `Document.userId` — each document belongs to one user

### API

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `POST` | `/auth/register` | Public | Creates a `LEARNER` account |
| `POST` | `/auth/login` | Public | Returns `accessToken` + user profile |
| `GET` | `/auth/me` | Bearer | Current user |
| `POST` | `/auth/forgot-password` | Public | Dev: returns `resetToken` in JSON when user exists |
| `POST` | `/auth/reset-password` | Public | `{ token, newPassword }` |

Protected: `GET/POST /documents`, `POST /search`, `POST /ai/embedding-test`.

### Web

- `/login`, `/signup`, `/forgot-password`, `/reset-password`
- Home (`/`) requires a valid token; companion UI shows email and log out

### Try it locally

1. Set `JWT_SECRET` in `apps/api/.env` (see `.env.example`).
2. Run migrate and seed: `npx prisma migrate dev && npx prisma db seed`.
3. Sign up at `http://localhost:3001/signup`, or sign in as admin (`admin@example.com` / `adminpassword` by default).

### Out of scope (for now)

- Email delivery for password reset
- OAuth, refresh tokens, email verification
