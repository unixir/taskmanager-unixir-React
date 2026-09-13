import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { apiUrl, tokenKey } from './api'

describe('authentication routes', () => {
  beforeEach(() => {
    localStorage.clear()
    window.history.pushState({}, '', '/signup')
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => vi.unstubAllGlobals())

  it('submits a signup request and navigates to OTP verification', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ userId: 1 }), { status: 201 }))
    render(<App />)

    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Jane Doe' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jane@example.com' } })
    fireEvent.change(screen.getByLabelText('Age'), { target: { value: '25' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Secret123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => expect(window.location.pathname).toBe('/verify-otp'))
    expect(fetch).toHaveBeenCalledWith(
      `${apiUrl}/signup`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Jane Doe', email: 'jane@example.com', password: 'Secret123', age: 25 }),
      }),
    )
  })

  it('constrains the email input to the API maximum length', () => {
    render(<App />)

    expect(screen.getByLabelText('Email')).toHaveAttribute('maxlength', '30')
  })

  it('requests a reset code without exposing whether the email exists', async () => {
    window.history.pushState({}, '', '/forgot-password')
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ message: 'If an account exists...' }), { status: 200 }))
    render(<App />)

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jane@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send reset code' }))

    await waitFor(() => expect(window.location.pathname).toBe('/reset-password'))
    expect(fetch).toHaveBeenCalledWith(
      `${apiUrl}/ForgotPassword`,
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ email: 'jane@example.com' }) }),
    )
  })

  it('submits a valid reset code and redirects to sign in with confirmation', async () => {
    window.history.pushState({}, '', '/reset-password?email=jane%40example.com')
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ message: 'Password reset.' }), { status: 200 }))
    render(<App />)

    fireEvent.change(screen.getByLabelText('Reset code'), { target: { value: '123456' } })
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'NewSecret123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }))

    await waitFor(() => expect(window.location.pathname).toBe('/signin'))
    expect(window.location.search).toBe('?passwordReset=1')
    expect(fetch).toHaveBeenCalledWith(
      `${apiUrl}/ForgotPassword/reset`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'jane@example.com', code: '123456', newPassword: 'NewSecret123' }),
      }),
    )
  })
})

describe('board member management', () => {
  const profile = { id: 1, name: 'Owner', emailAddress: 'owner@example.com', age: 30, role: 'User' }
  const memberProfile = { id: 2, name: 'Bob', emailAddress: 'bob@example.com', age: 30, role: 'User' }
  const existingMember = { id: 5, boardId: 1, userId: 2, userName: 'Bob', userEmail: 'bob@example.com', joinedAt: '2026-01-01T00:00:00Z' }
  const baseBoard = { id: 1, title: 'Board', description: null, ownerId: 1, ownerName: 'Owner', tasks: [], members: [existingMember] }

  function jsonResponse(body: unknown, status = 200) {
    return new Response(status === 204 ? null : JSON.stringify(body), { status })
  }

  function mockRoutes(routes: { profile?: typeof profile; board?: typeof baseBoard; onBoardMemberPost?: () => Response; onBoardMemberDelete?: () => Response }) {
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      if (url === `${apiUrl}/api/user/profile`) return jsonResponse(routes.profile ?? profile)
      if (url === `${apiUrl}/api/board/1` && method === 'GET') return jsonResponse(routes.board ?? baseBoard)
      if (url === `${apiUrl}/api/boardmember` && method === 'POST') return (routes.onBoardMemberPost ?? (() => jsonResponse({ ...existingMember, id: 6 }, 201)))()
      if (url.startsWith(`${apiUrl}/api/boardmember?`) && method === 'DELETE') return (routes.onBoardMemberDelete ?? (() => jsonResponse(null, 204)))()
      throw new Error(`Unhandled request: ${method} ${url}`)
    })
  }

  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem(tokenKey, 'test-token')
    window.history.pushState({}, '', '/boards/1')
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => vi.unstubAllGlobals())

  it('adds a member by email and refreshes the member list', async () => {
    mockRoutes({ board: baseBoard })
    render(<App />)

    await screen.findByText('Bob')
    fireEvent.change(screen.getByPlaceholderText('Member email'), { target: { value: 'new@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add member' }))

    await waitFor(() => expect(fetch).toHaveBeenCalledWith(
      `${apiUrl}/api/boardmember`,
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ boardId: 1, newMemberEmail: 'new@example.com' }) }),
    ))
    await waitFor(() => expect(screen.getByPlaceholderText('Member email')).toHaveValue(''))
  })

  it('shows an error when adding an email with no matching account', async () => {
    mockRoutes({ onBoardMemberPost: () => jsonResponse({ detail: 'No user found with email new@example.com.' }, 404) })
    render(<App />)

    await screen.findByText('Bob')
    fireEvent.change(screen.getByPlaceholderText('Member email'), { target: { value: 'new@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add member' }))

    expect(await screen.findByText('No user found with email new@example.com.')).toBeInTheDocument()
  })

  it('removes a member after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    mockRoutes({ board: baseBoard })
    render(<App />)

    await screen.findByText('Bob')
    fireEvent.click(screen.getByRole('button', { name: 'Remove Bob' }))

    await waitFor(() => expect(fetch).toHaveBeenCalledWith(
      `${apiUrl}/api/boardmember?boardId=1&memberId=2`,
      expect.objectContaining({ method: 'DELETE' }),
    ))
  })

  it('does not call the API when removal is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    mockRoutes({ board: baseBoard })
    render(<App />)

    await screen.findByText('Bob')
    fireEvent.click(screen.getByRole('button', { name: 'Remove Bob' }))

    await new Promise(resolve => setTimeout(resolve, 0))
    expect(fetch).not.toHaveBeenCalledWith(expect.stringContaining('/api/boardmember'), expect.objectContaining({ method: 'DELETE' }))
  })

  it('hides the remove control from non-owner members', async () => {
    mockRoutes({ profile: memberProfile, board: baseBoard })
    render(<App />)

    await screen.findByText('bob@example.com')
    expect(screen.queryByRole('button', { name: 'Remove Bob' })).not.toBeInTheDocument()
  })
})
