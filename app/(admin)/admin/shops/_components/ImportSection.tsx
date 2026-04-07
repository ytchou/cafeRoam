'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface CsvSummary {
  imported: number;
  skipped_duplicate: number;
  invalid_url: number;
  duplicate_in_file: number;
  total: number;
}

interface ImportSectionProps {
  getToken: () => Promise<string | null>;
  onImportComplete: () => void;
}

export function ImportSection({
  getToken,
  onImportComplete,
}: ImportSectionProps) {
  const csvFileRef = useRef<HTMLInputElement>(null);
  const [seedingCsv, setSeedingCsv] = useState(false);
  const [csvSummary, setCsvSummary] = useState<CsvSummary | null>(null);
  const [runningPipeline, setRunningPipeline] = useState(false);

  async function handleSeedCsv() {
    const file = csvFileRef.current?.files?.[0];
    if (!file) {
      toast.error('Please select a CSV file first');
      return;
    }
    setSeedingCsv(true);
    setCsvSummary(null);
    try {
      const token = await getToken();
      if (!token) {
        toast.error('Session expired — please refresh the page');
        return;
      }
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/shops/import/manual-csv', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data: CsvSummary = await res.json();
      if (!res.ok) {
        toast.error((data as { detail?: string }).detail || 'Upload failed');
        return;
      }
      setCsvSummary(data);
      toast.success('CSV imported successfully');
      if (csvFileRef.current) csvFileRef.current.value = '';
      onImportComplete();
    } catch {
      toast.error('Network error');
    } finally {
      setSeedingCsv(false);
    }
  }

  async function handleRunPipeline() {
    setRunningPipeline(true);
    try {
      const token = await getToken();
      if (!token) {
        toast.error('Session expired — please refresh the page');
        return;
      }
      const res = await fetch('/api/admin/pipeline/run-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || 'Failed to queue pipeline run');
        return;
      }
      toast.success(
        'Pipeline batch run queued — shops will process in the background'
      );
    } catch {
      toast.error('Network error');
    } finally {
      setRunningPipeline(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-semibold text-gray-700">Manual CSV Seed</h2>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={csvFileRef}
            type="file"
            accept=".csv"
            className="text-sm"
            id="csv-file"
          />
          <Button
            onClick={handleSeedCsv}
            disabled={seedingCsv}
            variant="default"
          >
            {seedingCsv ? 'Uploading...' : 'Seed Shops'}
          </Button>
        </div>
        {csvSummary && (
          <div className="rounded-md bg-gray-50 p-3 text-sm text-gray-700">
            <p>Imported: {csvSummary.imported}</p>
            <p>Skipped (duplicate in DB): {csvSummary.skipped_duplicate}</p>
            <p>Skipped (duplicate in file): {csvSummary.duplicate_in_file}</p>
            <p>Invalid URL: {csvSummary.invalid_url}</p>
            <p className="font-medium">Total: {csvSummary.total}</p>
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-semibold text-gray-700">Run Pipeline</h2>
        <Button
          onClick={handleRunPipeline}
          disabled={runningPipeline}
          variant="outline"
        >
          {runningPipeline ? 'Queuing...' : 'Run Pipeline'}
        </Button>
      </div>
    </div>
  );
}
