'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface ReportIssueDialogProps {
  shopId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FIELD_OPTIONS = [
  { value: 'hours', label: '營業時間' },
  { value: 'wifi', label: 'Wi-Fi' },
  { value: 'name', label: '名稱' },
  { value: 'other', label: '其他' },
];

const MIN_DESCRIPTION_LENGTH = 5;

export function ReportIssueDialog({ shopId, open, onOpenChange }: ReportIssueDialogProps) {
  const [field, setField] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setField('');
      setDescription('');
    }
  }, [open]);

  const canSubmit = description.trim().length >= MIN_DESCRIPTION_LENGTH && !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsSubmitting(true);

    try {
      const body: Record<string, string> = { description: description.trim() };
      if (field) body.field = field;

      const response = await fetch(`/api/shops/${shopId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to submit report');
      }

      toast.success('感謝回報！我們會盡快處理');
      setField('');
      setDescription('');
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '送出失敗，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>回報錯誤</DialogTitle>
          <DialogDescription>發現店家資訊有誤？請告訴我們，我們會盡快更正。</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Select value={field} onValueChange={setField}>
            <SelectTrigger>
              <SelectValue placeholder="選擇類別（選填）" />
            </SelectTrigger>
            <SelectContent>
              {FIELD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Textarea
            placeholder="請描述您發現的問題..."
            value={description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
            rows={4}
          />
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isSubmitting ? '送出中...' : '送出'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
