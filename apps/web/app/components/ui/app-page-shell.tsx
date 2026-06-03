import type { ReactNode } from 'react';

interface AppPageShellProps {
  children: ReactNode;
  maxWidth?: 'md' | '3xl';
}

const maxWidthClasses = {
  md: 'max-w-md',
  '3xl': 'max-w-3xl',
};

export function AppPageShell({ children, maxWidth = '3xl' }: AppPageShellProps) {
  return (
    <div
      className={`mx-auto flex w-full flex-col gap-10 bg-gradient-to-b from-brand-light/10 via-zinc-50 to-zinc-50 px-4 py-10 sm:px-6 dark:from-brand/5 dark:via-zinc-950 dark:to-zinc-950 ${maxWidthClasses[maxWidth]}`}
    >
      {children}
    </div>
  );
}
