'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { createDocument, listDocuments, search } from '@/lib/api';
import type { Document, SearchResult } from '@/lib/types';

type IngestStatus = 'idle' | 'loading' | 'success' | 'error';
type SearchStatus = 'idle' | 'loading' | 'success' | 'error';
type ListStatus = 'idle' | 'loading' | 'success' | 'error';

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

export function CompanionApp() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [listStatus, setListStatus] = useState<ListStatus>('idle');
  const [listError, setListError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
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
      const document = await createDocument({ title: title.trim(), content });
      setTitle('');
      setContent('');
      setIngestStatus('success');
      setIngestMessage(`Saved "${document.title}". You can ask questions about it now.`);
      await loadDocuments();
    } catch (error) {
      setIngestStatus('error');
      setIngestError(error instanceof Error ? error.message : 'Failed to save material');
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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-10 sm:px-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-teal-700 dark:text-teal-400">
          Language learning companion
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Learn from your own material
        </h1>
        <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
          Add lesson text, then ask questions. Answers are grounded in what you
          uploaded.
        </p>
      </header>

      <section
        aria-labelledby="saved-material-heading"
        className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              id="saved-material-heading"
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Saved material
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              All documents stored in the database, newest first.
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

        {documents.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {documents.map((doc) => {
              const expanded = expandedId === doc.id;
              return (
                <li
                  key={doc.id}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(expanded ? null : doc.id)
                    }
                    className="flex w-full flex-col gap-1 px-4 py-3 text-left"
                    aria-expanded={expanded}
                  >
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {doc.title}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {formatDate(doc.createdAt)}
                    </span>
                    {!expanded ? (
                      <span className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                        {contentPreview(doc.content)}
                      </span>
                    ) : null}
                  </button>
                  {expanded ? (
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
      </section>

      <section
        aria-labelledby="add-material-heading"
        className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        <h2
          id="add-material-heading"
          className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Add material
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Paste vocabulary, grammar notes, or short reading passages.
        </p>

        <form onSubmit={handleIngest} className="mt-5 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Title
            </span>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Vietnamese greetings — lesson 1"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-teal-600/30 focus:border-teal-600 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>

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
              className="w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm leading-relaxed text-zinc-900 outline-none ring-teal-600/30 focus:border-teal-600 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>

          <button
            type="submit"
            disabled={ingestStatus === 'loading'}
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {ingestStatus === 'loading' ? 'Saving and embedding…' : 'Save material'}
          </button>
        </form>

        {ingestMessage ? (
          <p
            role="status"
            className="mt-4 rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-900 dark:bg-teal-950 dark:text-teal-100"
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
      </section>

      <section
        aria-labelledby="ask-heading"
        className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
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
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-teal-600/30 focus:border-teal-600 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
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
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-teal-600/30 focus:border-teal-600 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
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
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-teal-600/30 focus:border-teal-600 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={searchStatus === 'loading'}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            {searchStatus === 'loading' ? 'Searching…' : 'Ask'}
          </button>
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
              <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed text-zinc-900 dark:text-zinc-100">
                {searchResult.answer}
              </p>
            </div>

            {searchResult.sources.length > 0 ? (
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
                        <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-900 dark:bg-teal-950 dark:text-teal-100">
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
      </section>
    </div>
  );
}
