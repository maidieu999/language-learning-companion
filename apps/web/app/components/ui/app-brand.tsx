import Image from 'next/image';

interface AppBrandProps {
  centered?: boolean;
  suffix?: string;
}

export function AppBrand({ centered = false, suffix }: AppBrandProps) {
  return (
    <div
      className={`flex items-center gap-2.5 ${centered ? 'justify-center' : ''}`}
    >
      <Image
        src="/logo.svg"
        alt=""
        width={40}
        height={40}
        className="h-10 w-10 shrink-0"
        priority
      />
      <div className={centered ? 'text-center' : ''}>
        <p className="text-sm font-semibold text-brand dark:text-brand-light">
          Language learning companion
        </p>
        {suffix ? (
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {suffix}
          </p>
        ) : null}
      </div>
    </div>
  );
}
