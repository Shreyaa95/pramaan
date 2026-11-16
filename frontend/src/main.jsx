import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { BrandingProvider } from './context/BrandingContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <BrandingProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </BrandingProvider>
    </AuthProvider>
  </StrictMode>,
)
