/**
 * Helpers para chamadas de API comuns
 */

import { AxiosError } from 'axios'
import { apiClient } from '@/services/api'
import { PaginatedResponse, RequestParams } from '@/types'

/**
 * Executa uma requisição GET com tratamento de erro padrão
 */
export async function apiGet<T>(
  url: string,
  params?: RequestParams
): Promise<T | null> {
  try {
    const response = await apiClient.get<T>(url, { params })
    return response.data
  } catch (error) {
    console.error(`GET ${url}:`, error)
    return null
  }
}

/**
 * Executa uma requisição POST com tratamento de erro padrão
 */
export async function apiPost<T>(
  url: string,
  data?: Record<string, unknown>
): Promise<T | null> {
  try {
    const response = await apiClient.post<T>(url, data)
    return response.data
  } catch (error) {
    console.error(`POST ${url}:`, error)
    return null
  }
}

/**
 * Executa uma requisição PUT com tratamento de erro padrão
 */
export async function apiPut<T>(
  url: string,
  data?: Record<string, unknown>
): Promise<T | null> {
  try {
    const response = await apiClient.put<T>(url, data)
    return response.data
  } catch (error) {
    console.error(`PUT ${url}:`, error)
    return null
  }
}

/**
 * Executa uma requisição PATCH com tratamento de erro padrão
 */
export async function apiPatch<T>(
  url: string,
  data?: Record<string, unknown>
): Promise<T | null> {
  try {
    const response = await apiClient.patch<T>(url, data)
    return response.data
  } catch (error) {
    console.error(`PATCH ${url}:`, error)
    return null
  }
}

/**
 * Executa uma requisição DELETE com tratamento de erro padrão
 */
export async function apiDelete<T>(url: string): Promise<T | null> {
  try {
    const response = await apiClient.delete<T>(url)
    return response.data
  } catch (error) {
    console.error(`DELETE ${url}:`, error)
    return null
  }
}

/**
 * Executa uma requisição paginada
 */
export async function apiGetPaginated<T>(
  url: string,
  page: number = 1,
  pageSize: number = 20,
  params?: Record<string, unknown>
): Promise<PaginatedResponse<T> | null> {
  try {
    const response = await apiClient.get<PaginatedResponse<T>>(url, {
      params: {
        page,
        page_size: pageSize,
        ...params,
      },
    })
    return response.data
  } catch (error) {
    console.error(`GET (paginated) ${url}:`, error)
    return null
  }
}

/**
 * Extrai mensagem de erro de uma exception do Axios
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as Record<string, unknown>

    if (data?.message) {
      return String(data.message)
    }

    if (data?.detail) {
      return String(data.detail)
    }

    if (error.response?.status === 404) {
      return 'Recurso não encontrado'
    }

    if (error.response?.status === 403) {
      return 'Você não tem permissão para acessar isto'
    }

    if (error.response?.status === 401) {
      return 'Sessão expirada. Por favor, faça login novamente'
    }

    if (error.response?.status === 500) {
      return 'Erro no servidor. Tente novamente mais tarde'
    }

    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Erro desconhecido'
}

/**
 * Extrai erros de validação de uma exception do Axios
 */
export function getValidationErrors(
  error: unknown
): Record<string, string[]> {
  if (error instanceof AxiosError) {
    const data = error.response?.data as Record<string, unknown>

    if (data?.errors && typeof data.errors === 'object') {
      return data.errors as Record<string, string[]>
    }

    // Tentar extrair erros de diferentes formatos
    const errors: Record<string, string[]> = {}

    for (const [key, value] of Object.entries(data || {})) {
      if (Array.isArray(value)) {
        errors[key] = value.map(String)
      } else if (typeof value === 'string') {
        errors[key] = [value]
      }
    }

    return errors
  }

  return {}
}

/**
 * Cria um AbortController com timeout
 */
export function createAbortWithTimeout(
  timeoutMs: number = 30000
): AbortController {
  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeoutMs)
  return controller
}

/**
 * Retry com backoff exponencial
 */
export async function apiWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | null = null

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)))
      }
    }
  }

  throw lastError || new Error('Max retries exceeded')
}
