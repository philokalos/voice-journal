import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryProvider } from './providers/QueryProvider'
import { AuthGuard } from './components/AuthGuard'
import { Dashboard } from './pages/Dashboard'
import { Settings } from './pages/Settings'
import { GoogleSheetsCallback } from './pages/GoogleSheetsCallback'

function App() {
  return (
    <QueryProvider>
      <Router>
        <Routes>
          <Route path="/auth/google-sheets/callback" element={<GoogleSheetsCallback />} />
          <Route path="/settings" element={
            <AuthGuard>
              <Settings />
            </AuthGuard>
          } />
          <Route path="/" element={
            <AuthGuard>
              <Dashboard />
            </AuthGuard>
          } />
        </Routes>
      </Router>
    </QueryProvider>
  )
}

export default App
