'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  createDocument,
  createDocumentFromFile,
  deleteDocument,
  downloadDocumentFile,
  listDocuments,
  replaceDocumentFile,
  search,
  updateDocument,
} from '@/lib/api';
import { AppBrand } from '@/app/components/ui/app-brand';
import { AppPageShell } from '@/app/components/ui/app-page-shell';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { clearAccessToken } from '@/lib/auth';
import type { Document, DocumentSourceType, SearchResult, User } from '@/lib/types';

interface CompanionAppProps {
  user: User;
}

type IngestStatus = 'idle' | 'loading' | 'success' | 'error';
type SearchStatus = 'idle' | 'loading' | 'success' | 'error';
type ListStatus = 'idle' | 'loading' | 'success' | 'error';
type EditStatus = 'idle' | 'loading' | 'error';
type IngestMode = 'paste' | 'file';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function contentPreview(content: string, maxLength = 160): string {
  if (content.length <= maxLength) {
    return content;
  }
  return `${content.slice(0, maxLength).trimEnd()}…`;
}

function sourceTypeLabel(sourceType: DocumentSourceType): string {
  if (sourceType === 'PDF') {
    return 'PDF';
  }
  if (sourceType === 'TEXT_FILE') {
    return 'Text file';
  }
  return 'Pasted text';
}

function isFileDocument(doc: Document): boolean {
  return doc.sourceType === 'PDF' || doc.sourceType === 'TEXT_FILE';
}

