export const apiUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5173'

export const tokenKey = 'taskflow-access-token'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function errorMessage(body: unknown) {
  if (body && typeof body === 'object') {
    const value = body as { errors?: Record<string, string[]>; detail?: string; message?: string }
    if (value.errors) return Object.values(value.errors).flat().join(' ')
    return value.detail ?? value.message ?? 'Something went wrong. Please try again.'
  }

  return 'Something went wrong. Please try again.'
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(tokenKey)
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (response.status === 401 && token) {
    localStorage.removeItem(tokenKey)
    window.dispatchEvent(new Event('taskflow:unauthorized'))
  }

  if (!response.ok) {
    let body: unknown
    try {
      body = await response.json()
    } catch {
      body = null
    }
    throw new ApiError(response.status, errorMessage(body))
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
