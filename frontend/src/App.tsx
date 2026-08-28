import { BrowserRouter as Router } from 'react-router-dom'
import { AppProviders } from '@/app/providers/AppProviders'
import { AppRoutes } from '@/app/routes/AppRoutes'

function App() {
  return (
    <AppProviders>
      <Router>
        <AppRoutes />
      </Router>
    </AppProviders>
  )
}

export default App
