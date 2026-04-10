import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchInputTokens } from './search-input-tokens'

describe('SearchInputTokens', () => {
  it('a user can see the text input field to type a search query', () => {
    render(<SearchInputTokens value="" tokens={[]} onValueChange={vi.fn()} onTokenRemove={vi.fn()} onSubmit={vi.fn()} />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('a user can see their applied tag filters as removable pills', () => {
    render(<SearchInputTokens value="" tokens={[{ id: 't1', label: '安靜' }]} onValueChange={vi.fn()} onTokenRemove={vi.fn()} onSubmit={vi.fn()} />)
    expect(screen.getByText('安靜')).toBeInTheDocument()
  })

  it('a user can remove an applied tag by clicking its × button', async () => {
    const onTokenRemove = vi.fn()
    render(<SearchInputTokens value="" tokens={[{ id: 't1', label: '安靜' }]} onValueChange={vi.fn()} onTokenRemove={onTokenRemove} onSubmit={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /remove 安靜/i }))
    expect(onTokenRemove).toHaveBeenCalledWith('t1')
  })

  it('a user can submit their search query by pressing Enter or the search button', async () => {
    const onSubmit = vi.fn()
    render(<SearchInputTokens value="找咖啡" tokens={[]} onValueChange={vi.fn()} onTokenRemove={vi.fn()} onSubmit={onSubmit} />)
    fireEvent.submit(screen.getByRole('search'))
    expect(onSubmit).toHaveBeenCalledWith('找咖啡')
  })

  it('a user can remove the last applied tag by pressing Backspace when the input is empty', async () => {
    const onTokenRemove = vi.fn()
    render(<SearchInputTokens value="" tokens={[{ id: 't1', label: '安靜' }, { id: 't2', label: '有插座' }]} onValueChange={vi.fn()} onTokenRemove={onTokenRemove} onSubmit={vi.fn()} />)
    await userEvent.type(screen.getByRole('textbox'), '{Backspace}')
    expect(onTokenRemove).toHaveBeenCalledWith('t2')
  })
})
