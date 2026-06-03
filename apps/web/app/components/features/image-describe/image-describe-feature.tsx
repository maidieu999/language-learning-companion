import { Card } from '@/app/components/ui/card';

const STEPS = ['Upload', 'Brainstorm', 'Your answer', 'Feedback'] as const;

const inputClassName =
  'w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-500';

export function ImageDescribeFeature() {
  return (
    <>
      <Card aria-labelledby="describe-coming-soon-heading">
        <h2
          id="describe-coming-soon-heading"
          className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Coming soon
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Upload a picture, get vocabulary and structure hints, write your
          description in English, Chinese, or Vietnamese, then receive a score and
          suggestions. This feature is not available yet.
        </p>
      </Card>

      <Card aria-labelledby="describe-preview-heading">
        <h2
          id="describe-preview-heading"
          className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Preview layout
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Wireframe for the upcoming flow (controls are disabled).
        </p>

        <ol className="mt-5 flex flex-wrap gap-2" aria-label="Practice steps">
          {STEPS.map((step, index) => (
            <li
              key={step}
              className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
            >
              {index + 1}. {step}
            </li>
          ))}
        </ol>

        <div className="mt-6 space-y-4 opacity-60">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Image
            </span>
            <input
              type="file"
              disabled
              accept="image/png,image/jpeg,image/webp"
              className="block w-full text-sm text-zinc-500 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-300 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-600"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Title (optional)
            </span>
            <input
              type="text"
              disabled
              placeholder="Market scene — practice 1"
              className={inputClassName}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Describe in
            </span>
            <select disabled className={inputClassName}>
              <option>English</option>
              <option>Chinese</option>
              <option>Vietnamese</option>
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Your description
            </span>
            <textarea
              disabled
              rows={5}
              placeholder="Write what you see in the image…"
              className={`${inputClassName} resize-y`}
            />
          </label>
        </div>
      </Card>
    </>
  );
}
