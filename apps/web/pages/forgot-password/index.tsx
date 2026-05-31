'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { AuthPageShell } from '@/app/components/auth-page-shell';
import { forgotPassword } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    setResetToken(null);
    setExpiresAt(null);

    try {
      const response = await forgotPassword({ email: email.trim() });
      setMessage(response.message);
      if (response.resetToken) {
        setResetToken(response.resetToken);
        setExpiresAt(response.expiresAt ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPageShell
      title="Forgot password"
      description="Enter your email. In development, the API returns a reset token you can use on the reset page."
      footer={
        <Link
          href="/login"
          className="font-medium text-teal-700 hover:underline dark:text-teal-400"
        >
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Email
          </span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-teal-600/30 focus:border-teal-600 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Sending…' : 'Request reset token'}
        </button>
      </form>

      {message ? (
        <p
          role="status"
          className="mt-4 rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-900 dark:bg-teal-950 dark:text-teal-100"
        >
          {message}
        </p>
      ) : null}

      {resetToken ? (
        <div
          role="status"
          className="mt-4 space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
        >
          <p className="font-medium">Dev reset token</p>
          <p className="break-all font-mono text-xs">{resetToken}</p>
          {expiresAt ? (
            <p className="text-xs opacity-80">
              Expires {new Date(expiresAt).toLocaleString()}
            </p>
          ) : null}
          <Link
            href={`/reset-password?token=${encodeURIComponent(resetToken)}`}
            className="inline-block font-medium text-teal-800 underline dark:text-teal-300"
          >
            Go to reset password
          </Link>
        </div>
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
