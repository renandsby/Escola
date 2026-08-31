import { describe, it, expect, vi, beforeEach } from 'vitest'

const post = vi.fn()
const get = vi.fn()

vi.mock('@/services/api', () => ({
  apiClient: { post: (...a: unknown[]) => post(...a) },
}))
vi.mock('@/utils/api-helpers', () => ({ apiGet: (...a: unknown[]) => get(...a) }))

import {
  findStudentByCpf,
  requestStudentLink,
  redeemLinkCode,
  reviewLinkRequest,
  fetchLinkRequests,
  generateLinkCode,
  fetchLinkCodes,
} from './guardiansApi'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('guardiansApi — vinculação V2', () => {
  it('findStudentByCpf consulta students/find-by-cpf com o cpf', () => {
    get.mockResolvedValueOnce({ found: true })
    findStudentByCpf('529.982.247-25')
    expect(get).toHaveBeenCalledWith('students/find-by-cpf/', { cpf: '529.982.247-25' })
  })

  it('requestStudentLink faz POST no endpoint de solicitação e devolve data', async () => {
    post.mockResolvedValueOnce({ data: { id: 'l1', status: 'PENDING' } })
    const out = await requestStudentLink({
      student_cpf: '1',
      birth_date: '2016-04-10',
      mother_name: 'Ana',
      kinship_type: 'MOTHER',
    })
    expect(post).toHaveBeenCalledWith(
      'guardians/link-requests/request/',
      expect.objectContaining({ mother_name: 'Ana' })
    )
    expect(out).toEqual({ id: 'l1', status: 'PENDING' })
  })

  it('redeemLinkCode faz POST em guardians/link-by-code/', async () => {
    post.mockResolvedValueOnce({ data: { id: 'l2', status: 'CONFIRMED' } })
    await redeemLinkCode({ student_cpf: '1', code: 'ABCD-1234' })
    expect(post).toHaveBeenCalledWith('guardians/link-by-code/', {
      student_cpf: '1',
      code: 'ABCD-1234',
    })
  })

  it('reviewLinkRequest posta a decisão no id certo', async () => {
    post.mockResolvedValueOnce({ data: {} })
    await reviewLinkRequest('abc', { decision: 'reject', note: 'sem prova' })
    expect(post).toHaveBeenCalledWith('guardians/link-requests/abc/review/', {
      decision: 'reject',
      note: 'sem prova',
    })
  })

  it('fetchLinkRequests repassa o filtro de status', () => {
    get.mockResolvedValueOnce({ results: [] })
    fetchLinkRequests({ status: 'PENDING' })
    expect(get).toHaveBeenCalledWith(
      'guardians/link-requests/',
      expect.objectContaining({ status: 'PENDING' })
    )
  })

  it('generateLinkCode e fetchLinkCodes usam o id do aluno', async () => {
    post.mockResolvedValueOnce({ data: { code: 'AAAA-1111', expires_at: 'x' } })
    await generateLinkCode('stu-1', { kinship_hint: 'FATHER' })
    expect(post).toHaveBeenCalledWith('students/stu-1/link-codes/', {
      kinship_hint: 'FATHER',
    })

    get.mockResolvedValueOnce([])
    fetchLinkCodes('stu-1')
    expect(get).toHaveBeenCalledWith('students/stu-1/link-codes/')
  })
})
