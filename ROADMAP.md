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
