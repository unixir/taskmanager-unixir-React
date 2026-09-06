import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, apiUrl, ApiError, errorMessage, tokenKey } from './api'

describe('API client', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('sends JSON and the stored bearer token on protected requests', async () => {
    localStorage.setItem(tokenKey, 'test-token')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 1 }), { status: 200 }),
    )

    await expect(api<{ id: number }>('/api/user/profile')).resolves.toEqual({ id: 1 })
    expect(fetchMock).toHaveBeenCalledWith(
      `${apiUrl}/api/user/profile`,
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        }),
      }),
    )
  })

  it('combines server validation messages into a form-safe error', () => {
    expect(errorMessage({ errors: { Email: ['Email is invalid.'], Password: ['Password is required.'] } }))
      .toBe('Email is invalid. Password is required.')
  })

  it('uses a problem detail when the API returns a business error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: 'You do not have access.' }), { status: 403 }),
    )

    await expect(api('/api/board/1')).rejects.toMatchObject({
      status: 403,
      message: 'You do not have access.',
    })
  })

  it('clears an expired token and notifies the app on an authenticated 401', async () => {
    localStorage.setItem(tokenKey, 'expired-token')
    const unauthorized = vi.fn()
    window.addEventListener('taskflow:unauthorized', unauthorized)
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 401 }))

    await expect(api('/api/board/user/boards')).rejects.toBeInstanceOf(ApiError)
    expect(localStorage.getItem(tokenKey)).toBeNull()
    expect(unauthorized).toHaveBeenCalledOnce()
    window.removeEventListener('taskflow:unauthorized', unauthorized)
  })

  it('returns undefined for successful no-content deletes', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }))

    await expect(api<void>('/api/todoitem/10', { method: 'DELETE' })).resolves.toBeUndefined()
  })
})
