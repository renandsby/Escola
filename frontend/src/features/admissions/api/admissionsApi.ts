import { apiClient } from '@/services/api'
import { apiGet } from '@/utils/api-helpers'
import type {
  AdmissionCycle,
  EnrollmentRequest,
  PaginatedResponse,
  PriorityEvidence,
  RenewalRequest,
} from '@/types/api'

// --- Ciclos ---------------------------------------------------------------

export function fetchCycles() {
  return apiGet<PaginatedResponse<AdmissionCycle>>('admissions/cycles/', { page_size: 100 })
}

export async function createCycle(payload: {
  target_academic_year: string
  name: string
  renewal_opens_at: string
  renewal_closes_at: string
  new_request_opens_at: string
  new_request_closes_at: string
}) {
  const { data } = await apiClient.post<AdmissionCycle>('/admissions/cycles/', payload)
  return data
}

export async function advanceCycle(id: string) {
  const { data } = await apiClient.post<AdmissionCycle>(
    `/admissions/cycles/${id}/advance-status/`,
    {},
  )
  return data
}

export async function openRenewals(id: string) {
  const { data } = await apiClient.post<{ created: number; notified: number }>(
    `/admissions/cycles/${id}/open-renewals/`,
    {},
  )
  return data
}

// --- Rematrícula --------------------------------------------------------

export function fetchRenewals(params?: Record<string, unknown>) {
  return apiGet<PaginatedResponse<RenewalRequest>>('admissions/renewals/', {
    page_size: 200,
    ...params,
  })
}

export function fetchRenewal(id: string) {
  return apiGet<RenewalRequest>(`admissions/renewals/${id}/`)
}

export async function submitRenewal(
  id: string,
  payload: {
    outcome: RenewalRequest['outcome']
    contact_phone?: string
    residential_address?: string
    has_new_special_needs?: boolean
    special_needs_note?: string
  },
) {
  const { data } = await apiClient.post<RenewalRequest>(
    `/admissions/renewals/${id}/submit/`,
    payload,
  )
  return data
}

export async function materializeRenewal(id: string, schoolClass: string) {
  const { data } = await apiClient.post<{ enrollment_id: string }>(
    `/admissions/renewals/${id}/materialize/`,
    { school_class: schoolClass },
  )
  return data
}

// --- Solicitação de matrícula -----------------------------------------

export function fetchEnrollmentRequests(params?: Record<string, unknown>) {
  return apiGet<PaginatedResponse<EnrollmentRequest>>('admissions/enrollment-requests/', {
    page_size: 200,
    ...params,
  })
}

export function fetchEnrollmentRequest(id: string) {
  return apiGet<EnrollmentRequest>(`admissions/enrollment-requests/${id}/`)
}

export async function createEnrollmentRequest(payload: Record<string, unknown>) {
  const { data } = await apiClient.post<EnrollmentRequest>(
    '/admissions/enrollment-requests/',
    payload,
  )
  return data
}

export async function setPreferences(id: string, schools: string[]) {
  const { data } = await apiClient.post<EnrollmentRequest>(
    `/admissions/enrollment-requests/${id}/preferences/`,
    { schools },
  )
  return data
}

export async function attachEvidence(
  id: string,
  payload: { kind: string; file: File; declared_school?: string },
) {
  const form = new FormData()
  form.append('kind', payload.kind)
  form.append('file', payload.file)
  if (payload.declared_school) {
    form.append('declared_school', payload.declared_school)
  }
  const { data } = await apiClient.post<PriorityEvidence>(
    `/admissions/enrollment-requests/${id}/evidence/`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return data
}

export async function submitEnrollmentRequest(id: string) {
  const { data } = await apiClient.post<EnrollmentRequest>(
    `/admissions/enrollment-requests/${id}/submit/`,
    { lgpd_consent: true },
  )
  return data
}

// --- Comprovantes (fila da escola/SME) --------------------------------

export function fetchEvidenceQueue(params?: Record<string, unknown>) {
  return apiGet<PaginatedResponse<PriorityEvidence>>('admissions/evidence/', {
    page_size: 200,
    ...params,
  })
}

export async function verifyEvidence(
  id: string,
  decision: 'VERIFIED' | 'REJECTED',
  note = '',
) {
  const { data } = await apiClient.post<PriorityEvidence>(
    `/admissions/evidence/${id}/verify/`,
    { decision, note },
  )
  return data
}
