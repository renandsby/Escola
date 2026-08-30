import { Routes, Route, Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { UserRole } from '@/types/api'
import { useAuthStore } from '@/stores/authStore'
import { AppShell } from '@/components/layout/AppShell'
import { ProtectedRoute } from './ProtectedRoute'
import { ROUTES, LEGACY_REDIRECTS } from './paths'
import { PlaceholderPage } from '@/components/feedback/PlaceholderPage'

import LoginPage from '@/features/authentication/pages/LoginPage'
import ForgotPasswordPage from '@/features/authentication/pages/ForgotPasswordPage'
import ResetPasswordPage from '@/features/authentication/pages/ResetPasswordPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import SchoolsListPage from '@/features/schools/pages/SchoolsListPage'
import SchoolFormPage from '@/features/schools/pages/SchoolFormPage'
import StudentsListPage from '@/features/students/pages/StudentsListPage'
import StudentDetailPage from '@/features/students/pages/StudentDetailPage'
import StudentFormPage from '@/features/students/pages/StudentFormPage'
import SubjectsListPage from '@/features/curriculum/pages/SubjectsListPage'
import SubjectFormPage from '@/features/curriculum/pages/SubjectFormPage'
import MessagesPage from '@/pages/messages/MessagesPage'
import MessageFormPage from '@/pages/messages/MessageFormPage'
import ClassesListPage from '@/features/classes/pages/ClassesListPage'
import ClassFormPage from '@/features/classes/pages/ClassFormPage'
import ClassroomsPage from '@/features/classes/pages/ClassroomsPage'
import EnrollmentsListPage from '@/features/students/pages/EnrollmentsListPage'
import EnrollmentFormPage from '@/features/students/pages/EnrollmentFormPage'
import GradesPage from '@/features/class-diary/pages/GradesPage'
import AttendancePage from '@/features/class-diary/pages/AttendancePage'
import BoletimPage from '@/features/reports/pages/BoletimPage'
import DocumentsPage from '@/pages/documents/DocumentsPage'
import DocumentFormPage from '@/pages/documents/DocumentFormPage'
import SettingsPage from '@/pages/settings/SettingsPage'
import MatricesPage from '@/features/governance/pages/MatricesPage'
import DepartmentPage from '@/features/governance/pages/DepartmentPage'
import TransfersPage from '@/features/students/pages/TransfersPage'
import AllocationsPage from '@/features/classes/pages/AllocationsPage'
import TeachersListPage from '@/features/classes/pages/TeachersListPage'
import TeacherFormPage from '@/features/classes/pages/TeacherFormPage'
import DescriptiveEvaluationsPage from '@/features/class-diary/pages/DescriptiveEvaluationsPage'

const SME: UserRole[] = ['sme_admin', 'sme_supervisor']
const SCHOOL_MGMT: UserRole[] = ['school_director', 'school_secretary']
const ALL_ROLES: UserRole[] = [
  'sme_admin',
  'sme_supervisor',
  'school_director',
  'school_secretary',
  'teacher',
  'student_guardian',
]

function guard(roles: UserRole[], element: ReactNode) {
  return <ProtectedRoute allowedRoles={roles}>{element}</ProtectedRoute>
}

function LoginRoute() {
  const { isAuthenticated, isHydrated } = useAuthStore()
  if (!isHydrated) {
    return <div className="flex h-screen items-center justify-center text-ink-400">Carregando…</div>
  }
  return isAuthenticated ? <Navigate to={ROUTES.home} replace /> : <LoginPage />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path={ROUTES.forgotPassword} element={<ForgotPasswordPage />} />
      <Route path="/redefinir-senha/:token" element={<ResetPasswordPage />} />

      {/* Redirects das rotas antigas (inglês) */}
      {Object.entries(LEGACY_REDIRECTS).map(([from, to]) => (
        <Route key={from} path={from} element={<Navigate to={to} replace />} />
      ))}

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path={ROUTES.home} element={<DashboardPage />} />

          {/* REDE */}
          <Route path={ROUTES.schools} element={guard([...SME, 'school_director'], <SchoolsListPage />)} />
          <Route path={ROUTES.schoolNew} element={guard(['sme_admin'], <SchoolFormPage />)} />
          <Route path="/escolas/:id/editar" element={guard([...SME, 'school_director'], <SchoolFormPage />)} />
          <Route path={ROUTES.curriculum} element={guard([...SME, 'school_director'], <SubjectsListPage />)} />
          <Route path={ROUTES.curriculumMatrices} element={guard(SME, <MatricesPage />)} />
          <Route path={ROUTES.subjectNew} element={guard(SME, <SubjectFormPage />)} />
          <Route path="/curriculo/disciplinas/:id/editar" element={guard(SME, <SubjectFormPage />)} />
          <Route
            path={ROUTES.academicYear}
            element={guard(SME, <DepartmentPage />)}
          />

          {/* PESSOAS */}
          <Route path={ROUTES.students} element={guard([...SME, ...SCHOOL_MGMT], <StudentsListPage />)} />
          <Route path={ROUTES.studentNew} element={guard([...SME, ...SCHOOL_MGMT], <StudentFormPage />)} />
          <Route path="/alunos/:id/editar" element={guard([...SME, ...SCHOOL_MGMT], <StudentFormPage />)} />
          <Route
            path="/alunos/:id"
            element={guard([...SME, ...SCHOOL_MGMT, 'teacher', 'student_guardian'], <StudentDetailPage />)}
          />
          <Route
            path={ROUTES.guardians}
            element={guard(
              [...SME, ...SCHOOL_MGMT],
              <PlaceholderPage title="Responsáveis" note="O cadastro de responsáveis será feito por aqui. Hoje disponível via API (/api/v1/guardians/)." />
            )}
          />
          <Route path={ROUTES.teachers} element={guard(['sme_admin'], <TeachersListPage />)} />
          <Route path={ROUTES.teacherNew} element={guard(['sme_admin'], <TeacherFormPage />)} />
          <Route path="/professores/:id/editar" element={guard(['sme_admin'], <TeacherFormPage />)} />
          <Route path={ROUTES.allocations} element={guard(SME, <AllocationsPage />)} />

          {/* VIDA ESCOLAR */}
          <Route path={ROUTES.classes} element={guard([...SME, ...SCHOOL_MGMT, 'teacher'], <ClassesListPage />)} />
          <Route path={ROUTES.classNew} element={guard([...SME, ...SCHOOL_MGMT], <ClassFormPage />)} />
          <Route path="/turmas/:id/editar" element={guard([...SME, ...SCHOOL_MGMT], <ClassFormPage />)} />
          <Route path={ROUTES.classrooms} element={guard([...SME, ...SCHOOL_MGMT], <ClassroomsPage />)} />
          <Route path={ROUTES.enrollments} element={guard([...SME, ...SCHOOL_MGMT], <EnrollmentsListPage />)} />
          <Route path={ROUTES.enrollmentNew} element={guard([...SME, ...SCHOOL_MGMT], <EnrollmentFormPage />)} />
          <Route path={ROUTES.transfers} element={guard([...SME, ...SCHOOL_MGMT], <TransfersPage />)} />

          {/* DIÁRIO DE CLASSE */}
          <Route
            path={ROUTES.diaryGrades}
            element={guard([...SME, 'school_director', 'teacher', 'student_guardian'], <GradesPage />)}
          />
          <Route
            path={ROUTES.diaryAttendance}
            element={guard([...SME, 'school_director', 'teacher'], <AttendancePage />)}
          />
          <Route
            path={ROUTES.diaryEvaluations}
            element={guard([...SME, 'school_director', 'teacher'], <DescriptiveEvaluationsPage />)}
          />
          <Route
            path={ROUTES.diaryContent}
            element={guard(
              ['teacher', ...SCHOOL_MGMT],
              <PlaceholderPage title="Conteúdo ministrado" note="Registro do diário de classe (conteúdo, tarefa, observações). Hoje via API (/api/v1/diary/)." />
            )}
          />

          {/* DOCUMENTOS */}
          <Route path={ROUTES.boletins} element={guard([...SME, 'school_director', 'teacher', 'student_guardian'], <BoletimPage />)} />
          <Route
            path={ROUTES.exports}
            element={guard(
              SME,
              <PlaceholderPage title="Educacenso e exportações" note="Exportações Educacenso / Excel / CSV. Hoje via API (/api/v1/reports/*)." />
            )}
          />
          <Route path={ROUTES.documents} element={<DocumentsPage />} />
          <Route path="/documentos/arquivos/:id" element={<DocumentFormPage />} />

          {/* COMUNICAÇÃO / CONTA */}
          <Route path={ROUTES.messages} element={<MessagesPage />} />
          <Route path={ROUTES.messageNew} element={<MessageFormPage />} />
          <Route path="/mensagens/:id" element={<MessageFormPage />} />
          <Route path={ROUTES.settings} element={guard(ALL_ROLES, <SettingsPage />)} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
    </Routes>
  )
}
