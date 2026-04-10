'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { usePreferenceOnboarding } from '@/lib/hooks/use-preference-onboarding';
import { useVibes } from '@/lib/hooks/use-vibes';
import { cn } from '@/lib/utils';

import { MODE_OPTIONS } from './preference-modal.constants';

type Step = 1 | 2 | 3;

export function PreferenceOnboardingModal() {
  const { shouldPrompt, save, dismiss } = usePreferenceOnboarding();
  const { vibes } = useVibes();
  const [step, setStep] = useState<Step>(1);
  const [selectedModes, setSelectedModes] = useState<Set<string | null>>(new Set());
  const [selectedVibes, setSelectedVibes] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');

  if (!shouldPrompt) return null;

  const toggleMode = (slug: string | null) => {
    const next = new Set(selectedModes);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    setSelectedModes(next);
  };

  const toggleVibe = (slug: string) => {
    const next = new Set(selectedVibes);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    setSelectedVibes(next);
  };

  const handleFinish = async () => {
    const preferredModes = Array.from(selectedModes).filter(
      (s): s is 'work' | 'rest' | 'social' => s !== null,
    );
    await save({
      preferredModes,
      preferredVibes: Array.from(selectedVibes),
      onboardingNote: note.trim() || undefined,
    });
  };

  const handleSkip = async () => {
    await dismiss();
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) handleSkip(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && 'What brings you here today?'}
            {step === 2 && 'How do you like your coffee shops?'}
            {step === 3 && "Anything else you're hoping to find?"}
          </DialogTitle>
          <DialogDescription>Step {step} of 3</DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-2">
            {MODE_OPTIONS.map((m) => (
              <button
                key={m.label}
                type="button"
                onClick={() => toggleMode(m.slug)}
                className={cn(
                  'w-full rounded-2xl border p-4 text-left transition',
                  selectedModes.has(m.slug)
                    ? 'border-[#2c1810] bg-[#2c1810] text-white'
                    : 'border-gray-200 bg-white',
                )}
              >
                <div className="text-2xl">{m.emoji}</div>
                <div className="font-medium">{m.label}</div>
                <div className="text-sm opacity-80">{m.blurb}</div>
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-wrap gap-2">
            {vibes.map((v) => (
              <button
                key={v.slug}
                type="button"
                onClick={() => toggleVibe(v.slug)}
                className={cn(
                  'rounded-full border px-4 py-2 transition',
                  selectedVibes.has(v.slug)
                    ? 'border-[#2c1810] bg-[#2c1810] text-white'
                    : 'border-gray-200 bg-white',
                )}
              >
                <span className="mr-1">{v.emoji}</span>
                {v.nameZh}
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={280}
            placeholder="A few words — totally optional"
          />
        )}

        <div className="flex flex-col gap-2 pt-4">
          {step < 3 ? (
            <Button
              className="h-12 w-full rounded-full bg-[#E06B3F] text-white"
              onClick={() => setStep((step + 1) as Step)}
            >
              Next →
            </Button>
          ) : (
            <Button
              className="h-12 w-full rounded-full bg-[#E06B3F] text-white"
              onClick={handleFinish}
            >
              Finish →
            </Button>
          )}
          <button
            type="button"
            onClick={handleSkip}
            className="text-sm text-[#2c1810] opacity-70 hover:opacity-100"
          >
            Skip
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