export function CompanionApp({ user }: CompanionAppProps) {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [listStatus, setListStatus] = useState<ListStatus>('idle');
  const [listError, setListError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editReplaceFile, setEditReplaceFile] = useState<File | null>(null);
  const [editStatus, setEditStatus] = useState<EditStatus>('idle');
  const [editError, setEditError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [ingestMode, setIngestMode] = useState<IngestMode>('paste');
  const [ingestFile, setIngestFile] = useState<File | null>(null);
  const [ingestStatus, setIngestStatus] = useState<IngestStatus>('idle');
  const [ingestError, setIngestError] = useState<string | null>(null);
  const [ingestMessage, setIngestMessage] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [topK, setTopK] = useState(5);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>('idle');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);

  const loadDocuments = useCallback(async () => {
    setListStatus('loading');
    setListError(null);

    try {
      const items = await listDocuments();
      setDocuments(items);
      setListStatus('success');
    } catch (error) {
      setListStatus('error');
      setListError(
        error instanceof Error ? error.message : 'Failed to load material',
      );
    }
  }, []);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  async function handleIngest(event: FormEvent) {
    event.preventDefault();
    setIngestStatus('loading');
    setIngestError(null);
    setIngestMessage(null);

    try {
      const document =
        ingestMode === 'file'
          ? await (() => {
              if (!ingestFile) {
                throw new Error('Choose a PDF or text file to upload');
              }
              return createDocumentFromFile(
                ingestFile,
                title.trim() || undefined,
              );
            })()
          : await createDocument({ title: title.trim(), content });
      setTitle('');
      setContent('');
      setIngestFile(null);
      setIngestStatus('success');
      setIngestMessage(`Saved "${document.title}". You can ask questions about it now.`);
      await loadDocuments();
    } catch (error) {
      setIngestStatus('error');
      setIngestError(error instanceof Error ? error.message : 'Failed to save material');
    }
  }

  function startEditing(doc: Document) {
    setEditingId(doc.id);
    setEditTitle(doc.title);
    setEditContent(doc.content);
    setEditReplaceFile(null);
    setEditStatus('idle');
    setEditError(null);
    setExpandedId(doc.id);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditTitle('');
    setEditContent('');
    setEditReplaceFile(null);
    setEditStatus('idle');
    setEditError(null);
  }

  async function handleSaveEdit(event: FormEvent, doc: Document) {
    event.preventDefault();
    setEditStatus('loading');
    setEditError(null);

    try {
      if (isFileDocument(doc)) {
        if (!editReplaceFile) {
          if (editTitle.trim() !== doc.title) {
            await updateDocument(doc.id, { title: editTitle.trim() });
          } else {
            throw new Error('Choose a replacement PDF or text file');
          }
        } else {
          await replaceDocumentFile(
            doc.id,
            editReplaceFile,
            editTitle.trim() || undefined,
          );
        }
      } else {
        await updateDocument(doc.id, {
          title: editTitle.trim(),
          content: editContent,
        });
      }
      cancelEditing();
      await loadDocuments();
    } catch (error) {
      setEditStatus('error');
      setEditError(
        error instanceof Error ? error.message : 'Failed to update material',
      );
    }
  }

  async function handleDelete(doc: Document) {
    if (
      !window.confirm(
        `Delete "${doc.title}"? This removes the document and its search index.`,
      )
    ) {
      return;
    }

    setDeletingId(doc.id);
    setDeleteError(null);

    try {
      await deleteDocument(doc.id);
      if (expandedId === doc.id) {
        setExpandedId(null);
      }
      if (editingId === doc.id) {
        cancelEditing();
      }
      if (documentId === doc.id) {
        setDocumentId('');
      }
      await loadDocuments();
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : 'Failed to delete material',
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    setSearchStatus('loading');
    setSearchError(null);
    setSearchResult(null);

    try {
      const result = await search({
        query: query.trim(),
        topK,
        documentId: documentId || undefined,
      });
      setSearchResult(result);
      setSearchStatus('success');
    } catch (error) {
      setSearchStatus('error');
      setSearchError(error instanceof Error ? error.message : 'Search failed');
    }
  }

  return (
    <AppPageShell>
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <AppBrand />
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">{user.email}</span>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                clearAccessToken();
                router.replace('/login');
              }}
              className="px-3 py-1.5"
            >
              Log out
            </Button>
          </div>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Learn from your own material
        </h1>
        <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
          Add lesson text, then ask questions. Answers are grounded in what you
          uploaded.
        </p>
      </header>

      <Card aria-labelledby="saved-material-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              id="saved-material-heading"
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Saved material
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Your saved documents, newest first.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadDocuments()}
            disabled={listStatus === 'loading'}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            {listStatus === 'loading' ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {listError ? (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-100"
          >
            {listError}
          </p>
        ) : null}

        {listStatus === 'loading' && documents.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            Loading…
          </p>
        ) : null}

        {listStatus !== 'loading' && documents.length === 0 && !listError ? (
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            No material yet. Add your first lesson below.
          </p>
        ) : null}

        {deleteError ? (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-100"
          >
            {deleteError}
          </p>
        ) : null}

        {documents.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {documents.map((doc) => {
              const expanded = expandedId === doc.id;
              const editing = editingId === doc.id;
              return (
                <li
                  key={doc.id}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 transition hover:ring-1 hover:ring-brand-light/10 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex items-start gap-2 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (editing) {
                          return;
                        }
                        setExpandedId(expanded ? null : doc.id);
                      }}
                      className="flex min-w-0 flex-1 flex-col gap-1 text-left"
                      aria-expanded={expanded}
                    >
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {doc.title}
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {formatDate(doc.createdAt)}
                        {' · '}
                        {sourceTypeLabel(doc.sourceType)}
                        {doc.originalFilename
                          ? ` · ${doc.originalFilename}`
                          : null}
                      </span>
                      {!expanded && !editing ? (
                        <span className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                          {contentPreview(doc.content)}
                        </span>
                      ) : null}
                    </button>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => startEditing(doc)}
                        disabled={deletingId === doc.id}
                        className="rounded-lg border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(doc)}
                        disabled={deletingId === doc.id}
                        className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-800 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-200 dark:hover:bg-red-950"
                      >
                        {deletingId === doc.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </div>
                  {editing ? (
                    <form
                      onSubmit={(e) => void handleSaveEdit(e, doc)}
                      className="space-y-4 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800"
                    >
                      <label className="block space-y-1.5">
                        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                          Title
                        </span>
                        <input
                          type="text"
                          required
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-brand/30 focus:border-brand focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                        />
                      </label>
                      {isFileDocument(doc) ? (
                        <>
                          {doc.hasFile ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  void downloadDocumentFile(
                                    doc.id,
                                    doc.originalFilename ?? 'download',
                                  ).catch((error) => {
                                    setEditError(
                                      error instanceof Error
                                        ? error.message
                                        : 'Download failed',
                                    );
                                  })
                                }
                                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                              >
                                Download original
                              </button>
                              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                {doc.originalFilename}
                              </span>
                            </div>
                          ) : null}
                          <label className="block space-y-1.5">
                            <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                              Replace file
                            </span>
                            <input
                              type="file"
                              accept=".pdf,.txt,application/pdf,text/plain"
                              onChange={(e) =>
                                setEditReplaceFile(e.target.files?.[0] ?? null)
                              }
                              className="block w-full text-sm text-zinc-700 file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:text-sm file:font-medium file:text-white dark:text-zinc-300"
                            />
                          </label>
                          <p className="whitespace-pre-wrap rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm leading-relaxed text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
                            {contentPreview(doc.content, 400)}
                          </p>
                        </>
                      ) : (
                        <label className="block space-y-1.5">
                          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                            Content
                          </span>
                          <textarea
                            required
                            rows={6}
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm leading-relaxed text-zinc-900 outline-none ring-brand/30 focus:border-brand focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                          />
                        </label>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="submit"
                          disabled={editStatus === 'loading'}
                          className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-60"
                        >
                          {editStatus === 'loading'
                            ? 'Saving and re-indexing…'
                            : 'Save changes'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          disabled={editStatus === 'loading'}
                          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                          Cancel
                        </button>
                      </div>
                      {editError ? (
                        <p
                          role="alert"
                          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-100"
                        >
                          {editError}
                        </p>
                      ) : null}
                    </form>
                  ) : null}
                  {expanded && !editing ? (
                    <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                        {doc.content}
                      </p>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </Card>

      <Card aria-labelledby="add-material-heading">
        <h2
          id="add-material-heading"
          className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Add material
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Paste lesson text or upload a PDF or plain text file.
        </p>

        <form onSubmit={handleIngest} className="mt-5 space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              How to add
            </legend>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="ingest-mode"
                  checked={ingestMode === 'paste'}
                  onChange={() => setIngestMode('paste')}
                />
                Paste text
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="ingest-mode"
                  checked={ingestMode === 'file'}
                  onChange={() => setIngestMode('file')}
                />
                Upload file
              </label>
            </div>
          </fieldset>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Title{ingestMode === 'file' ? ' (optional)' : ''}
            </span>
            <input
              type="text"
              required={ingestMode === 'paste'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                ingestMode === 'file'
                  ? 'Defaults to the file name'
                  : 'Vietnamese greetings — lesson 1'
              }
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-brand/30 focus:border-brand focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>

          {ingestMode === 'paste' ? (
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Content
              </span>
              <textarea
                required
                rows={8}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Xin chào is the most common way to say hello in Vietnamese..."
                className="w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm leading-relaxed text-zinc-900 outline-none ring-brand/30 focus:border-brand focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </label>
          ) : (
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                File
              </span>
              <input
                type="file"
                required
                accept=".pdf,.txt,application/pdf,text/plain"
                onChange={(e) => setIngestFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-zinc-700 file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:text-sm file:font-medium file:text-white dark:text-zinc-300"
              />
            </label>
          )}

          <Button type="submit" disabled={ingestStatus === 'loading'}>
            {ingestStatus === 'loading'
              ? ingestMode === 'file'
                ? 'Uploading and embedding…'
                : 'Saving and embedding…'
              : ingestMode === 'file'
                ? 'Upload material'
                : 'Save material'}
          </Button>
        </form>

        {ingestMessage ? (
          <p
            role="status"
            className="mt-4 rounded-lg bg-accent/15 px-3 py-2 text-sm text-zinc-900 dark:bg-accent/10 dark:text-zinc-100"
          >
            {ingestMessage}
          </p>
        ) : null}
        {ingestError ? (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-100"
          >
            {ingestError}
          </p>
        ) : null}
      </Card>

      <Card aria-labelledby="ask-heading">
        <h2
          id="ask-heading"
          className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Ask a question
        </h2>

        <form onSubmit={handleSearch} className="mt-5 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Question
            </span>
            <input
              type="text"
              required
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What does Xin chào mean?"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-brand/30 focus:border-brand focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Limit to material (optional)
              </span>
              <select
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-brand/30 focus:border-brand focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              >
                <option value="">All saved material</option>
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Sources to retrieve (topK)
              </span>
              <input
                type="number"
                min={1}
                max={20}
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value))}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-brand/30 focus:border-brand focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </label>
          </div>

          <Button type="submit" disabled={searchStatus === 'loading'}>
            {searchStatus === 'loading' ? 'Searching…' : 'Ask'}
          </Button>
        </form>

        {searchError ? (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-100"
          >
            {searchError}
          </p>
        ) : null}

        {searchResult ? (
          <div className="mt-6 space-y-5 border-t border-zinc-200 pt-6 dark:border-zinc-800">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Answer
              </h3>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {searchResult.strategy === 'full_document'
                  ? 'Answered using full document'
                  : 'Answered from matching excerpts'}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed text-zinc-900 dark:text-zinc-100">
                {searchResult.answer}
              </p>
            </div>

            {searchResult.strategy === 'rag' &&
            searchResult.sources.length > 0 ? (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Sources
                </h3>
                <ul className="mt-3 space-y-3">
                  {searchResult.sources.map((source) => (
                    <li
                      key={source.chunkId}
                      className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {source.documentTitle}
                        </p>
                        <span className="rounded-full bg-brand-light/25 px-2 py-0.5 text-xs font-medium text-brand-dark dark:bg-brand-light/10 dark:text-brand-light">
                          {(source.similarity * 100).toFixed(0)}% match
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                        {source.content}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </Card>
    </AppPageShell>
  );
}
