'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import {
  parseFeatureParam,
  type CompanionFeatureId,
} from '@/app/components/companion-features';
import { CompanionShell } from '@/app/components/companion-shell';
import { DocumentResearchFeature } from '@/app/components/features/document-research/document-research-feature';
import { ImageDescribeFeature } from '@/app/components/features/image-describe/image-describe-feature';
import type { User } from '@/lib/types';

interface CompanionAppProps {
  user: User;
}

export function CompanionApp({ user }: CompanionAppProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeFeature = parseFeatureParam(searchParams?.get('feature') ?? null);

  const setFeature = useCallback(
    (id: CompanionFeatureId) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      if (id === 'research') {
        params.delete('feature');
      } else {
        params.set('feature', id);
      }
      const query = params.toString();
      router.replace(query ? `/?${query}` : '/', { scroll: false });
    },
    [router, searchParams],
  );

  return (
    <CompanionShell
      user={user}
      activeFeature={activeFeature}
      onFeatureChange={setFeature}
    >
      {activeFeature === 'research' ? (
        <DocumentResearchFeature />
      ) : (
        <ImageDescribeFeature />
      )}
    </CompanionShell>
  );
}
