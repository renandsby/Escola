import axios, { AxiosInstance, AxiosError } from 'axios'
import { useAuthStore } from '@/stores/authStore'
import type {
  LoginResponse,
  TOTPConfirmResponse,
  TOTPEnableResponse,
  TOTPStatus,
} from '@/types/api'

// Use relative URL so Nginx proxy at /api/ works
const API_URL = '/api/v1'

// Mutex de refresh token: evita que múltiplas respostas 401 concorrentes disparem
// chamadas paralelas de refresh (o backend rotaciona e invalida o refresh token a
// cada uso, então uma segunda chamada concorrente usaria um token já invalidado).
let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else if (token) {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

export const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  client.interceptors.request.use((config) => {
    const { accessToken } = useAuthStore.getState()

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }

    return config
  })

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config

      const isAuthEndpoint =
        originalRequest?.url?.includes('/accounts/token/refresh/') ||
        originalRequest?.url?.includes('/accounts/login/')

      if (
        error.response?.status === 401 &&
        originalRequest &&
        !(originalRequest as { _retry?: boolean })._retry &&
        !isAuthEndpoint
      ) {
        const { refreshToken, setTokens, logout } = useAuthStore.getState()

        if (refreshToken) {
          (originalRequest as { _retry?: boolean })._retry = true

          if (isRefreshing) {
            // Já existe um refresh em andamento: enfileira esta requisição e a
            // reexecuta assim que o novo access token estiver disponível.
            return new Promise<string>((resolve, reject) => {
              failedQueue.push({ resolve, reject })
            })
              .then((newToken) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${newToken}`
                }
                return client(originalRequest)
              })
              .catch((queueError) => Promise.reject(queueError))
          }

          isRefreshing = true

          try {
            const response = await axios.post(`${API_URL}/accounts/token/refresh/`, {
              refresh: refreshToken,
            })

            setTokens(response.data.access, response.data.refresh)

            processQueue(null, response.data.access)

            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${response.data.access}`
            }

            return client(originalRequest)
          } catch (refreshError) {
            processQueue(refreshError, null)
            logout()
            window.location.href = '/login'
            return Promise.reject(refreshError)
          } finally {
            isRefreshing = false
          }
        } else {
          logout()
          window.location.href = '/login'
        }
      }

      // Falha de rede (sem resposta do servidor) — toast único; erros com
      // resposta ficam a cargo da página (FormError inline / toast).
      if (!error.response && error.code !== 'ERR_CANCELED') {
        void import('sonner').then(({ toast }) =>
          toast.error('Sem conexão com o servidor. Verifique sua internet.')
        )
      }

      return Promise.reject(error)
    }
  )

  return client
}

export const apiClient = createApiClient()

export const authService = {
  login: (identifier: string, password: string) =>
    apiClient.post('/accounts/login/', { identifier, password }),

  register: (data: {
    cpf: string
    email: string
    password: string
    password_confirm: string
    first_name?: string
    last_name?: string
    role?: string
    school?: string
    education_department?: string
  }) => apiClient.post('/accounts/users/register/', data),

  getProfile: () => apiClient.get('/accounts/users/me/'),

  updateProfile: (data: Record<string, unknown>) =>
    apiClient.patch('/accounts/users/update_profile/', data),

  changePassword: (data: {
    current_password: string
    new_password: string
    new_password_confirm: string
  }) => apiClient.post('/accounts/users/change_password/', data),

  requestPasswordReset: (email_or_username: string) =>
    apiClient.post('/accounts/password-reset/request/', { email_or_username }),

  confirmPasswordReset: (data: {
    token: string
    new_password: string
    new_password_confirm: string
  }) => apiClient.post('/accounts/password-reset/confirm/', data),

  // --- 2FA / TOTP ---
  getTOTPStatus: () => apiClient.get<TOTPStatus>('/accounts/totp/status/'),

  enableTOTP: () => apiClient.post<TOTPEnableResponse>('/accounts/totp/enable/'),

  confirmTOTP: (code: string) =>
    apiClient.post<TOTPConfirmResponse>('/accounts/totp/confirm/', { code }),

  disableTOTP: () => apiClient.post('/accounts/totp/disable/'),

  verifyTOTP: (data: { challenge_token: string; code: string }) =>
    apiClient.post<LoginResponse>('/accounts/totp/verify/', data),
}

