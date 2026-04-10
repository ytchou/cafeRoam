import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, beforeEach, describe, it, expect } from 'vitest'
import { SearchSuggestionPanel } from './search-suggestion-panel'

// Mock fetch at the HTTP boundary — never mock internal modules.
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function mockSuggestResponse(
  completions: string[],
  tags: { id: string; label: string }[]
) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ completions, tags }),
  })
}

describe('SearchSuggestionPanel', () => {
  beforeEach(() => mockFetch.mockClear())

  it('shows default phrase chips when a user has not typed anything', () => {
    render(<SearchSuggestionPanel query="" onPhraseSelect={vi.fn()} onTagSelect={vi.fn()} />)
    expect(screen.getByText('安靜可以工作')).toBeInTheDocument()
    expect(screen.getByText('適合約會')).toBeInTheDocument()
  })

  it('a user can start a search by clicking a default phrase chip', async () => {
    const onPhraseSelect = vi.fn()
    render(<SearchSuggestionPanel query="" onPhraseSelect={onPhraseSelect} onTagSelect={vi.fn()} />)
    await userEvent.click(screen.getByText('安靜可以工作'))
    expect(onPhraseSelect).toHaveBeenCalledWith('安靜可以工作')
  })

  it('shows autocomplete completions after the user types a query', async () => {
    mockSuggestResponse(['安靜可以工作的咖啡廳'], [{ id: 'tag_quiet', label: '安靜' }])
    render(<SearchSuggestionPanel query="安靜" onPhraseSelect={vi.fn()} onTagSelect={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('安靜可以工作的咖啡廳')).toBeInTheDocument()
    }, { timeout: 500 })
  })

  it('shows matching tag chips after the user types a query', async () => {
    mockSuggestResponse(['安靜可以工作的咖啡廳'], [{ id: 'tag_quiet', label: '安靜' }])
    render(<SearchSuggestionPanel query="安靜" onPhraseSelect={vi.fn()} onTagSelect={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('安靜')).toBeInTheDocument()
    }, { timeout: 500 })
  })

  it('a user can apply a tag filter by clicking a tag chip while typing', async () => {
    mockSuggestResponse([], [{ id: 'tag_quiet', label: '安靜' }])
    const onTagSelect = vi.fn()
    render(<SearchSuggestionPanel query="安靜" onPhraseSelect={vi.fn()} onTagSelect={onTagSelect} />)
    await waitFor(() => screen.getByText('安靜'), { timeout: 500 })
    await userEvent.click(screen.getByText('安靜'))
    expect(onTagSelect).toHaveBeenCalledWith({ id: 'tag_quiet', label: '安靜' })
  })
})
