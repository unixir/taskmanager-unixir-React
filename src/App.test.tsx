import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { apiUrl } from './api'

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
