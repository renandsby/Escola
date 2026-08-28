import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'
import { createApiClient } from './api'
import { useAuthStore } from '@/stores/authStore'

type ResponseErrorHandler = (error: unknown) => Promise<unknown>

interface MockAxiosInstance {
  (config: Record<string, unknown>): Promise<{ data: unknown; config: Record<string, unknown> }>
  interceptors: {
    request: { use: (onFulfilled: (config: unknown) => unknown) => void }
    response: {
      use: (
        onFulfilled: (response: unknown) => unknown,
        onRejected: ResponseErrorHandler
      ) => void
    }
  }
}

vi.mock('axios', () => {
  // Stub genérico usado apenas para satisfazer a criação do `apiClient` singleton
  // no top-level do módulo `api.ts` (executado no momento do import). Os testes
  // sobrescrevem `axios.create`/`axios.post` em cada `beforeEach`.
  const stubClient = Object.assign(vi.fn(), {
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  })

  const create = vi.fn(() => stubClient)
  const post = vi.fn()

  return {
    default: { create, post },
  }
})

describe('createApiClient - refresh token mutex', () => {
  let mockClient: MockAxiosInstance
  let responseErrorHandler: ResponseErrorHandler

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock do axios instance retornado por axios.create(): precisa ser "callable"
    // porque o interceptor reexecuta a requisição original via `client(originalRequest)`.
    const clientFn = vi.fn((config: Record<string, unknown>) =>
      Promise.resolve({ data: { ok: true }, config })
    )

    mockClient = Object.assign(clientFn, {
      interceptors: {
        request: { use: vi.fn() },
        response: {
          use: vi.fn((_onFulfilled: unknown, onRejected: ResponseErrorHandler) => {
            responseErrorHandler = onRejected
          }),
        },
      },
    })

    vi.mocked(axios.create).mockReturnValue(
      mockClient as unknown as ReturnType<typeof axios.create>
    )

    vi.mocked(axios.post).mockResolvedValue({
      data: { access: 'new-access-token', refresh: 'new-refresh-token' },
    })

    useAuthStore.setState({
      accessToken: 'old-access-token',
      refreshToken: 'old-refresh-token',
      user: null,
      isAuthenticated: true,
    })

    createApiClient()
  })

  it('calls the refresh endpoint only once for concurrent 401s and retries both requests', async () => {
    const makeError = (url: string) => ({
      response: { status: 401, data: {} },
      config: { url, headers: {} as Record<string, string> },
    })

    const [result1, result2] = await Promise.all([
      responseErrorHandler(makeError('/students/')),
      responseErrorHandler(makeError('/schools/')),
    ])

    expect(axios.post).toHaveBeenCalledTimes(1)
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/accounts/token/refresh/'),
      { refresh: 'old-refresh-token' }
    )

    const config1 = (result1 as { config: { headers: Record<string, string> } }).config
    const config2 = (result2 as { config: { headers: Record<string, string> } }).config

    expect(config1.headers.Authorization).toBe('Bearer new-access-token')
    expect(config2.headers.Authorization).toBe('Bearer new-access-token')

    expect(mockClient).toHaveBeenCalledTimes(2)
    expect(useAuthStore.getState().accessToken).toBe('new-access-token')
    expect(useAuthStore.getState().refreshToken).toBe('new-refresh-token')
  })
})
