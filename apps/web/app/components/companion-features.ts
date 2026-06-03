export type CompanionFeatureId = 'research' | 'describe';

export interface CompanionFeatureConfig {
  id: CompanionFeatureId;
  label: string;
  title: string;
  description: string;
}

export const COMPANION_FEATURES: CompanionFeatureConfig[] = [
  {
    id: 'research',
    label: 'Ask your material',
    title: 'Ask your material',
    description:
      'Add lesson text, then ask questions. Answers are grounded in what you uploaded.',
  },
  {
    id: 'describe',
    label: 'Describe a picture',
    title: 'Describe a picture',
    description:
      'Practice describing images with AI prompts and feedback. Coming soon.',
  },
];

export function parseFeatureParam(value: string | null): CompanionFeatureId {
  if (value === 'describe') {
    return 'describe';
  }
  return 'research';
}
