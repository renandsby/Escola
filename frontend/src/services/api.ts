import axios, { AxiosInstance, AxiosError } from 'axios'
import { useAuthStore } from '@/store/auth'

// Use relative URL so Nginx proxy at /api/ works
const API_URL = '/api/v1'
console.log('🔧 API_URL configured as:', API_URL)

export const createApiClient = (): AxiosInstance => {
  console.log('🔧 Creating axios client with baseURL:', API_URL)
  const client = axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // Interceptor de requisição
  client.interceptors.request.use((config) => {
    const { token } = useAuthStore.getState()

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  })

  // Interceptor de resposta
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config

      // Se receber 401, tenta renovar o token
      if (error.response?.status === 401 && originalRequest) {
        const { refreshToken, setToken, logout } = useAuthStore.getState()

        if (refreshToken) {
          try {
            const response = await axios.post(`${API_URL}/accounts/token/refresh/`, {
              refresh: refreshToken,
            })

            setToken(response.data.access)

            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${response.data.access}`
            }

            return client(originalRequest)
          } catch (refreshError) {
            logout()
            window.location.href = '/login'
          }
        } else {
          logout()
          window.location.href = '/login'
        }
      }

      return Promise.reject(error)
    }
  )

  return client
}

export const apiClient = createApiClient()

// Endpoints de autenticação
export const authService = {
  login: (username: string, password: string) =>
    apiClient.post('/accounts/login/', { username, password }),

  register: (data: {
    username: string
    email: string
    password: string
    password_confirm: string
    first_name?: string
    last_name?: string
    role?: string
    school?: string
  }) => apiClient.post('/accounts/users/register/', data),

  getProfile: () => apiClient.get('/accounts/users/me/'),

  updateProfile: (data: Record<string, unknown>) => apiClient.patch('/accounts/users/update_profile/', data),

  changePassword: (data: {
    current_password: string
    new_password: string
    new_password_confirm: string
  }) => apiClient.post('/accounts/users/change_password/', data),
}

// Endpoints de escolas
export const schoolService = {
  list: (params?: Record<string, unknown>) => apiClient.get('/schools/', { params }),
  create: (data: Record<string, unknown>) => apiClient.post('/schools/', data),
  get: (id: string) => apiClient.get(`/schools/${id}/`),
  update: (id: string, data: Record<string, unknown>) => apiClient.put(`/schools/${id}/`, data),
  delete: (id: string) => apiClient.delete(`/schools/${id}/`),
}

// Endpoints de alunos
export const studentService = {
  list: (params?: Record<string, unknown>) => apiClient.get('/students/', { params }),
  create: (data: Record<string, unknown>) => apiClient.post('/students/', data),
  get: (id: string) => apiClient.get(`/students/${id}/`),
  update: (id: string, data: Record<string, unknown>) => apiClient.put(`/students/${id}/`, data),
  delete: (id: string) => apiClient.delete(`/students/${id}/`),
}

// Endpoints genéricos
export const createEndpointService = (endpoint: string) => ({
  list: (params?: Record<string, unknown>) => apiClient.get(`/${endpoint}/`, { params }),
  create: (data: Record<string, unknown>) => apiClient.post(`/${endpoint}/`, data),
  get: (id: string) => apiClient.get(`/${endpoint}/${id}/`),
  update: (id: string, data: Record<string, unknown>) => apiClient.put(`/${endpoint}/${id}/`, data),
  patch: (id: string, data: Record<string, unknown>) => apiClient.patch(`/${endpoint}/${id}/`, data),
  delete: (id: string) => apiClient.delete(`/${endpoint}/${id}/`),
})
