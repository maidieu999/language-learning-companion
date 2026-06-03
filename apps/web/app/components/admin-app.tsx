'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AppBrand } from '@/app/components/ui/app-brand';
import { AppPageShell } from '@/app/components/ui/app-page-shell';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { listAdminUserDocuments, listAdminUsers } from '@/lib/api';
import { clearAccessToken } from '@/lib/auth';
import type { AdminUser, Document, User } from '@/lib/types';

interface AdminAppProps {
  user: User;
}

type UsersStatus = 'idle' | 'loading' | 'success' | 'error';
type DocumentsStatus = 'idle' | 'loading' | 'success' | 'error';

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

export function AdminApp({ user }: AdminAppProps) {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersStatus, setUsersStatus] = useState<UsersStatus>('idle');
  const [usersError, setUsersError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentsStatus, setDocumentsStatus] =
    useState<DocumentsStatus>('idle');
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setUsersStatus('loading');
    setUsersError(null);

    try {
      const items = await listAdminUsers();
      setUsers(items);
      setUsersStatus('success');
    } catch (error) {
      setUsersStatus('error');
      setUsersError(
        error instanceof Error ? error.message : 'Failed to load users',
      );
    }
  }, []);

  const loadDocuments = useCallback(async (userId: string) => {
    setDocumentsStatus('loading');
    setDocumentsError(null);
    setExpandedId(null);

    try {
      const items = await listAdminUserDocuments(userId);
      setDocuments(items);
      setDocumentsStatus('success');
    } catch (error) {
      setDocumentsStatus('error');
      setDocumentsError(
        error instanceof Error ? error.message : 'Failed to load material',
      );
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (selectedUser) {
      void loadDocuments(selectedUser.id);
    } else {
      setDocuments([]);
      setDocumentsStatus('idle');
      setDocumentsError(null);
    }
  }, [selectedUser, loadDocuments]);

  function handleSelectUser(adminUser: AdminUser) {
    setSelectedUser(adminUser);
  }

  function handleBackToUsers() {
    setSelectedUser(null);
    setExpandedId(null);
  }

  return (
    <AppPageShell>
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <AppBrand suffix="Admin" />
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
          {selectedUser ? `${selectedUser.email} — material` : 'Users'}
        </h1>
        <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
          {selectedUser
            ? 'Read-only view of this user’s saved lesson text.'
            : 'Select a user to view their ingested material.'}
        </p>
      </header>

      {selectedUser ? (
        <Card>
          <button
            type="button"
            onClick={handleBackToUsers}
            className="mb-4 text-sm font-medium text-brand hover:text-brand-dark dark:text-brand-light dark:hover:text-brand-light"
          >
            ← Back to users
          </button>

          {documentsError ? (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-100"
            >
              {documentsError}
            </p>
          ) : null}

          {documentsStatus === 'loading' ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</p>
          ) : null}

          {documentsStatus !== 'loading' &&
          documents.length === 0 &&
          !documentsError ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No material for this user.
            </p>
          ) : null}

          {documents.length > 0 ? (
            <ul className="space-y-3">
              {documents.map((doc) => {
                const expanded = expandedId === doc.id;
                return (
                  <li
                    key={doc.id}
                    className="rounded-lg border border-zinc-200 bg-zinc-50 transition hover:ring-1 hover:ring-brand-light/10 dark:border-zinc-800 dark:bg-zinc-900"
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
        </Card>
      ) : (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              All users
            </h2>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void loadUsers()}
              disabled={usersStatus === 'loading'}
              className="px-3 py-1.5"
            >
              {usersStatus === 'loading' ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>

          {usersError ? (
            <p
              role="alert"
              className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-100"
            >
              {usersError}
            </p>
          ) : null}

          {usersStatus === 'loading' && users.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
              Loading…
            </p>
          ) : null}

          {users.length > 0 ? (
            <ul className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
              {users.map((adminUser) => (
                <li key={adminUser.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectUser(adminUser)}
                    className="flex w-full flex-wrap items-center justify-between gap-2 py-3 text-left transition hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {adminUser.email}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {adminUser.role} · joined {formatDate(adminUser.createdAt)}
                      </p>
                    </div>
                    <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                      {adminUser.documentCount}{' '}
                      {adminUser.documentCount === 1 ? 'document' : 'documents'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      )}
    </AppPageShell>
  );
}
