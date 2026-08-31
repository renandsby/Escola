import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AxiosError } from 'axios'
import {
  apiGet,
  apiPost,
  apiPut,
  apiPatch,
  apiDelete,
  apiGetPaginated,
  getErrorCode,
  getErrorDetails,
  getErrorMessage,
  getValidationErrors,
  createAbortWithTimeout,
  apiWithRetry,
} from '../api-helpers'
import { apiClient } from '@/services/api'

vi.mock('@/services/api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('api-helpers.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('apiGet', () => {
    it('retorna dados em caso de sucesso', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { id: 1, name: 'Escola 1' } } as any)

      const result = await apiGet('/schools/1/')
      expect(result).toEqual({ id: 1, name: 'Escola 1' })
      expect(apiClient.get).toHaveBeenCalledWith('/schools/1/', { params: undefined })
    })

    it('retorna null e loga em caso de erro', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Network error'))

      const result = await apiGet('/schools/error/')
      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('apiPost', () => {
    it('retorna dados ao criar recurso', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { success: true } } as any)

      const result = await apiPost('/students/', { name: 'João' })
      expect(result).toEqual({ success: true })
      expect(apiClient.post).toHaveBeenCalledWith('/students/', { name: 'João' })
    })

    it('relança erro em caso de falha', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('Post failed'))

      await expect(apiPost('/students/', {})).rejects.toThrow('Post failed')
      consoleSpy.mockRestore()
    })
  })

  describe('apiPut', () => {
    it('retorna dados ao atualizar recurso por PUT', async () => {
      vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { updated: true } } as any)

      const result = await apiPut('/students/1/', { name: 'João Silva' })
      expect(result).toEqual({ updated: true })
    })

    it('relança erro em caso de falha no PUT', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(apiClient.put).mockRejectedValueOnce(new Error('Put failed'))

      await expect(apiPut('/students/1/', {})).rejects.toThrow('Put failed')
      consoleSpy.mockRestore()
    })
  })

  describe('apiPatch', () => {
    it('retorna dados ao atualizar recurso por PATCH', async () => {
      vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: { patched: true } } as any)

      const result = await apiPatch('/students/1/', { status: 'active' })
      expect(result).toEqual({ patched: true })
    })

    it('retorna null em caso de erro no PATCH', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(apiClient.patch).mockRejectedValueOnce(new Error('Patch error'))

      const result = await apiPatch('/students/1/', {})
      expect(result).toBeNull()
      consoleSpy.mockRestore()
    })
  })

  describe('apiDelete', () => {
    it('retorna dados em caso de exclusão com sucesso', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: { deleted: true } } as any)

      const result = await apiDelete('/students/1/')
      expect(result).toEqual({ deleted: true })
    })

    it('retorna null em caso de erro no DELETE', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(apiClient.delete).mockRejectedValueOnce(new Error('Delete error'))

      const result = await apiDelete('/students/1/')
      expect(result).toBeNull()
      consoleSpy.mockRestore()
    })
  })

  describe('apiGetPaginated', () => {
    it('chama apiClient.get com page e page_size configurados', async () => {
      const paginatedData = { count: 100, next: null, previous: null, results: [{ id: 1 }] }
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: paginatedData } as any)

      const result = await apiGetPaginated('/students/', 2, 50, { search: 'ana' })
      expect(result).toEqual(paginatedData)
      expect(apiClient.get).toHaveBeenCalledWith('/students/', {
        params: { page: 2, page_size: 50, search: 'ana' },
      })
    })

    it('retorna null em caso de erro na paginação', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Paginated error'))

      const result = await apiGetPaginated('/students/')
      expect(result).toBeNull()
      consoleSpy.mockRestore()
    })
  })

  describe('getErrorCode', () => {
    it('extrai código do envelope da resposta', () => {
      const error = new AxiosError()
      error.response = {
        data: { error: { code: 'TURMA_LOTADA' } },
      } as any

      expect(getErrorCode(error)).toBe('TURMA_LOTADA')
    })

    it('retorna códigos HTTP padrão mapeados se sem envelope', () => {
      const e404 = new AxiosError()
      e404.response = { status: 404, data: {} } as any
      expect(getErrorCode(e404)).toBe('HTTP404')

      const e403 = new AxiosError()
      e403.response = { status: 403, data: {} } as any
      expect(getErrorCode(e403)).toBe('PERMISSIONDENIED')

      const e401 = new AxiosError()
      e401.response = { status: 401, data: {} } as any
      expect(getErrorCode(e401)).toBe('NOTAUTHENTICATED')

      const e500 = new AxiosError()
      e500.response = { status: 500, data: {} } as any
      expect(getErrorCode(e500)).toBe('INTERNAL_SERVER_ERROR')
    })

    it('retorna undefined para erros não Axios', () => {
      expect(getErrorCode(new Error('normal error'))).toBeUndefined()
    })
  })

  describe('getErrorDetails', () => {
    it('extrai details quando presentes no envelope', () => {
      const error = new AxiosError()
      error.response = {
        data: { error: { details: { cpf: ['CPF inválido'] } } },
      } as any

      expect(getErrorDetails(error)).toEqual({ cpf: ['CPF inválido'] })
    })

    it('retorna null quando ausente ou erro não Axios', () => {
      expect(getErrorDetails(new Error())).toBeNull()
    })
  })

  describe('getErrorMessage', () => {
    it('extrai message do error envelope', () => {
      const error = new AxiosError()
      error.response = { data: { error: { message: 'Mensagem envelope' } } } as any
      expect(getErrorMessage(error)).toBe('Mensagem envelope')
    })

    it('extrai data.message ou data.detail se envelope ausente', () => {
      const errorMsg = new AxiosError()
      errorMsg.response = { data: { message: 'Mensagem direta' } } as any
      expect(getErrorMessage(errorMsg)).toBe('Mensagem direta')

      const errorDetail = new AxiosError()
      errorDetail.response = { data: { detail: 'Detalhe direto' } } as any
      expect(getErrorMessage(errorDetail)).toBe('Detalhe direto')
    })

    it('retorna mensagens amigáveis baseadas no status HTTP quando sem body específico', () => {
      const err404 = new AxiosError()
      err404.response = { status: 404, data: {} } as any
      expect(getErrorMessage(err404)).toBe('Recurso não encontrado')

      const err403 = new AxiosError()
      err403.response = { status: 403, data: {} } as any
      expect(getErrorMessage(err403)).toBe('Você não tem permissão para acessar isto')

      const err401 = new AxiosError()
      err401.response = { status: 401, data: {} } as any
      expect(getErrorMessage(err401)).toBe('Sessão expirada. Por favor, faça login novamente')

      const err500 = new AxiosError()
      err500.response = { status: 500, data: {} } as any
      expect(getErrorMessage(err500)).toBe('Erro no servidor. Tente novamente mais tarde')
    })

    it('retorna error.message do AxiosError se nenhum detalhe no corpo ou status específico', () => {
      const errOther = new AxiosError('Falha genérica Axios')
      errOther.response = { status: 418, data: {} } as any
      expect(getErrorMessage(errOther)).toBe('Falha genérica Axios')
    })

    it('trata Error padrão e valores desconhecidos', () => {
      expect(getErrorMessage(new Error('Erro padrão'))).toBe('Erro padrão')
      expect(getErrorMessage('string pura')).toBe('Erro desconhecido')
    })
  })

  describe('getValidationErrors', () => {
    it('retorna envelope.details se presente', () => {
      const error = new AxiosError()
      error.response = {
        data: { error: { details: { name: ['Obrigatório'] } } },
      } as any

      expect(getValidationErrors(error)).toEqual({ name: ['Obrigatório'] })
    })

    it('retorna data.errors se presente', () => {
      const error = new AxiosError()
      error.response = {
        data: { errors: { email: ['Email inválido'] } },
      } as any

      expect(getValidationErrors(error)).toEqual({ email: ['Email inválido'] })
    })

    it('converte campos avulsos de data em mapa de erros', () => {
      const error = new AxiosError()
      error.response = {
        data: { fieldA: ['Erro 1', 'Erro 2'], fieldB: 'Erro único' },
      } as any

      expect(getValidationErrors(error)).toEqual({
        fieldA: ['Erro 1', 'Erro 2'],
        fieldB: ['Erro único'],
      })
    })

    it('retorna objeto vazio para erros não Axios', () => {
      expect(getValidationErrors(new Error())).toEqual({})
    })
  })

  describe('createAbortWithTimeout', () => {
    it('cria uma instância de AbortController', () => {
      const controller = createAbortWithTimeout(5000)
      expect(controller).toBeInstanceOf(AbortController)
      expect(controller.signal.aborted).toBe(false)
    })
  })

  describe('apiWithRetry', () => {
    it('resolve na primeira tentativa com sucesso', async () => {
      const mockFn = vi.fn().mockResolvedValue('resultado ok')
      const result = await apiWithRetry(mockFn, 3, 10)

      expect(result).toBe('resultado ok')
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('faz retry após falha e obtém sucesso', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Falha 1'))
        .mockResolvedValueOnce('sucesso na 2')

      const result = await apiWithRetry(mockFn, 3, 5)
      expect(result).toBe('sucesso na 2')
      expect(mockFn).toHaveBeenCalledTimes(2)
    })

    it('lança exceção após esgotar tentativas', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Erro persistente'))

      await expect(apiWithRetry(mockFn, 2, 5)).rejects.toThrow('Erro persistente')
      expect(mockFn).toHaveBeenCalledTimes(2)
    })
  })
})
