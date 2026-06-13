# Roadmap

## 1. Data ingestion pipeline — done

Ingest plain-text learning material and store it for later retrieval: document → chunks → embeddings in Postgres with pgvector.

### Flow

1. **Create document (paste)** — `POST /documents` with `title` and `content`
2. **Create document (file)** — `POST /documents/from-file` with `multipart` field `file` (PDF, Word `.docx`, or `.txt`) and optional `title`; PDF/DOCX converted to Markdown via MarkItDown (`services/markitdown`)
3. **List documents** — `GET /documents` (newest first)
4. **Get document** — `GET /documents/:id` (current user only)
5. **Update document (paste)** — `PATCH /documents/:id` with optional `title` and/or `content`; re-chunks and re-embeds when `content` changes
6. **Replace file** — `PATCH /documents/:id/file` with a new PDF, `.docx`, or `.txt`; updates extracted text and re-indexes
7. **Download original** — `GET /documents/:id/file` streams the stored upload
8. **Delete document** — `DELETE /documents/:id` removes the document, its chunks, embeddings, and stored file
9. **Chunk** — Markdown-aware sections when headings exist, otherwise sliding window (1000 characters, 200 overlap) via `ChunkingService`
10. **Embed** — Gemini `gemini-embedding-001` (1536 dimensions, `RETRIEVAL_DOCUMENT`) via `AiService`
11. **Store** — rows in `Document`, `Chunk`, and `Embedding` (`vector(1536)`); original files in S3 at `{userId}/{documentId}/original.{pdf|docx|txt}`

Orchestration: `apps/api/src/documents/documents.service.ts`  
Conversion: `services/markitdown` (FastAPI + MarkItDown), called by `apps/api/src/documents/markitdown.client.ts`

### Data model

- `Document` — source title, full extracted text (Markdown for PDF/DOCX uploads), `sourceType` (`PASTE`, `PDF`, `TEXT_FILE`, `DOCX`), optional file metadata
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
- `MARKITDOWN_URL` — converter service URL (default `http://localhost:8000`)
- `MARKITDOWN_TIMEOUT_MS` — conversion timeout (default 60000)

### Out of scope (for now)

- Audio, PPTX, HTML
- Presigned browser uploads
- Background jobs for large documents

## 2. Vector similarity search + RAG — done

Answer questions from ingested material. A classifier picks **retrieval** (vector search + excerpts) or **document_scope** (full document). Summarize-style questions require a selected `documentId`.

### Flow

1. **Classify** — `AiService.classifyQueryIntent` (`gemini-2.5-flash`, JSON intent)
2. **Retrieval path** (`intent: retrieval`):
   - Embed query — `RETRIEVAL_QUERY` via `AiService.createQueryEmbedding`
   - Retrieve — cosine distance (`<=>`) on `Embedding.vector`, join `Chunk` and `Document`, optional filter by `documentId`
   - Rank — top `topK` chunks (default 5, max 20); `similarity = 1 - distance`
   - Generate — `AiService.generateAnswerFromContext` over retrieved chunk text (skipped when no hits)
3. **Document-scope path** (`intent: document_scope`, `documentId` required):
   - Load full `Document.content` and all chunks for the document
   - Single-shot generate when content ≤ 80k chars; otherwise map-reduce over chunk batches
   - Returns all chunks as sources (`strategy: full_document`)

Orchestration: `apps/api/src/search/search.service.ts`

### API

**POST /search**

```json
{
  "query": "What does Xin chào mean?",
  "topK": 5
}
```

Optional: `"documentId": "<uuid>"` to search within one document. Required for summarize, outline, or whole-lesson questions (`document_scope` intent); otherwise the API returns 400.

Response:

```json
{
  "answer": "Xin chào is a common way to say hello in Vietnamese.",
  "strategy": "rag",
  "intent": "retrieval",
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

Next.js app for learners to add lesson material and ask questions without Swagger. The home page routes by role: `LEARNER` → companion features; `ADMIN` → [section 5](#5-admin-dashboard--done).

### Structure

| Piece | Path |
|-------|------|
| Home + auth gate | `apps/web/app/components/home-page.tsx` |
| Feature router (`?feature=`) | `apps/web/app/components/companion-app.tsx` |
| Shell (brand, nav, logout) | `apps/web/app/components/companion-shell.tsx` |
| Feature registry | `apps/web/app/components/companion-features.ts` |
| Ask your material | `apps/web/app/components/features/document-research/document-research-feature.tsx` |
| Describe a picture (placeholder) | `apps/web/app/components/features/image-describe/image-describe-feature.tsx` |

Learner features switch via `FeatureNav`. Default tab is **Ask your material** (`/`). **Describe a picture** is `/?feature=describe` (UI wireframe only; see [section 6](#6-describe-a-picture--planned)).

### Flow (Ask your material)

1. **View material** — `GET /documents` on load; expandable list in the UI
2. **Add material** — paste (`POST /documents`) or upload PDF/`.docx`/`.txt` (`POST /documents/from-file`)
3. **Edit material** — paste docs use `PATCH /documents/:id`; file docs use replace upload and optional title
4. **Download original** — file-based docs can download via `GET /documents/:id/file`
5. **Delete material** — `DELETE /documents/:id` with confirmation
6. **Ask** — form calls `POST /search` with optional scope to any listed document
7. **View answers** — answer plus source chunks with similarity scores

### Try it locally

1. Start Postgres, API (port 3000), and web (port 3001) — see [README](README.md#development)
2. Sign in as a learner at `http://localhost:3001/login`
3. Add material on **Ask your material**, then ask a question that matches what you pasted

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

