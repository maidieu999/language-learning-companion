# API code style

Conventions for `apps/api` in the Language Learning Companion monorepo.

## Project layout

```
apps/api/
  prisma/           # schema and migrations
  src/
    <feature>/      # e.g. documents/
    database/       # shared DB helpers (BaseRepository, prisma.types)
    prisma/         # PrismaModule, PrismaService, adapter setup
  test/             # unit tests (mirror src/ structure)
```

- **Feature modules** live under `src/<feature>/` (e.g. `documents`, and later `chunks`, `lessons`).
- **Cross-cutting infra** stays at `src/prisma/`, `src/database/`, `src/swagger.ts`, `src/main.ts`.
- **Unit tests** live under `test/`, not beside source files in `src/`.
- Import app code with the `src/` path alias (see `tsconfig.json` and Jest `moduleNameMapper`).

## Module structure

Each feature module typically includes:

| Piece | Role |
|--------|------|
| `*.module.ts` | Wires controllers, services, repositories |
| `*.controller.ts` | HTTP routing; delegates to one service method |
| `*.service.ts` | Business logic; uses repositories only |
| `*.repository.ts` | Prisma access; extends `BaseRepository` |
| `dto/*.dto.ts` | Request/response shapes, validation, OpenAPI |
| `test/<feature>/` | Unit tests with mocked repositories |

Optional later (when you add external APIs):

| Piece | Role |
|--------|------|
| `*.gate.ts` | HTTP client to a third-party service (no vendor SDKs) |

Register new feature modules in `AppModule`.

## Domain language

Use product terms from the schema and docs: **Document**, **Chunk**, learner content, and similar. Name types and methods after what they represent (`createDocument`, `findChunksByDocumentId`), not generic names like `data` or `processPayload`.

Prisma model types that clash with globals are aliased in `src/database/prisma.types.ts` (e.g. `DocumentModel` instead of `Document`).

## REST API

- Prefer **resource-oriented paths**: `POST /documents`, `GET /documents/:id` when the identifier is a resource ID.
- Use **query parameters** for filters, pagination, and optional lookups (e.g. `GET /documents?title=...`), not for replacing normal resource routes.
- Request bodies are **JSON objects** with named fields. Avoid bare arrays or primitives at the top level; wrap them (e.g. `{ "chunkIds": ["..."] }`).
- Controllers stay thin: validate input, call **one** service method, return the result. No Prisma calls in controllers.

OpenAPI is served at `/api` via `setupSwagger()` in `main.ts`. Decorate controllers and DTOs with `@ApiTags`, `@ApiOperation`, and `@ApiProperty`.

### Controller typing

- Type every controller parameter and return value explicitly.
- A controller method should usually contain a single service call and return its result, without extra logic.

## DTOs and validation

- DTOs are **classes** in `<feature>/dto/`.
- Use **`class-validator`** decorators (`@IsString()`, `@MinLength()`, etc.) and **`@ApiProperty()`** for Swagger.
- Global `ValidationPipe` in `main.ts` uses `whitelist: true` and `transform: true`; unknown fields are stripped.

Example:

```typescript
export class CreateDocumentDto {
  @ApiProperty({ example: 'Intro to Vietnamese' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Xin chào means hello.' })
  @IsString()
  @MinLength(1)
  content: string;
}
```

## Services

- **Never** call Prisma directly from a service. Inject and use the feature **repository**.
- Keep methods short (aim for under ~20 lines). Extract helpers when logic branches grow.
- Map DTOs to repository inputs in the service (field-by-field), as in `DocumentsService.createDocument`.
- Avoid large files; split when a service approaches ~200 lines.
- Do not use third-party SDKs for external APIs. Use `*.gate.ts` modules with plain HTTP when integrations are added.

## Repositories

Repositories extend `BaseRepository` and access the database only through `this.getClient()` (backed by `PrismaService.getClient()`).

The repository layer sits between services and Prisma. It controls what is read and written; it does not contain product rules beyond data shape and persistence.

### Allowed inputs

Repository methods should accept Prisma-typed inputs where possible:

- `where`: `EntityWhereUniqueInput` or `EntityWhereInput`
- `data`: `EntityCreateInput` or `EntityUpdateInput`
- `orderBy`, `take`, `skip` for list queries
- `options`: e.g. `{ transaction }` when transactions are required

