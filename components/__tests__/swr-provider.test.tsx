import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useSWRConfig } from 'swr';
import { SWRProvider } from '../swr-provider';

function ConfigReader() {
  const { revalidateOnFocus } = useSWRConfig();
  return <div data-testid="revalidate-on-focus">{String(revalidateOnFocus)}</div>;
}

describe('SWRProvider', () => {
  it('renders children', () => {
    render(
      <SWRProvider>
        <span>hello</span>
      </SWRProvider>
    );
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('sets revalidateOnFocus to false for all descendants', () => {
    render(
      <SWRProvider>
        <ConfigReader />
      </SWRProvider>
    );
    expect(screen.getByTestId('revalidate-on-focus').textContent).toBe('false');
  });
});
