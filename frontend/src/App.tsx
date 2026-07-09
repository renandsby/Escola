import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import Layout from '@/layouts/Layout'
import LoginPage from '@/pages/auth/LoginPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import TeacherDashboard from '@/pages/dashboard/TeacherDashboard'
import SchoolsPage from '@/pages/schools/SchoolsPage'
import SchoolFormPage from '@/pages/schools/SchoolFormPage'
import StudentsPage from '@/pages/students/StudentsPage'
import StudentDetailPage from '@/pages/students/StudentDetailPage'
import StudentFormPage from '@/pages/students/StudentFormPage'
import SubjectsPage from '@/pages/subjects/SubjectsPage'
import SubjectFormPage from '@/pages/subjects/SubjectFormPage'
import MessagesPage from '@/pages/messages/MessagesPage'
import MessageFormPage from '@/pages/messages/MessageFormPage'
import ClassesPage from '@/pages/classes/ClassesPage'
import GradesPage from '@/pages/grades/GradesPage'
import AttendancePage from '@/pages/attendance/AttendancePage'
import BoletimPage from '@/pages/reports/BoletimPage'
import DocumentsPage from '@/pages/documents/DocumentsPage'
import DocumentFormPage from '@/pages/documents/DocumentFormPage'
import { useEffect } from 'react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  const { isAuthenticated, token, setToken } = useAuthStore()

  useEffect(() => {
    const storedToken = localStorage.getItem('access_token')
    if (storedToken && !token) {
      setToken(storedToken)
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
          />

          <Route element={isAuthenticated ? <Layout /> : <Navigate to="/login" replace />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/teacher-dashboard" element={<TeacherDashboard />} />

            {/* Schools Routes */}
            <Route path="/schools" element={<SchoolsPage />} />
            <Route path="/schools/create" element={<SchoolFormPage />} />
            <Route path="/schools/:id/edit" element={<SchoolFormPage />} />

            {/* Students Routes */}
            <Route path="/students" element={<StudentsPage />} />
            <Route path="/students/create" element={<StudentFormPage />} />
            <Route path="/students/:id/edit" element={<StudentFormPage />} />
            <Route path="/students/:id" element={<StudentDetailPage />} />

            {/* Subjects Routes */}
            <Route path="/subjects" element={<SubjectsPage />} />
            <Route path="/subjects/create" element={<SubjectFormPage />} />
            <Route path="/subjects/:id/edit" element={<SubjectFormPage />} />

            {/* Messages Routes */}
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/messages/create" element={<MessageFormPage />} />
            <Route path="/messages/:id" element={<MessageFormPage />} />

            {/* Classes Routes */}
            <Route path="/classes" element={<ClassesPage />} />

            {/* Grades Routes */}
            <Route path="/grades" element={<GradesPage />} />

            {/* Attendance Routes */}
            <Route path="/attendance" element={<AttendancePage />} />

            {/* Documents Routes */}
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/documents/create" element={<DocumentFormPage />} />
            <Route path="/documents/:id" element={<DocumentFormPage />} />

            {/* Reports Routes */}
            <Route path="/boletins" element={<BoletimPage />} />

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>

          <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  )
}

export default App
