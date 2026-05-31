'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { getMe } from '@/lib/api';
import { clearAccessToken, getAccessToken } from '@/lib/auth';
import type { User } from '@/lib/types';

interface AuthGateProps {
  children: (user: User) => ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    void getMe()
      .then((profile) => {
        setUser(profile);
        setChecking(false);
      })
      .catch(() => {
        clearAccessToken();
        router.replace('/login');
      });
  }, [router]);

  if (checking || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4 text-sm text-zinc-600 dark:text-zinc-400">
        Loading…
      </div>
    );
  }

  return <>{children(user)}</>;
}
