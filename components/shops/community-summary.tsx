import { Sparkles } from 'lucide-react';

interface CommunitySummaryProps {
  summary: string | null | undefined;
}

export function CommunitySummary({ summary }: CommunitySummaryProps) {
  if (!summary) return null;

  return (
    <section className="px-5 py-4">
      <h3 className="text-foreground mb-2 flex items-center gap-1.5 font-[family-name:var(--font-body)] text-sm font-semibold">
        What visitors say
        <Sparkles
          size={14}
          className="text-text-tertiary"
          title="AI generated from visitor check-ins"
        />
      </h3>
      <p className="text-text-secondary font-[family-name:var(--font-body)] text-sm leading-relaxed">
        「{summary}」
      </p>
    </section>
  );
}
