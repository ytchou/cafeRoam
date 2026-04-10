'use client';

import { useState } from 'react';
import { toast } from 'sonner';

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
  // Gate the vibes fetch — skip the /api/explore/vibes round-trip for users
  // who won't see the modal at all.
  const { vibes } = useVibes(shouldPrompt ? '/api/explore/vibes' : null);
  const [step, setStep] = useState<Step>(1);
  const [selectedModes, setSelectedModes] = useState<Set<string | null>>(
    new Set()
  );
  const [selectedVibes, setSelectedVibes] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!shouldPrompt) return null;

  const toggleMode = (slug: string | null) => {
    const next = new Set(selectedModes);
    if (slug === null) {
      // 'Anywhere' is mutually exclusive with specific modes
      next.clear();
      if (!selectedModes.has(null)) next.add(null);
    } else {
      // Selecting a specific mode clears 'Anywhere'
      next.delete(null);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
    }
    setSelectedModes(next);
  };

  const toggleVibe = (slug: string) => {
    const next = new Set(selectedVibes);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    setSelectedVibes(next);
  };

  const handleFinish = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const preferredModes = Array.from(selectedModes).filter(
        (s): s is 'work' | 'rest' | 'social' => s !== null
      );
      await save({
        preferredModes,
        preferredVibes: Array.from(selectedVibes),
        onboardingNote: note.trim() || undefined,
      });
    } catch {
      toast.error('Could not save your preferences. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await dismiss();
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) handleSkip();
      }}
    >
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
                    ? 'border-espresso bg-espresso text-white'
                    : 'border-gray-200 bg-white'
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
                    ? 'border-espresso bg-espresso text-white'
                    : 'border-gray-200 bg-white'
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
              className="bg-brand h-12 w-full rounded-full text-white"
              onClick={() => setStep((step + 1) as Step)}
              disabled={isSubmitting}
            >
              Next →
            </Button>
          ) : (
            <Button
              className="bg-brand h-12 w-full rounded-full text-white"
              onClick={handleFinish}
              disabled={isSubmitting}
            >
              Finish →
            </Button>
          )}
          <button
            type="button"
            onClick={handleSkip}
            disabled={isSubmitting}
            className="text-espresso text-sm opacity-70 hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Skip
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