/** Endpoints da Secretaria Municipal de Educação */
export const smeService = {
  departments: {
    list: (params?: Record<string, unknown>) =>
      apiClient.get('/sme/departments/', { params }),
    get: (id: string) => apiClient.get(`/sme/departments/${id}/`),
    indicators: (id: string) =>
      apiClient.get(`/sme/departments/${id}/indicators/`),
  },
  academicYears: {
    list: (params?: Record<string, unknown>) =>
      apiClient.get('/sme/academic-years/', { params }),
    get: (id: string) => apiClient.get(`/sme/academic-years/${id}/`),
  },
  academicPeriods: {
    list: (params?: Record<string, unknown>) =>
      apiClient.get('/sme/academic-periods/', { params }),
    get: (id: string) => apiClient.get(`/sme/academic-periods/${id}/`),
  },
  stages: {
    list: (params?: Record<string, unknown>) =>
      apiClient.get('/sme/stages/', { params }),
    get: (id: string) => apiClient.get(`/sme/stages/${id}/`),
  },
  curriculumMatrices: {
    list: (params?: Record<string, unknown>) =>
      apiClient.get('/sme/curriculum-matrices/', { params }),
    get: (id: string) => apiClient.get(`/sme/curriculum-matrices/${id}/`),
    create: (data: Record<string, unknown>) =>
      apiClient.post('/sme/curriculum-matrices/', data),
  },
  transfers: {
    list: (params?: Record<string, unknown>) =>
      apiClient.get('/sme/transfers/', { params }),
    get: (id: string) => apiClient.get(`/sme/transfers/${id}/`),
    create: (data: Record<string, unknown>) =>
      apiClient.post('/sme/transfers/', data),
    authorize: (id: string, data?: Record<string, unknown>) =>
      apiClient.patch(`/sme/transfers/${id}/authorize/`, data),
    accept: (id: string, data?: Record<string, unknown>) =>
      apiClient.patch(`/sme/transfers/${id}/accept/`, data),
  },
}

/** Pareceres descritivos */
export const evaluationService = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get('/evaluations/', { params }),
  get: (id: string) => apiClient.get(`/evaluations/${id}/`),
  create: (data: Record<string, unknown>) =>
    apiClient.post('/evaluations/', data),
  update: (id: string, data: Record<string, unknown>) =>
    apiClient.put(`/evaluations/${id}/`, data),
  delete: (id: string) => apiClient.delete(`/evaluations/${id}/`),
}

/** Alocações docentes */
export const teacherService = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get('/teachers/', { params }),
  get: (id: string) => apiClient.get(`/teachers/${id}/`),
  allocations: {
    list: (params?: Record<string, unknown>) =>
      apiClient.get('/teachers/allocations/', { params }),
    create: (data: Record<string, unknown>) =>
      apiClient.post('/teachers/allocations/', data),
    delete: (id: string) => apiClient.delete(`/teachers/allocations/${id}/`),
  },
}

export const createEndpointService = (endpoint: string) => ({
  list: (params?: Record<string, unknown>) =>
    apiClient.get(`/${endpoint}/`, { params }),
  create: (data: Record<string, unknown>) =>
    apiClient.post(`/${endpoint}/`, data),
  get: (id: string) => apiClient.get(`/${endpoint}/${id}/`),
  update: (id: string, data: Record<string, unknown>) =>
    apiClient.put(`/${endpoint}/${id}/`, data),
  patch: (id: string, data: Record<string, unknown>) =>
    apiClient.patch(`/${endpoint}/${id}/`, data),
  delete: (id: string) => apiClient.delete(`/${endpoint}/${id}/`),
})
