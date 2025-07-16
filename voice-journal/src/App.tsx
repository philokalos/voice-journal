import { QueryProvider } from './providers/QueryProvider'
import { AuthGuard } from './components/AuthGuard'
import { Dashboard } from './pages/Dashboard'

function App() {
  return (
    <QueryProvider>
      <AuthGuard>
        <Dashboard />
      </AuthGuard>
    </QueryProvider>
  )
}

export default App
