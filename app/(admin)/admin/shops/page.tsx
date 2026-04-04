'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAdminAuth } from '../_hooks/use-admin-auth';
import { ImportSection } from './_components/ImportSection';
import { ShopFilterBar } from './_components/ShopFilterBar';
import { ShopTable } from './_components/ShopTable';
import {
  PAGE_SIZE,
  Shop,
  SOURCE_OPTIONS,
  STATUS_COLORS,
  STATUS_LABELS,
  STATUS_OPTIONS,
} from './_constants';

interface ShopsResponse {
  shops: Shop[];
  total: number;
}

export default function AdminShopsList() {
  const { getToken } = useAdminAuth();

  const [shops, setShops] = useState<Shop[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [appliedSearch, setAppliedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  const [pipelineStatus, setPipelineStatus] = useState<Record<string, number>>(
    {}
  );

  const fetchShops = useCallback(
    async (
      searchTerm: string,
      status: string,
      source: string,
      currentOffset: number
    ) => {
      setLoading(true);
      setError(null);

      try {
        const token = await getToken();
        if (!token) {
          setError('Session expired — please refresh the page');
          setLoading(false);
          return;
        }

        const params = new URLSearchParams();
        if (searchTerm) params.set('search', searchTerm);
        if (status !== 'all') params.set('processing_status', status);
        if (source !== 'all') params.set('source', source);
        params.set('offset', String(currentOffset));
        params.set('limit', String(PAGE_SIZE));

        const queryString = params.toString();
        const url = `/api/admin/shops${queryString ? `?${queryString}` : ''}`;

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.detail || 'Failed to load shops');
          return;
        }

        const data: ShopsResponse = await res.json();
        setShops(data.shops);
        setTotal(data.total);
      } catch {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    },
    [getToken]
  );

  useEffect(() => {
    fetchShops(appliedSearch, statusFilter, sourceFilter, offset);
  }, [fetchShops, appliedSearch, statusFilter, sourceFilter, offset]);

  useEffect(() => {
    async function fetchPipelineStatus() {
      const token = await getToken();
      if (!token) return;
      try {
        const res = await fetch('/api/admin/shops/pipeline-status', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setPipelineStatus(await res.json());
      } catch {
        // non-critical — ignore silently
      }
    }

    fetchPipelineStatus();
    const id = setInterval(fetchPipelineStatus, 5000);
    return () => clearInterval(id);
  }, [getToken]);

  async function handleCreateShop(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateLoading(true);

    const formData = new FormData(e.currentTarget);
    const latitude = parseFloat(formData.get('latitude') as string);
    const longitude = parseFloat(formData.get('longitude') as string);

    if (isNaN(latitude) || isNaN(longitude)) {
      toast.error('Latitude and longitude must be valid numbers');
      setCreateLoading(false);
      return;
    }

    const payload = {
      name: formData.get('name') as string,
      address: formData.get('address') as string,
      latitude,
      longitude,
    };

    try {
      const token = await getToken();
      if (!token) {
        toast.error('Session expired — please refresh the page');
        setCreateLoading(false);
        return;
      }
      const res = await fetch('/api/admin/shops', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.detail || 'Failed to create shop');
        return;
      }

      toast.success('Shop created');
      setShowCreateForm(false);
      fetchShops(appliedSearch, statusFilter, sourceFilter, offset);
    } catch {
      toast.error('Network error');
    } finally {
      setCreateLoading(false);
    }
  }

  function handleFilterChange(filters: {
    search: string;
    status: string;
    source: string;
  }) {
    setOffset(0);
    setAppliedSearch(filters.search);
    setStatusFilter(filters.status);
    setSourceFilter(filters.source);
  }

  function handleRefresh() {
    fetchShops(appliedSearch, statusFilter, sourceFilter, offset);
  }

  const isReviewFilter = statusFilter === 'pending_review';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Shops</h1>
        <Button onClick={() => setShowCreateForm((v) => !v)}>
          Create Shop
        </Button>
      </div>

      {Object.keys(pipelineStatus).length > 0 && (
        <div className="space-y-2 rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-700">
            Pipeline Status
          </h2>
          <div className="flex flex-wrap gap-2">
            {Object.keys(STATUS_COLORS)
              .filter((key) => (pipelineStatus[key] ?? 0) > 0)
              .map((key) => (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  onClick={() => setStatusFilter(key)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${STATUS_COLORS[key]} transition-opacity hover:opacity-80`}
                >
                  {STATUS_LABELS[key]}: {pipelineStatus[key]}
                </Button>
              ))}
          </div>
          {[
            'pending_url_check',
            'scraping',
            'enriching',
            'embedding',
            'publishing',
          ].some((s) => (pipelineStatus[s] ?? 0) > 0) && (
            <p className="text-xs text-gray-400">Auto-refreshing every 5s</p>
          )}
        </div>
      )}

      {(pipelineStatus['pending_review'] ?? 0) > 0 &&
        statusFilter !== 'pending_review' && (
          <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
            <div>
              <span className="text-sm font-medium text-blue-800">
                {pipelineStatus['pending_review']} shop
                {pipelineStatus['pending_review'] !== 1 ? 's' : ''} awaiting
                approval
              </span>
              <p className="mt-0.5 text-xs text-blue-600">
                Review and bulk-approve to queue them for scraping.
              </p>
            </div>
            <Button onClick={() => setStatusFilter('pending_review')}>
              Review &amp; Approve
            </Button>
          </div>
        )}

      <ImportSection getToken={getToken} onImportComplete={handleRefresh} />

      {showCreateForm && (
        <form
          onSubmit={handleCreateShop}
          className="space-y-3 rounded-lg border p-4"
        >
          <div>
            <label htmlFor="shop-name" className="block text-sm font-medium">
              Name
            </label>
            <Input
              id="shop-name"
              name="name"
              type="text"
              required
              className="mt-1"
            />
          </div>
          <div>
            <label htmlFor="shop-address" className="block text-sm font-medium">
              Address
            </label>
            <Input
              id="shop-address"
              name="address"
              type="text"
              required
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="shop-latitude"
                className="block text-sm font-medium"
              >
                Latitude
              </label>
              <Input
                id="shop-latitude"
                name="latitude"
                type="number"
                step="any"
                required
                className="mt-1"
              />
            </div>
            <div>
              <label
                htmlFor="shop-longitude"
                className="block text-sm font-medium"
              >
                Longitude
              </label>
              <Input
                id="shop-longitude"
                name="longitude"
                type="number"
                step="any"
                required
                className="mt-1"
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={createLoading}
            variant="default"
          >
            {createLoading ? 'Saving...' : 'Save'}
          </Button>
        </form>
      )}

      <ShopFilterBar
        onFilterChange={handleFilterChange}
        statusOptions={STATUS_OPTIONS}
        sourceOptions={SOURCE_OPTIONS}
        currentStatus={statusFilter}
        currentSource={sourceFilter}
      />

      {error && (
        <div
          role="alert"
          className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {!error && (
        <ShopTable
          key={`${appliedSearch}:${statusFilter}:${sourceFilter}:${offset}`}
          shops={shops}
          loading={loading}
          offset={offset}
          total={total}
          onPageChange={setOffset}
          getToken={getToken}
          onRefresh={handleRefresh}
          isReviewFilter={isReviewFilter}
        />
      )}
    </div>
  );
}
