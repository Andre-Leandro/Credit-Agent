import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'
import { RequestProvider } from './contexts/RequestContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RequestProvider>
        <App />
      </RequestProvider>
    </AuthProvider>
  </StrictMode>,
)
