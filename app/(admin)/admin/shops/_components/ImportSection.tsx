'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { REGIONS } from '../_constants';

interface ImportSummary {
  imported: number;
  filtered: {
    invalid_url: number;
    invalid_name: number;
    known_failed: number;
    closed: number;
  };
  pending_url_check: number;
  flagged_duplicates: number;
  region: string;
}

interface ImportSectionProps {
  getToken: () => Promise<string | null>;
  onImportComplete: () => void;
}

export function ImportSection({
  getToken,
  onImportComplete,
}: ImportSectionProps) {
  const [selectedRegion, setSelectedRegion] = useState<string>(
    REGIONS[0].value
  );
  const [importingCafeNomad, setImportingCafeNomad] = useState(false);
  const [importingTakeout, setImportingTakeout] = useState(false);
  const [checkingUrls, setCheckingUrls] = useState(false);
  const takeoutFileRef = useRef<HTMLInputElement>(null);

  async function handleImportCafeNomad() {
    setImportingCafeNomad(true);
    try {
      const token = await getToken();
      if (!token) {
        toast.error('Session expired — please refresh the page');
        return;
      }
      const res = await fetch('/api/admin/shops/import/cafe-nomad', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ region: selectedRegion }),
      });
      const data: ImportSummary = await res.json();
      if (!res.ok) {
        toast.error((data as { detail?: string }).detail || 'Import failed');
        return;
      }
      toast.success(
        `Imported ${data.imported} shops (${data.flagged_duplicates} flagged as duplicates)`
      );
      onImportComplete();
    } catch {
      toast.error('Network error');
    } finally {
      setImportingCafeNomad(false);
    }
  }

  async function handleImportTakeout() {
    const file = takeoutFileRef.current?.files?.[0];
    if (!file) {
      toast.error('Please select a GeoJSON or CSV file first');
      return;
    }

    setImportingTakeout(true);
    try {
      const token = await getToken();
      if (!token) {
        toast.error('Session expired — please refresh the page');
        return;
      }
      const formData = new FormData();
      formData.append('file', file);
      formData.append('region', selectedRegion);

      const res = await fetch('/api/admin/shops/import/google-takeout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data: ImportSummary = await res.json();
      if (!res.ok) {
        toast.error((data as { detail?: string }).detail || 'Upload failed');
        return;
      }
      toast.success(
        `Imported ${data.imported} shops from Google Takeout (${data.flagged_duplicates} flagged as duplicates)`
      );
      if (takeoutFileRef.current) takeoutFileRef.current.value = '';
      onImportComplete();
    } catch {
      toast.error('Network error');
    } finally {
      setImportingTakeout(false);
    }
  }

  async function handleCheckUrls() {
    setCheckingUrls(true);
    try {
      const token = await getToken();
      if (!token) {
        toast.error('Session expired — please refresh the page');
        return;
      }
      const res = await fetch('/api/admin/shops/import/check-urls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || 'URL check failed');
        return;
      }
      toast.success(`URL check started for ${data.checking} shops`);
    } catch {
      toast.error('Network error');
    } finally {
      setCheckingUrls(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <h2 className="text-sm font-semibold text-gray-700">Import Shops</h2>
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <label htmlFor="region-select" className="sr-only">
            Region
          </label>
          <select
            id="region-select"
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="rounded border px-3 py-1.5 text-sm"
          >
            {REGIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleImportCafeNomad}
          disabled={importingCafeNomad}
          className="rounded bg-amber-600 px-3 py-1.5 text-sm text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {importingCafeNomad ? 'Importing...' : 'Import from Cafe Nomad'}
        </button>

        <div className="flex items-center gap-2">
          <input
            ref={takeoutFileRef}
            type="file"
            accept=".json,.geojson,.csv"
            className="text-sm"
            id="takeout-file"
          />
          <button
            type="button"
            onClick={handleImportTakeout}
            disabled={importingTakeout}
            className="rounded bg-green-700 px-3 py-1.5 text-sm text-white hover:bg-green-800 disabled:opacity-50"
          >
            {importingTakeout ? 'Uploading...' : 'Import Google Takeout'}
          </button>
        </div>

        <button
          type="button"
          onClick={handleCheckUrls}
          disabled={checkingUrls}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          {checkingUrls ? 'Checking...' : 'Check URLs'}
        </button>
      </div>
    </div>
  );
}
