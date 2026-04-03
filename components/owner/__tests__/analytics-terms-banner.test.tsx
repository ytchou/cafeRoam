import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AnalyticsTermsBanner } from '../analytics-terms-banner';

describe('AnalyticsTermsBanner', () => {
  it('is presented as a modal dialog overlay', () => {
    render(<AnalyticsTermsBanner onAccept={vi.fn()} accepting={false} />);
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('links to the full data terms page', () => {
    render(<AnalyticsTermsBanner onAccept={vi.fn()} accepting={false} />);
    const link = screen.getByRole('link', { name: /data usage terms/i });
    expect(link).toHaveAttribute('href', '/owner/data-terms');
  });

  it('calls onAccept when the owner clicks I understand', () => {
    const onAccept = vi.fn();
    render(<AnalyticsTermsBanner onAccept={onAccept} accepting={false} />);
    fireEvent.click(screen.getByRole('button', { name: /i understand/i }));
    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  it('disables the button and shows processing label while acceptance is in flight', () => {
    render(<AnalyticsTermsBanner onAccept={vi.fn()} accepting={true} />);
    const button = screen.getByRole('button', { name: /processing/i });
    expect(button).toBeDisabled();
  });

  it('mentions that data is aggregate and anonymized', () => {
    render(<AnalyticsTermsBanner onAccept={vi.fn()} accepting={false} />);
    expect(screen.getByText(/aggregate and anonymized/i)).toBeTruthy();
  });
});
