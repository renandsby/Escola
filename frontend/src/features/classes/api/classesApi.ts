import { apiClient } from '@/services/api'
import { apiGet } from '@/utils/api-helpers'
import type { PaginatedResponse, SchoolClass } from '@/types/api'
import type { ClassFormData, ClassroomFormData } from '../schemas/classSchema'

export function fetchClasses(params?: Record<string, unknown>) {
  return apiGet<PaginatedResponse<SchoolClass>>('classes/', params)
}

export function fetchClass(id: string) {
  return apiGet<SchoolClass>(`classes/${id}/`)
}

function normalizeClass(data: ClassFormData) {
  return {
    ...data,
    classroom: data.classroom || null,
    room_number: data.room_number || '',
  }
}

export async function createClass(data: ClassFormData) {
  const res = await apiClient.post('/classes/', normalizeClass(data))
  return res.data as SchoolClass
}

export async function updateClass(id: string, data: ClassFormData) {
  const res = await apiClient.patch(`/classes/${id}/`, normalizeClass(data))
  return res.data as SchoolClass
}

export interface Classroom {
  id: string
  school: string
  school_name?: string
  number: string
  capacity: number
  floor: number
  building?: string
  is_active: boolean
}

export function fetchClassrooms(params?: Record<string, unknown>) {
  return apiGet<PaginatedResponse<Classroom>>('classrooms/', params)
}

export async function createClassroom(data: ClassroomFormData) {
  const res = await apiClient.post('/classrooms/', { ...data, building: data.building || '' })
  return res.data as Classroom
}

export async function updateClassroom(id: string, data: ClassroomFormData) {
  const res = await apiClient.patch(`/classrooms/${id}/`, { ...data, building: data.building || '' })
  return res.data as Classroom
}
