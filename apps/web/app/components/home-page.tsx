'use client';

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
          <CompanionApp user={user} />
        )
      }
    </AuthGate>
  );
}
