export type ModeOption = {
  slug: 'work' | 'rest' | 'social' | null;
  emoji: string;
  label: string;
  blurb: string;
};

export const MODE_OPTIONS: ModeOption[] = [
  { slug: 'work',   emoji: '💻', label: 'Focus time',     blurb: 'A corner to get work done' },
  { slug: 'rest',   emoji: '🌿', label: 'Slow afternoon', blurb: 'Just want to breathe and sip' },
  { slug: 'social', emoji: '🤝', label: 'Catching up',    blurb: 'Meeting someone over coffee' },
  { slug: null,     emoji: '☕', label: 'Anywhere',       blurb: 'I just love coffee shops' },
];
