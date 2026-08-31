import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from './authStore'
import type { User } from '@/types/api'

const user = (over: Partial<User> = {}): User => ({
  id: 'u1',
  username: '52998224725',
  email: 'maria@example.com',
  first_name: 'Maria',
  last_name: 'Silva',
  cpf: '52998224725',
  role: 'student_guardian',
  school: null,
  education_department: null,
  is_active: true,
  ...over,
})

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.getState().logout()
  })

  it('login popula tokens + usuário e marca autenticado', () => {
    useAuthStore.getState().login('acc', 'ref', user())
    const s = useAuthStore.getState()
    expect(s.isAuthenticated).toBe(true)
    expect(s.accessToken).toBe('acc')
    expect(s.refreshToken).toBe('ref')
    expect(s.user?.email).toBe('maria@example.com')
  })

  it('logout limpa tudo', () => {
    useAuthStore.getState().login('acc', 'ref', user())
    useAuthStore.getState().logout()
    const s = useAuthStore.getState()
    expect(s.isAuthenticated).toBe(false)
    expect(s.accessToken).toBeNull()
    expect(s.user).toBeNull()
  })

  it('setUser troca só o usuário (ex.: e-mail verificado)', () => {
    useAuthStore.getState().login('acc', 'ref', user({ email_verified: false }))
    useAuthStore.getState().setUser(user({ email_verified: true }))
    expect(useAuthStore.getState().user?.email_verified).toBe(true)
    expect(useAuthStore.getState().accessToken).toBe('acc')
  })

  it('setTokens preserva o refresh token quando não informado', () => {
    useAuthStore.getState().login('acc', 'ref', user())
    useAuthStore.getState().setTokens('novo-acc')
    const s = useAuthStore.getState()
    expect(s.accessToken).toBe('novo-acc')
    expect(s.refreshToken).toBe('ref')
    expect(s.isAuthenticated).toBe(true)
  })
})