**Bearer JWT required** (except public auth routes):

- Documents — `GET/POST /documents`, `POST /documents/from-file`, `GET/PATCH/DELETE /documents/:id`, `PATCH /documents/:id/file`, `GET /documents/:id/file`
- Search — `POST /search`
- AI dev — `POST /ai/embedding-test`
- Admin — `GET /admin/users`, `GET /admin/users/:userId/documents` (`ADMIN` role only)

### Web

- `/login`, `/signup`, `/forgot-password`, `/reset-password`
- Home (`/`) requires a valid token; shows email and log out in the app header

### Try it locally

1. Set `JWT_SECRET` in `apps/api/.env` (see `.env.example`).
2. Run migrate and seed: `npx prisma migrate dev && npx prisma db seed`.
3. Sign up at `http://localhost:3001/signup`, or sign in as admin using `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `apps/api/.env` (defaults in `.env.example`).

### Out of scope (for now)

- Email delivery for password reset
- OAuth, refresh tokens, email verification

## 5. Admin dashboard — done

Read-only view of users and their ingested material for `ADMIN` accounts.

### API

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `GET` | `/admin/users` | Bearer + `ADMIN` | All users with document counts |
| `GET` | `/admin/users/:userId/documents` | Bearer + `ADMIN` | That user's documents (newest first) |

Orchestration: `apps/api/src/admin/admin.service.ts`

### Web

- Home (`/`) renders `AdminApp` when `user.role === 'ADMIN'`
- List users, select one, browse their documents (expand for content preview)
- App: `apps/web/app/components/admin-app.tsx`

### Tests

```bash
cd apps/api && npm test -- admin.service.spec admin.controller.spec
```

### Out of scope (for now)

- Edit or delete user material from the admin UI
- User management (disable accounts, change roles)

## 6. Describe a picture — planned (P0)

Practice describing images with AI prompts and feedback. The learner tab exists as a disabled wireframe; no API yet. Highest priority: already in the UI and a clear product differentiator.

### Planned flow

1. **Upload** — image (PNG, JPEG, WebP)
2. **Brainstorm** — vocabulary and structure hints from the model
3. **Your answer** — learner writes a description (English, Chinese, or Vietnamese)
4. **Feedback** — score and suggestions

### Web (current)

- Tab: **Describe a picture** (`/?feature=describe`)
- Placeholder: `apps/web/app/components/features/image-describe/image-describe-feature.tsx`

### Out of scope (for now)

- Backend endpoints and persistence for image sessions

---

## Future work — prioritized

| Priority | Item | Why | Section |
|----------|------|-----|---------|
| P0 | Describe a picture (end-to-end) | Already in UI; clear product differentiator | [6](#6-describe-a-picture--planned-p0) |
| P1 | Chat sessions over material | Big UX jump with existing RAG | [7](#7-multi-turn-research-chat--planned-p1) |
| P1 | Citations + streaming in research UI | Trust and perceived speed; smaller than full chat | [8](#8-citations-and-streaming-in-research-ui--planned-p1) |
| P2 | User language/level profile | Cheap multiplier on all AI features | [9](#9-learner-language-and-level-profile--planned-p2) |
| P2 | Background ingest jobs | Needed before large files / many users | [10](#10-background-document-ingest--planned-p2) |
| P3 | Audio ingest, quizzes/flashcards | Expands companion beyond Q&A | [11](#11-audio-ingest-and-practice-modes--planned-p3) |
| P3 | Production auth + deploy | Before any public beta | [12](#12-production-auth-and-deployment--planned-p3) |
| P4 | pgvector index, presigned uploads, `packages/` | Scale and maintainability | [13](#13-scale-and-shared-packages--planned-p4) |

## 7. Multi-turn research chat — planned (P1)

Follow-up questions over ingested material (“explain simpler”, “give an example”) instead of only single `POST /search` calls.

### Planned flow

1. **Session** — learner starts a thread, optionally scoped to one `documentId`
2. **Message** — user turn stored; API retrieves context via existing RAG (retrieval or document_scope)
3. **Reply** — model answer with prior turns in the prompt; sources attached like today
4. **History** — list sessions and resume from the web UI

### API (sketch)

- `POST /chat/sessions`, `GET /chat/sessions`, `GET /chat/sessions/:id`
- `POST /chat/sessions/:id/messages` — body: `{ content }`; response: answer + sources

### Data model (sketch)

- `ChatSession` — `userId`, optional `documentId`, `title`, timestamps
- `ChatMessage` — `sessionId`, `role` (`user` | `assistant`), `content`, optional `sources` JSON

### Web

- Chat panel on **Ask your material** or a dedicated sub-view; reuse `DocumentResearchFeature` document scope

### Builds on

- [Section 2](#2-vector-similarity-search--rag--done) — `SearchService`, intent classification, chunk retrieval

### Out of scope (for now)

- Shared sessions between users
- Tool calling beyond RAG

## 8. Citations and streaming in research UI — planned (P1)

Improve the existing research feature without full chat sessions.

### Planned flow

1. **Streaming** — `POST /search` streams answer tokens (SSE or chunked JSON); web renders incrementally
2. **Citations** — map answer spans or footnotes to `sources[]` chunk ids; highlight source cards on click
3. **Metadata** — show `strategy` and `intent` in the UI for transparency

### API

- Extend `POST /search` with `Accept: text/event-stream` or a `?stream=true` query flag
- Response shape unchanged for non-streaming clients

### Web

- `document-research-feature.tsx` — stream handler, citation UI

### Out of scope (for now)

- Editing answers after generation

## 9. Learner language and level profile — planned (P2)

Store preferences on `User` and inject them into prompts for search, image describe, and future practice modes.

### Planned fields (sketch)

- `nativeLanguage` — e.g. `en`, `vi`, `zh`
- `targetLanguage` — language being learned
- `level` — CEFR-style (`A1` … `C2`) or free text

### API

- `PATCH /auth/me` or `PATCH /users/me` for profile fields
- `GET /auth/me` returns profile

### Web

- Settings page or onboarding step after signup

### Out of scope (for now)

- Per-document language detection override UI

## 10. Background document ingest — planned (P2)

Move chunk + embed off the request path for large uploads.

### Planned flow

1. **Create** — document row with `status: processing`; return immediately
2. **Worker** — job chunks text, writes embeddings, sets `status: ready` or `failed`
3. **Poll / notify** — web polls `GET /documents/:id` or shows processing badge in the list

### API

- Document responses include `status` and optional `processingError`
- Re-index on update uses the same queue

### Infra (options)

- In-process queue (BullMQ + Redis) or managed queue (SQS); start simple for dev

### Out of scope (for now)

- Priority queues per user tier

## 11. Audio ingest and practice modes — planned (P3)

Expand the companion beyond Q&A on text.

### Audio ingest

1. Upload audio (e.g. MP3, M4A) — same S3 pattern as PDFs
2. Transcribe — speech-to-text (Gemini or dedicated STT)
3. Index — same chunk + embed pipeline as [section 1](#1-data-ingestion-pipeline--done)

### Practice modes (sketch)

- **Flashcards** — vocab/phrases extracted from a document via one-shot generate; spaced repetition later
- **Quiz** — multiple-choice or short-answer from document content; store attempts optional

### API (sketch)

- `POST /documents/from-audio`, `POST /documents/:id/flashcards`, `POST /documents/:id/quiz`

### Out of scope (for now)

- Pronunciation scoring from learner audio

## 12. Production auth and deployment — planned (P3)

Ship safely beyond local dev.

### Auth

- Email delivery for password reset (no `resetToken` in JSON)
- Refresh tokens + rotation
- Optional OAuth (Google)
- Email verification on register

### Deployment

- Docker images for `apps/api` and `apps/web`
- Migrate on deploy; health endpoints
- Secrets: `JWT_SECRET`, `GEMINI_API_KEY`, S3, DB URL
- CI: lint, test, build on PR

### Out of scope (for now)

- Multi-region active-active

## 13. Scale and shared packages — planned (P4)

Hardening when corpora and clients grow.

### pgvector index

- HNSW or IVFFlat on `Embedding.vector` when sequential scan is too slow

### Presigned uploads

- Browser uploads directly to S3; API records metadata and triggers indexing

### `packages/` monorepo

- Shared TypeScript types for documents, search, auth DTOs
- Optional generated or hand-written API client for web (and future mobile)

### Out of scope (for now)

- Read replicas and sharding
