import type { CompanionFeatureConfig, CompanionFeatureId } from '@/app/components/companion-features';

interface FeatureNavProps {
  features: CompanionFeatureConfig[];
  activeId: CompanionFeatureId;
  onChange: (id: CompanionFeatureId) => void;
}

export function FeatureNav({ features, activeId, onChange }: FeatureNavProps) {
  return (
    <nav aria-label="Learning features" className="w-full">
      <div
        role="tablist"
        className="flex w-full flex-col gap-1 rounded-xl border border-zinc-200 bg-zinc-100/80 p-1 sm:flex-row dark:border-zinc-800 dark:bg-zinc-900/80"
      >
        {features.map((feature) => {
          const selected = feature.id === activeId;
          return (
            <button
              key={feature.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`feature-panel-${feature.id}`}
              id={`feature-tab-${feature.id}`}
              onClick={() => onChange(feature.id)}
              className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                selected
                  ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
              }`}
            >
              {feature.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
