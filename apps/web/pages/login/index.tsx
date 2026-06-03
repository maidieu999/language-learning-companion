'use client';

import Link from 'next/link';
import { useRouter } from 'next/router';
import { FormEvent, useState } from 'react';
import {
  AuthPageShell,
  authLinkClassName,
} from '@/app/components/auth-page-shell';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { login } from '@/lib/api';
import { setAccessToken } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await login({ email: email.trim(), password });
      setAccessToken(response.accessToken);
      void router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPageShell
      title="Sign in"
      description="Use your email and password to access your learning material."
      footer={
        <>
          <span>New here? </span>
          <Link href="/signup" className={authLinkClassName}>
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Email
          </span>
          <Input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Password
          </span>
          <Input
            type="password"
            required
            minLength={8}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <p className="text-right text-sm">
          <Link href="/forgot-password" className={authLinkClassName}>
            Forgot password?
          </Link>
        </p>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

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
