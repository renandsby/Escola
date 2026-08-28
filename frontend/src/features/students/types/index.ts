/**
 * Tipos do domínio de alunos, matrículas e transferências.
 *
 * Reexporta os tipos globais já definidos em `@/types/api` — não duplica
 * nenhuma definição, apenas cria um ponto de import estável e coeso para
 * a feature `students`.
 */
export type {
  Student,
  CreateStudentRequest,
  EducationDepartment,
  Enrollment,
  EnrollmentStatus,
  SchoolClass,
  School,
  AcademicYear,
  TransferRequest,
  TransferStatus,
  CreateTransferRequestPayload,
  PaginatedResponse,
  Grade,
  Attendance,
} from '@/types/api'

export {
  ENROLLMENT_STATUS_LABELS,
  TRANSFER_STATUS_LABELS,
  ATTENDANCE_STATUS_LABELS,
} from '@/types/api'
