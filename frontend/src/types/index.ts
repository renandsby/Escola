/**
 * Tipos e interfaces da aplicação
 */

export * from './api'

// ============ COMPONENT PROPS ============

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  children: React.ReactNode
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
}

export interface FormInputProps {
  label: string
  name: string
  type?: 'text' | 'email' | 'password' | 'number' | 'date'
  placeholder?: string
  error?: string
  required?: boolean
  disabled?: boolean
  register?: any
  value?: string | number
  onChange?: (value: string) => void
}

export interface SelectProps {
  label: string
  name: string
  options: Array<{ value: string; label: string }>
  placeholder?: string
  error?: string
  required?: boolean
  disabled?: boolean
  register?: any
  value?: string
  onChange?: (value: string) => void
}

export interface ModalProps {
  title: string
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export interface ToastProps {
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration?: number
  onClose?: () => void
}

// ============ FORM TYPES ============

export interface LoginFormData {
  username: string
  password: string
}

export interface RegisterFormData {
  username: string
  email: string
  password: string
  password_confirm: string
  first_name?: string
  last_name?: string
  role?: string
  school?: string
}

export interface ChangePasswordFormData {
  current_password: string
  new_password: string
  new_password_confirm: string
}

// ============ TABLE TYPES ============

export interface TableColumn<T> {
  key: keyof T
  header: string
  sortable?: boolean
  render?: (value: any, row: T) => React.ReactNode
  width?: string
}

export interface TableProps<T> {
  data: T[]
  columns: TableColumn<T>[]
  loading?: boolean
  pagination?: {
    page: number
    total: number
    pageSize: number
    onPageChange: (page: number) => void
  }
  onRowClick?: (row: T) => void
  selectable?: boolean
  onSelect?: (rows: T[]) => void
}

// ============ FILTER TYPES ============

export interface FilterOption {
  label: string
  value: string | number
}

export interface FilterConfig {
  field: string
  operator: 'equals' | 'contains' | 'starts_with' | 'gte' | 'lte' | 'between'
  value: string | number | [number, number]
}

// ============ SORT TYPES ============

export interface SortConfig {
  field: string
  order: 'asc' | 'desc'
}

// ============ ASYNC STATE ============

export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error }

// ============ UTILS ============

export interface RequestParams {
  page?: number
  page_size?: number
  search?: string
  ordering?: string
  [key: string]: any
}

export interface Route {
  path: string
  label: string
  icon?: React.ReactNode
  component?: React.ComponentType
  children?: Route[]
  requiresAuth?: boolean
  requiredRoles?: string[]
}
