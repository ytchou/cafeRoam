import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signUp: vi.fn(),
    },
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import SignupPage from './page';

describe('SignupPage', () => {
  it('renders without crashing', () => {
    const { container } = render(<SignupPage />);
    expect(container).toBeTruthy();
  });
});
