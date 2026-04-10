import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchSuggestionPanel } from './search-suggestion-panel'

// Mock useSearchSuggestions
vi.mock('@/lib/hooks/use-search-suggestions', () => ({
  useSearchSuggestions: vi.fn((q: string) =>
    q
      ? { completions: ['安靜可以工作的咖啡廳'], tags: [{ id: 't1', label: '安靜' }], isLoading: false }
      : { completions: [], tags: [], isLoading: false }
  ),
}))

describe('SearchSuggestionPanel', () => {
  it('shows default phrase chips when query is empty', () => {
    render(<SearchSuggestionPanel query="" onPhraseSelect={vi.fn()} onTagSelect={vi.fn()} />)
    expect(screen.getByText('安靜可以工作')).toBeInTheDocument()
    expect(screen.getByText('適合約會')).toBeInTheDocument()
  })

  it('calls onPhraseSelect when a default phrase chip is clicked', async () => {
    const onPhraseSelect = vi.fn()
    render(<SearchSuggestionPanel query="" onPhraseSelect={onPhraseSelect} onTagSelect={vi.fn()} />)
    await userEvent.click(screen.getByText('安靜可以工作'))
    expect(onPhraseSelect).toHaveBeenCalledWith('安靜可以工作')
  })

  it('shows completion rows when query is non-empty', () => {
    render(<SearchSuggestionPanel query="安靜" onPhraseSelect={vi.fn()} onTagSelect={vi.fn()} />)
    expect(screen.getByText('安靜可以工作的咖啡廳')).toBeInTheDocument()
  })

  it('shows tag chips when query is non-empty', () => {
    render(<SearchSuggestionPanel query="安靜" onPhraseSelect={vi.fn()} onTagSelect={vi.fn()} />)
    expect(screen.getByText('安靜')).toBeInTheDocument()
  })

  it('calls onTagSelect when a tag chip is clicked while typing', async () => {
    const onTagSelect = vi.fn()
    render(<SearchSuggestionPanel query="安靜" onPhraseSelect={vi.fn()} onTagSelect={onTagSelect} />)
    await userEvent.click(screen.getByText('安靜'))
    expect(onTagSelect).toHaveBeenCalledWith({ id: 't1', label: '安靜' })
  })
})
