import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

const fieldClasses =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-brand/30 focus:border-brand focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50';

export function Input({
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldClasses} ${className}`} {...props} />;
}

export function Textarea({
  className = '',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`${fieldClasses} resize-y leading-relaxed ${className}`}
      {...props}
    />
  );
}
