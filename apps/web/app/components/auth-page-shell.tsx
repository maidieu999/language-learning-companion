import Link from 'next/link';
import type { ReactNode } from 'react';
import { AppBrand } from '@/app/components/ui/app-brand';
import { Card } from '@/app/components/ui/card';

interface AuthPageShellProps {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}

const linkClassName =
  'font-medium text-brand hover:underline dark:text-brand-light';

export function AuthPageShell({
  title,
  description,
  children,
  footer,
}: AuthPageShellProps) {
  return (
    <div className="min-h-full bg-gradient-to-b from-brand-light/10 via-zinc-50 to-zinc-50 dark:from-brand/5 dark:via-zinc-950 dark:to-zinc-950">
      <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 py-12 sm:px-6">
        <header className="space-y-4 text-center">
          <AppBrand centered />
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {title}
          </h1>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {description}
          </p>
        </header>

        <Card>{children}</Card>

        {footer ? (
          <footer className="text-center text-sm text-zinc-600 dark:text-zinc-400">
            {footer}
          </footer>
        ) : null}

        <p className="text-center text-sm">
          <Link href="/" className={linkClassName}>
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}

export { linkClassName as authLinkClassName };