Define shared types in `src/database/prisma.types.ts`.

### Naming conventions

Use **domain-specific** method names tied to the Prisma model:

| Intent | Example |
|--------|---------|
| Create | `createDocument(data)` |
| One by unique key | `findDocument(where)` or `getDocumentOrThrow(where)` |
| First match | `findFirstDocument(where)` |
| Many | `findDocuments(where)` |
| Update | `updateDocument(where, data)` |
| Delete | `deleteDocument(where)` |

**`getDocumentOrThrow` / `findUniqueOrThrow`**: use when the row must exist; a missing row is an error.

**`findDocument` / `findFirst`**: use when absence is normal.

Whenever the lookup is by stable unique id and you expect the row to exist, prefer the throwing variant for clarity.

### Examples

Fetch by unique key (throws if missing):

```typescript
getDocumentOrThrow(where: DocumentWhereUniqueInput): Promise<DocumentModel> {
  return this.getClient().document.findUniqueOrThrow({ where });
}
```

Fetch first match:

```typescript
findFirstDocument(where: DocumentWhereInput): Promise<DocumentModel | null> {
  return this.getClient().document.findFirst({ where });
}
```

Fetch many:

```typescript
findDocuments(where: DocumentWhereInput): Promise<DocumentModel[]> {
  return this.getClient().document.findMany({ where });
}
```

Create:

```typescript
createDocument(data: CreateDocumentData): Promise<DocumentModel> {
  return this.getClient().document.create({ data });
}
```

Update:

```typescript
updateDocument(
  where: DocumentWhereUniqueInput,
  data: Prisma.DocumentUpdateInput,
): Promise<DocumentModel> {
  return this.getClient().document.update({ where, data });
}
```

Delete:

```typescript
deleteDocument(where: DocumentWhereUniqueInput): Promise<DocumentModel> {
  return this.getClient().document.delete({ where });
}
```

Add `updateMany` / `deleteMany` following the same patterns when needed. For unusual queries, keep SQL/Prisma in the repository and keep business logic in services; discuss one-off patterns in review if they break these rules.

### Transactions

Prefer Prisma [nested writes](https://www.prisma.io/docs/orm/prisma-client/queries/relation-queries#nested-writes) and [sequential operations](https://www.prisma.io/docs/orm/prisma-client/queries/transactions#sequential-prisma-client-operations).

When those are not enough, use interactive `$transaction` inside a repository, not in services or controllers.

## Prisma

- Schema: `prisma/schema.prisma`. Run migrations via the project Prisma scripts.
- `PrismaService` **wraps** `PrismaClient` (composition); it does not extend `PrismaClient`.
- Postgres uses the driver adapter from `create-pg-adapter.ts`. `DATABASE_URL` is required at startup.

## Testing

- Unit specs: `test/**/*.spec.ts`, mirroring `src/` (e.g. `test/documents/documents.service.spec.ts`).
- Mock repositories in service tests; avoid hitting the database in unit tests.
- E2E: `test/app.e2e-spec.ts`; add feature e2e tests as endpoints grow.

## Logging

No structured logging standard is enforced yet. When you add it, use stable `message` strings and include relevant ids (`documentId`, `chunkId`) and errors for anything you might debug in production. Extend this section when you choose a provider (e.g. Pino, Datadog).

## General TypeScript

- Strict null checks are on; avoid `any` unless ESLint overrides are intentional.
- ESLint relaxes some `no-unsafe-*` rules for controllers, DTOs, and repositories where decorators and Prisma delegates confuse the type checker. Still type public APIs explicitly.
- Prefer `map` / `filter` over manual `for` loops when readability is equal or better.
- Minimize `switch`, `while`, and nested `for` loops unless they clearly simplify the code.

## Naming (domain-driven)

Align code names with product language: documents, chunks, lessons, learners.

**Variables**

- Bad: `data`
- Good: `document`, `createDocumentDto`

**Functions**

- Bad: `processData()`
- Good: `createDocument()`, `findDocumentsByTitle()`

## Commits

Use conventional commits scoped to the app:

```text
feat(api): add document creation endpoint
fix(api): handle missing DATABASE_URL on boot
```
