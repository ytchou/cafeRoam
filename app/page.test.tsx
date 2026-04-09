import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Suspense } from 'react'
import HomePage from './page'

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

vi.mock('@/lib/hooks/use-search', () => ({
  useSearch: vi.fn().mockReturnValue({
    results: [],
    queryType: null,
    resultCount: 0,
    isLoading: false,
    error: null,
  }),
}))

vi.mock('@/lib/hooks/use-search-state', () => ({
  useSearchState: vi.fn().mockReturnValue({
    query: null,
    mode: null,
    filters: [],
    view: 'list',
    setQuery: vi.fn(),
    setMode: vi.fn(),
    toggleFilter: vi.fn(),
    setFilters: vi.fn(),
    setView: vi.fn(),
  }),
}))

vi.mock('@/lib/hooks/use-geolocation', () => ({
  useGeolocation: vi.fn().mockReturnValue({ position: null, requestLocation: vi.fn() }),
}))

vi.mock('@/components/map/map-with-fallback', () => ({
  MapWithFallback: () => <div data-testid="map-with-fallback" />,
}))

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

const mockUseUser = vi.fn()
vi.mock('@/lib/hooks/use-user', () => ({
  useUser: () => mockUseUser(),
}))

function renderHome() {
  return render(<Suspense><HomePage /></Suspense>)
}

describe('HomePage (unified)', () => {
  beforeEach(() => {
    mockUseUser.mockReturnValue({ user: null, isLoading: false })
    mockPush.mockClear()
    localStorage.clear()
  })

  it('renders a search bar', () => {
    renderHome()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('renders mode chips', () => {
    renderHome()
    expect(screen.getAllByText(/工作|休息|社交|特色/).length).toBeGreaterThan(0)
  })

  it('renders the map/list area', () => {
    renderHome()
    expect(screen.getByTestId('map-with-fallback')).toBeInTheDocument()
  })

  describe('free search gate', () => {
    it('sets free search flag in localStorage on first semantic search for unauth user', async () => {
      renderHome()
      expect(localStorage.getItem('caferoam_free_search_used')).toBeNull()
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '安靜的咖啡廳' } })
      fireEvent.submit(screen.getByRole('search'))
      expect(localStorage.getItem('caferoam_free_search_used')).toBe('true')
    })

    it('redirects to login on second semantic search for unauth user', async () => {
      localStorage.setItem('caferoam_free_search_used', 'true')
      renderHome()
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '有插座的咖啡廳' } })
      fireEvent.submit(screen.getByRole('search'))
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login?returnTo=/')
      })
    })

    it('bypasses gate for authenticated users even when flag is set', () => {
      mockUseUser.mockReturnValue({ user: { id: 'user-1' }, isLoading: false })
      localStorage.setItem('caferoam_free_search_used', 'true')
      renderHome()
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '有插座的咖啡廳' } })
      fireEvent.submit(screen.getByRole('search'))
      expect(mockPush).not.toHaveBeenCalledWith(expect.stringContaining('/login'))
    })
  })
})
