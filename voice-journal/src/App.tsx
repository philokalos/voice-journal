import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryProvider } from './providers/QueryProvider'
import { AuthGuard } from './components/AuthGuard'
import { Dashboard } from './pages/Dashboard'
import { Settings } from './pages/Settings'
import { GoogleCallback } from './pages/oauth/GoogleCallback'
import { NotionCallback } from './pages/oauth/NotionCallback'

function App() {
  return (
    <QueryProvider>
      <Router>
        <Routes>
          {/* OAuth Callback Routes - No AuthGuard needed */}
          <Route path="/oauth/google/callback" element={<GoogleCallback />} />
          <Route path="/oauth/notion/callback" element={<NotionCallback />} />
          
          {/* Protected Routes */}
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
