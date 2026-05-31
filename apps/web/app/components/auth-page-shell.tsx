import Link from 'next/link';
import type { ReactNode } from 'react';

interface AuthPageShellProps {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthPageShell({
  title,
  description,
  children,
  footer,
}: AuthPageShellProps) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 py-12 sm:px-6">
      <header className="space-y-2 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-teal-700 dark:text-teal-400">
          Language learning companion
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {title}
        </h1>
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {description}
        </p>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        {children}
      </section>

      {footer ? (
        <footer className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          {footer}
        </footer>
      ) : null}

      <p className="text-center text-sm">
        <Link
          href="/"
          className="font-medium text-teal-700 hover:underline dark:text-teal-400"
        >
          Back to home
        </Link>
      </p>
    </div>
  );
}
