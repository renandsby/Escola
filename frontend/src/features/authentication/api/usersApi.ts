import { apiClient } from '@/services/api'
import { apiGet } from '@/utils/api-helpers'
import type { PaginatedResponse } from '@/types/api'
import type { UserFormData } from '../schemas/userSchema'

export interface NetworkUser {
  id: string
  username: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  document?: string | null
  role: string
  school: string | null
  school_name?: string | null
  education_department: string | null
  is_active: boolean
}

export function fetchUsers(params?: Record<string, unknown>) {
  return apiGet<PaginatedResponse<NetworkUser>>('accounts/users/', params)
}

export function fetchUser(id: string) {
  return apiGet<NetworkUser>(`accounts/users/${id}/`)
}

function genProvisionalPassword() {
  return `Rede-${Math.random().toString(36).slice(2, 8)}-${Math.floor(Math.random() * 90 + 10)}`
}

export async function createUser(data: UserFormData) {
  const password = data.password || genProvisionalPassword()
  const res = await apiClient.post('/accounts/users/create_user/', {
    username: data.username,
    email: data.email,
    first_name: data.first_name,
    last_name: data.last_name,
    document: data.document || undefined,
    role: data.role,
    school: data.school || null,
    password,
    password_confirm: password,
  })
  return { user: res.data, provisionalPassword: data.password ? null : password }
}

export async function updateUser(id: string, data: Partial<UserFormData>) {
  const res = await apiClient.patch(`/accounts/users/${id}/`, {
    first_name: data.first_name,
    last_name: data.last_name,
    email: data.email,
    document: data.document || undefined,
    role: data.role,
    school: data.school || null,
  })
  return res.data as NetworkUser
}

export async function setUserActive(id: string, isActive: boolean) {
  const res = await apiClient.patch(`/accounts/users/${id}/`, { is_active: isActive })
  return res.data as NetworkUser
}
