import { render, screen } from '@testing-library/react';
import { ListsTab } from './lists-tab';

vi.mock('@/lib/hooks/use-user-lists', () => ({
  useUserLists: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock('@/components/lists/empty-slot-card', () => ({
  EmptySlotCard: ({
    remainingSlots,
    onClick,
  }: {
    remainingSlots: number;
    onClick: () => void;
  }) => <button onClick={onClick}>{remainingSlots} slots remaining</button>,
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { useUserLists } from '@/lib/hooks/use-user-lists';

type UseUserListsReturn = ReturnType<typeof useUserLists>;

const mockUseUserLists = vi.mocked(useUserLists);

describe('ListsTab', () => {
  it('renders list names and shop counts', () => {
    mockUseUserLists.mockReturnValue({
      lists: [
        {
          id: 'list-1',
          name: 'Morning Coffee',
          items: [
            { shop_id: 'a', added_at: '' },
            { shop_id: 'b', added_at: '' },
          ],
          user_id: 'u',
          created_at: '',
          updated_at: '',
        },
      ],
      isLoading: false,
    } as UseUserListsReturn);

    render(<ListsTab />);
    expect(screen.getByText('Morning Coffee')).toBeInTheDocument();
    expect(screen.getByText('2 shops')).toBeInTheDocument();
  });

  it('renders "View all lists →" link to /lists', () => {
    mockUseUserLists.mockReturnValue({
      lists: [
        {
          id: 'list-1',
          name: 'Morning Coffee',
          items: [],
          user_id: 'u',
          created_at: '',
          updated_at: '',
        },
      ],
      isLoading: false,
    } as UseUserListsReturn);

    render(<ListsTab />);
    const cta = screen.getByRole('link', { name: /view all lists/i });
    expect(cta).toHaveAttribute('href', '/lists');
  });

  it('shows empty state with CTA when user has no lists', () => {
    mockUseUserLists.mockReturnValue({
      lists: [],
      isLoading: false,
    } as UseUserListsReturn);

    render(<ListsTab />);
    expect(screen.getByText(/no lists yet/i)).toBeInTheDocument();
    const cta = screen.getByRole('link', { name: /create your first list/i });
    expect(cta).toHaveAttribute('href', '/lists');
  });

  it('shows loading spinner while loading', () => {
    mockUseUserLists.mockReturnValue({
      lists: [],
      isLoading: true,
    } as UseUserListsReturn);

    render(<ListsTab />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });
});
