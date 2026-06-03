'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  COMPANION_FEATURES,
  type CompanionFeatureId,
} from '@/app/components/companion-features';
import { AppBrand } from '@/app/components/ui/app-brand';
import { AppPageShell } from '@/app/components/ui/app-page-shell';
import { Button } from '@/app/components/ui/button';
import { FeatureNav } from '@/app/components/ui/feature-nav';
import { clearAccessToken } from '@/lib/auth';
import type { User } from '@/lib/types';

interface CompanionShellProps {
  user: User;
  activeFeature: CompanionFeatureId;
  onFeatureChange: (id: CompanionFeatureId) => void;
  children: ReactNode;
}

export function CompanionShell({
  user,
  activeFeature,
  onFeatureChange,
  children,
}: CompanionShellProps) {
  const router = useRouter();
  const feature =
    COMPANION_FEATURES.find((item) => item.id === activeFeature) ??
    COMPANION_FEATURES[0];

  return (
    <AppPageShell>
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <AppBrand />
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
      </header>

      <FeatureNav
        features={COMPANION_FEATURES}
        activeId={activeFeature}
        onChange={onFeatureChange}
      />

      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {feature.title}
        </h1>
        <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
          {feature.description}
        </p>
      </div>

      <div
        role="tabpanel"
        id={`feature-panel-${activeFeature}`}
        aria-labelledby={`feature-tab-${activeFeature}`}
        className="flex flex-col gap-10"
      >
        {children}
      </div>
    </AppPageShell>
  );
}
