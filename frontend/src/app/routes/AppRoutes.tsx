import { Routes, Route, Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { UserRole } from '@/types/api'
import { useAuthStore } from '@/stores/authStore'
import Layout from '@/layouts/Layout'
import { ProtectedRoute } from './ProtectedRoute'

import LoginPage from '@/features/authentication/pages/LoginPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import TeacherDashboard from '@/pages/dashboard/TeacherDashboard'
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
import EnrollmentsListPage from '@/features/students/pages/EnrollmentsListPage'
import EnrollmentFormPage from '@/features/students/pages/EnrollmentFormPage'
import GradesPage from '@/features/class-diary/pages/GradesPage'
import AttendancePage from '@/features/class-diary/pages/AttendancePage'
import BoletimPage from '@/features/reports/pages/BoletimPage'
import DocumentsPage from '@/pages/documents/DocumentsPage'
import DocumentFormPage from '@/pages/documents/DocumentFormPage'
import SettingsPage from '@/pages/settings/SettingsPage'
import DepartmentPage from '@/features/governance/pages/DepartmentPage'
import MatricesPage from '@/features/governance/pages/MatricesPage'
import TransfersPage from '@/features/students/pages/TransfersPage'
import AllocationsPage from '@/features/classes/pages/AllocationsPage'
import TeachersListPage from '@/features/classes/pages/TeachersListPage'
import TeacherFormPage from '@/features/classes/pages/TeacherFormPage'
import DescriptiveEvaluationsPage from '@/features/class-diary/pages/DescriptiveEvaluationsPage'

const SME_ROLES: UserRole[] = ['sme_admin', 'sme_supervisor']
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
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">Carregando…</div>
    )
  }
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/teacher-dashboard" element={guard(['teacher'], <TeacherDashboard />)} />

          {/* Governança / SME */}
          <Route path="/sme" element={guard(SME_ROLES, <DepartmentPage />)} />
          <Route path="/sme/matrices" element={guard(SME_ROLES, <MatricesPage />)} />
          <Route path="/sme/transfers" element={guard(SME_ROLES, <TransfersPage />)} />

          {/* Docência */}
          <Route path="/teachers" element={guard(['sme_admin'], <TeachersListPage />)} />
          <Route path="/teachers/create" element={guard(['sme_admin'], <TeacherFormPage />)} />
          <Route path="/teachers/:id/edit" element={guard(['sme_admin'], <TeacherFormPage />)} />
          <Route
            path="/teachers/allocations"
            element={guard(['sme_admin', 'sme_supervisor'], <AllocationsPage />)}
          />
          <Route
            path="/evaluations"
            element={guard(
              [...SME_ROLES, 'school_director', 'teacher'],
              <DescriptiveEvaluationsPage />
            )}
          />

          {/* Escolas */}
          <Route
            path="/schools"
            element={guard([...SME_ROLES, 'school_director'], <SchoolsListPage />)}
          />
          <Route path="/schools/create" element={guard(['sme_admin'], <SchoolFormPage />)} />
          <Route
            path="/schools/:id/edit"
            element={guard([...SME_ROLES, 'school_director'], <SchoolFormPage />)}
          />

          {/* Alunos */}
          <Route
            path="/students"
            element={guard([...SME_ROLES, ...SCHOOL_MGMT], <StudentsListPage />)}
          />
          <Route
            path="/students/create"
            element={guard([...SME_ROLES, ...SCHOOL_MGMT], <StudentFormPage />)}
          />
          <Route
            path="/students/:id/edit"
            element={guard([...SME_ROLES, ...SCHOOL_MGMT], <StudentFormPage />)}
          />
          <Route
            path="/students/:id"
            element={guard(
              [...SME_ROLES, ...SCHOOL_MGMT, 'teacher', 'student_guardian'],
              <StudentDetailPage />
            )}
          />

          {/* Currículo */}
          <Route
            path="/subjects"
            element={guard([...SME_ROLES, 'school_director'], <SubjectsListPage />)}
          />
          <Route path="/subjects/create" element={guard(SME_ROLES, <SubjectFormPage />)} />
          <Route path="/subjects/:id/edit" element={guard(SME_ROLES, <SubjectFormPage />)} />

          {/* Mensagens */}
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/messages/create" element={<MessageFormPage />} />
          <Route path="/messages/:id" element={<MessageFormPage />} />

          {/* Turmas */}
          <Route
            path="/classes"
            element={guard([...SME_ROLES, ...SCHOOL_MGMT, 'teacher'], <ClassesListPage />)}
          />

          {/* Matrículas */}
          <Route
            path="/enrollments"
            element={guard([...SME_ROLES, ...SCHOOL_MGMT], <EnrollmentsListPage />)}
          />
          <Route
            path="/enrollments/create"
            element={guard([...SME_ROLES, ...SCHOOL_MGMT], <EnrollmentFormPage />)}
          />

          {/* Diário de classe */}
          <Route
            path="/grades"
            element={guard(
              [...SME_ROLES, 'school_director', 'teacher', 'student_guardian'],
              <GradesPage />
            )}
          />
          <Route
            path="/attendance"
            element={guard([...SME_ROLES, 'school_director', 'teacher'], <AttendancePage />)}
          />

          {/* Documentos */}
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/documents/create" element={<DocumentFormPage />} />
          <Route path="/documents/:id" element={<DocumentFormPage />} />

          {/* Relatórios */}
          <Route
            path="/boletins"
            element={guard([...SME_ROLES, 'school_director', 'teacher'], <BoletimPage />)}
          />

          {/* Configurações */}
          <Route path="/settings" element={guard(ALL_ROLES, <SettingsPage />)} />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
