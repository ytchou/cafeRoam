import { GET } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/api/proxy', () => ({
  proxyToBackend: vi.fn().mockResolvedValue(new Response('{"completions":[],"tags":[]}', { status: 200 }))
}))

describe('GET /api/search/suggest', () => {
  it('forwards request to backend suggest endpoint', async () => {
    const { proxyToBackend } = await import('@/lib/api/proxy')
    const req = new NextRequest('http://localhost/api/search/suggest?q=安靜')
    await GET(req)
    expect(proxyToBackend).toHaveBeenCalledWith(req, '/search/suggest')
  })
})
