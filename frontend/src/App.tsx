import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import Layout from '@/layouts/Layout'
import LoginPage from '@/pages/auth/LoginPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
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
            {/* Adicione outras rotas aqui */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>

          <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  )
}

export default App
