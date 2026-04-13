import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ShopDescription } from './shop-description'

describe('ShopDescription', () => {
  it('renders full description text without truncation', () => {
    const longText = 'This is a very long description that would have been truncated before. '.repeat(5)
    render(<ShopDescription text={longText} />)
    expect(screen.getByText(longText.trim())).toBeInTheDocument()
  })

  it('does not render a show more toggle button', () => {
    render(<ShopDescription text="Some description text" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByText(/更多|Read more/i)).not.toBeInTheDocument()
  })

  it('handles empty text gracefully', () => {
    render(<ShopDescription text="" />)
    expect(screen.queryByText(/更多/)).not.toBeInTheDocument()
  })
})
