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
import { register } from '@/lib/api';
import { setAccessToken } from '@/lib/auth';

export default function SignupPage() {
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
      const response = await register({ email: email.trim(), password });
      setAccessToken(response.accessToken);
      void router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPageShell
      title="Create account"
      description="New accounts are learner accounts. You can add material and ask questions after signing up."
      footer={
        <>
          <span>Already have an account? </span>
          <Link href="/login" className={authLinkClassName}>
            Sign in
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
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            At least 8 characters
          </span>
        </label>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Creating account…' : 'Create account'}
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
