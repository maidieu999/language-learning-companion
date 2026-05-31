# Roadmap

## 1. Data ingestion pipeline — done

Ingest plain-text learning material and store it for later retrieval: document → chunks → embeddings in Postgres with pgvector.

### Flow

1. **Create document** — `POST /documents` with `title` and `content`
2. **Chunk** — sliding window (1000 characters, 200 overlap) via `ChunkingService`
3. **Embed** — Gemini `gemini-embedding-001` (1536 dimensions, `RETRIEVAL_DOCUMENT`) via `AiService`
4. **Store** — rows in `Document`, `Chunk`, and `Embedding` (`vector(1536)`)

Orchestration: `apps/api/src/documents/documents.service.ts`

### Data model

- `Document` — source title and full text
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

### Out of scope (for now)

- File upload (PDF, audio, etc.)
- Background jobs for large documents
- Update, delete, or re-index
