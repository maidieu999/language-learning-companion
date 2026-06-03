'use client';

import Link from 'next/link';
import { useRouter } from 'next/router';
import { FormEvent, useEffect, useState } from 'react';
import {
  AuthPageShell,
  authLinkClassName,
} from '@/app/components/auth-page-shell';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { resetPassword } from '@/lib/api';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!router.isReady) {
      return;
    }
    const queryToken = router.query.token;
    if (typeof queryToken === 'string') {
      setToken(queryToken);
    }
  }, [router.isReady, router.query.token]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await resetPassword({
        token: token.trim(),
        newPassword,
      });
      setMessage(response.message);
      setTimeout(() => void router.replace('/login'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPageShell
      title="Reset password"
      description="Paste the reset token from forgot password, then choose a new password."
      footer={
        <Link href="/login" className={authLinkClassName}>
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Reset token
          </span>
          <Input
            type="text"
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="font-mono text-xs"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            New password
          </span>
          <Input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </label>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Updating…' : 'Update password'}
        </Button>
      </form>

      {message ? (
        <p
          role="status"
          className="mt-4 rounded-lg bg-accent/15 px-3 py-2 text-sm text-zinc-900 dark:bg-accent/10 dark:text-zinc-100"
        >
          {message}
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-100"
        >
          {error}
        </p>
      ) : null}
    </AuthPageShell>
  );
}
