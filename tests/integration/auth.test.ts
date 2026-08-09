import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      signOut: vi.fn().mockResolvedValue({}),
    }
  }))
}))

describe('Auth Middleware', () => {
  it('redirects unauthenticated users to /login', async () => {
    const req = new NextRequest('http://localhost/api/projects')
    const res = await updateSession(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost/login')
  })
})
