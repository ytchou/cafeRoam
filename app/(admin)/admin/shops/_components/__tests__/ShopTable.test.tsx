import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ShopTable } from '../ShopTable';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

type ShopTableProps = Parameters<typeof ShopTable>[0];

function renderShopTable(shops: ShopTableProps['shops']) {
  return render(
    <ShopTable
      shops={shops}
      loading={false}
      offset={0}
      total={shops.length}
      onPageChange={vi.fn()}
      getToken={vi.fn().mockResolvedValue('test-token')}
      onRefresh={vi.fn()}
    />
  );
}

describe('ShopTable current_job display', () => {
  it('shows active job label when shop has current_job', () => {
    const shops = [
      {
        id: 'shop-1',
        name: 'Cafe A',
        address: '123 Main St',
        processing_status: 'live',
        source: 'manual',
        enriched_at: null,
        tag_count: 0,
        has_embedding: false,
        current_job: {
          job_type: 'summarize_reviews',
          status: 'claimed',
        },
      },
    ] as ShopTableProps['shops'];

    renderShopTable(shops);

    expect(screen.getByText(/Summarizing reviews/)).toBeTruthy();
  });

  it('shows only status when no current_job', () => {
    const shops = [
      {
        id: 'shop-2',
        name: 'Cafe B',
        address: '456 Oak Ave',
        processing_status: 'live',
        source: 'manual',
        enriched_at: null,
        tag_count: 0,
        has_embedding: false,
        current_job: null,
      },
    ] as ShopTableProps['shops'];

    renderShopTable(shops);

    expect(screen.getByText('Live')).toBeTruthy();
  });
});
