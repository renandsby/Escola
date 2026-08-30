export type ReportScope = 'network' | 'school' | 'class'
export type ReportFormat = 'PDF' | 'XLSX' | 'CSV' | 'TXT'
export type ReportExecutionStatus = 'QUEUED' | 'PROCESSING' | 'DONE' | 'ERROR'

export interface ReportDef {
  key: string
  name: string
  description: string
  scopes: ReportScope[]
  formats: ReportFormat[]
  contains_personal_data: boolean
  parameters: string[]
  tone: 'neutral' | 'brand' | 'ok' | 'warn' | 'danger' | 'qual'
  estimate_seconds: number
}

export interface ReportExecution {
  id: string
  report_key: string
  requested_by_name: string
  scope_level: ReportScope
  scope_title: string
  output_format: ReportFormat
  contains_personal_data: boolean
  status: ReportExecutionStatus
  row_count: number | null
  file_size: number | null
  error_code: string
  error_details: { message?: string; failures?: unknown[] } | null
  created_at: string
  started_at: string | null
  finished_at: string | null
  expires_at: string
  is_expired: boolean
  download_url: string | null
}

export interface CreateExecutionInput {
  report_key: string
  parameters: {
    output_format: ReportFormat
    coverage?: 'all' | 'late_only' | 'selected'
    academic_year?: number | string
    term?: number | string
    school_id?: string
    class_group_id?: string
    include_charts?: boolean
    include_school_comparison?: boolean
    include_student_list?: boolean
    school_ids?: string[]
  }
}
