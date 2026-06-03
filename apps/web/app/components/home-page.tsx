'use client';

import { Suspense } from 'react';
import { AdminApp } from '@/app/components/admin-app';
import { AuthGate } from '@/app/components/auth-gate';
import { CompanionApp } from '@/app/components/companion-app';

export default function HomePage() {
  return (
    <AuthGate>
      {(user) =>
        user.role === 'ADMIN' ? (
          <AdminApp user={user} />
        ) : (
          <Suspense
            fallback={
              <p className="px-4 py-10 text-center text-sm text-zinc-600 dark:text-zinc-400">
                Loading…
              </p>
            }
          >
            <CompanionApp user={user} />
          </Suspense>
        )
      }
    </AuthGate>
  );
}
