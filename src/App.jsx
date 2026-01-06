import ComplianceMVP from './ComplianceMVP'
import ErrorBoundary from './components/ErrorBoundary'
import { QueryProvider } from './providers/QueryProvider'

function App() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <ComplianceMVP />
      </QueryProvider>
    </ErrorBoundary>
  )
}

export default App

