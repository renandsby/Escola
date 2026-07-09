import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  username: string
  email: string
  first_name: string
  last_name: string
  role: 'admin' | 'director' | 'coordinator' | 'secretary' | 'teacher' | 'guardian' | 'student'
  school: string | null
}

export interface AuthState {
  token: string | null
  refreshToken: string | null
  user: User | null
  isAuthenticated: boolean
  setToken: (token: string) => void
  setRefreshToken: (token: string) => void
  setUser: (user: User) => void
  logout: () => void
  login: (token: string, refreshToken: string, user: User) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,

      setToken: (token) => {
        set({ token, isAuthenticated: !!token })
        localStorage.setItem('access_token', token)
      },

      setRefreshToken: (refreshToken) => {
        set({ refreshToken })
        localStorage.setItem('refresh_token', refreshToken)
      },

      setUser: (user) => {
        set({ user })
        localStorage.setItem('user', JSON.stringify(user))
      },

      login: (token, refreshToken, user) => {
        set({
          token,
          refreshToken,
          user,
          isAuthenticated: true,
        })
        localStorage.setItem('access_token', token)
        localStorage.setItem('refresh_token', refreshToken)
        localStorage.setItem('user', JSON.stringify(user))
      },

      logout: () => {
        set({
          token: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
        })
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
      },
    }),
    {
      name: 'auth-store',
    }
  )
)
