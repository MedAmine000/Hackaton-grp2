import { Routes, Route, Navigate } from 'react-router-dom'
import { useMemo, useState, useCallback } from 'react'
import Layout from './components/layout/Layout'
import UploadPage from './pages/UploadPage'
import CRMPage from './pages/CRMPage'
import ConformityPage from './pages/ConformityPage'
import DocumentsPage from './pages/DocumentsPage'
import SupportPage from './pages/SupportPage'
import OpsPage from './pages/OpsPage'
import { UploadProvider } from './context/UploadContext'

export default function App() {
  const initialRole = useMemo(() => {
    const raw = (sessionStorage.getItem('docuflow_role') || '').toLowerCase()
    return raw === 'admin' ? 'admin' : 'client'
  }, [])

  const [role, setRole] = useState(initialRole)

  const handleRoleChange = useCallback((nextRole) => {
    const normalized = nextRole === 'admin' ? 'admin' : 'client'
    sessionStorage.setItem('docuflow_role', normalized)
    setRole(normalized)
  }, [])

  const canAccessOps = role === 'admin'

  return (
    <UploadProvider>
      <div className="app-layout">
        <Layout role={role} onRoleChange={handleRoleChange}>
          <Routes>
            <Route path="/" element={<UploadPage />} />
            <Route path="/crm" element={<CRMPage />} />
            <Route path="/conformity" element={<ConformityPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="/ops" element={canAccessOps ? <OpsPage /> : <Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </div>
    </UploadProvider>
  )
}
