'use client';

import { AuthGate } from '@/app/components/auth-gate';
import { CompanionApp } from '@/app/components/companion-app';

export default function HomePage() {
  return <AuthGate>{(user) => <CompanionApp user={user} />}</AuthGate>;
}
