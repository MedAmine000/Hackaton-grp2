import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Upload, Users, ShieldCheck, FileText, Activity, LifeBuoy, Database, Lock, LogOut } from 'lucide-react'
import Header from './Header'
import api from '../../services/api'

const navItems = [
  { path: '/', label: 'Upload', icon: Upload, roles: ['client', 'admin'] },
  { path: '/documents', label: 'Documents', icon: FileText, roles: ['client', 'admin'] },
  { path: '/crm', label: 'CRM Fournisseurs', icon: Users, roles: ['client', 'admin'] },
  { path: '/conformity', label: 'Conformité', icon: ShieldCheck, roles: ['client', 'admin'] },
  { path: '/support', label: 'Support Client', icon: LifeBuoy, roles: ['client', 'admin'] },
  { path: '/ops', label: 'Ops & Data Lake', icon: Database, roles: ['admin'] },
]

export default function Layout({ children, role, onRoleChange }) {
  const location = useLocation()
  const visibleNavItems = navItems.filter((item) => item.roles.includes(role))

  const [showAdminModal, setShowAdminModal] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  const handleAdminLogin = async () => {
    try {
      const response = await api.post('/auth/admin-login', { password: adminPassword })
      if (response?.data?.success) {
        onRoleChange?.('admin')
        setShowAdminModal(false)
        setAdminPassword('')
        setLoginError('')
        return
      }
      setLoginError('Mot de passe incorrect')
      setAdminPassword('')
    } catch {
      setLoginError('Mot de passe incorrect')
      setAdminPassword('')
    }
  }

  const handleAdminLogout = () => {
    onRoleChange?.('client')
  }

  const pageTitles = {
    '/': 'Upload de documents',
    '/documents': 'Historique Documents',
    '/crm': 'CRM Fournisseurs',
    '/conformity': 'Dashboard Conformité',
    '/support': 'Support Client',
    '/ops': 'Ops & Data Lake',
  }

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="sidebar-logo-box">
              <FileText size={20} color="white" />
            </div>
            <span className="sidebar-brand">DocuFlow</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {visibleNavItems.map(({ path, label, icon: Icon }) => {
            return (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <Icon size={18} />
                {label}
              </NavLink>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Activity size={14} />
              <span style={{ fontSize: 12 }}>{role === 'admin' ? 'Mode Admin' : 'Mode Client'}</span>
            </div>
            {role === 'admin' ? (
              <button
                onClick={handleAdminLogout}
                title="Déconnexion admin"
                style={{
                  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 6, cursor: 'pointer', color: 'rgba(255,255,255,0.85)',
                  padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11,
                }}
              >
                <LogOut size={12} /> Déconnexion
              </button>
            ) : (
              <button
                onClick={() => setShowAdminModal(true)}
                title="Accès espace admin"
                style={{
                  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 6, cursor: 'pointer', color: 'rgba(255,255,255,0.85)',
                  padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11,
                }}
              >
                <Lock size={12} /> Admin
              </button>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
            {role === 'admin' ? 'Accès complet activé' : 'Vue client — données filtrées'}
          </div>
        </div>
      </aside>

      <div className="main-content">
        <Header title={pageTitles[location.pathname] || 'DocuFlow'} />
        <div className="page-container">
          {children}
        </div>
      </div>

      {showAdminModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(15, 25, 40, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAdminModal(false)
              setAdminPassword('')
              setLoginError('')
            }
          }}
        >
          <div style={{
            background: 'white', borderRadius: 16, padding: '32px 36px', width: 380,
            boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{
                background: '#1B2A4A', borderRadius: 10, padding: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Lock size={20} color="white" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontFamily: 'Sora, sans-serif', fontSize: '1.05rem', color: '#15324a' }}>
                  Accès Administrateur
                </h3>
                <p style={{ margin: 0, fontSize: 12, color: '#718096' }}>DocuFlow — Espace sécurisé</p>
              </div>
            </div>
            <p style={{ fontSize: 13, color: '#718096', margin: '0 0 18px 0' }}>
              Entrez le mot de passe pour activer le mode administrateur et accéder aux fonctionnalités avancées.
            </p>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => { setAdminPassword(e.target.value); setLoginError('') }}
              onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
              placeholder="Mot de passe"
              autoFocus
              style={{
                width: '100%', border: `1.5px solid ${loginError ? '#E63946' : '#E2E8F0'}`,
                borderRadius: 8, padding: '10px 14px', fontSize: 14, outline: 'none',
                marginBottom: loginError ? 8 : 18, boxSizing: 'border-box',
                fontFamily: 'Manrope, sans-serif', transition: 'border-color 0.2s',
              }}
            />
            {loginError && (
              <p style={{ color: '#E63946', fontSize: 12, marginBottom: 18, marginTop: 0 }}>
                {loginError}
              </p>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                className="btn btn-outline"
                onClick={() => { setShowAdminModal(false); setAdminPassword(''); setLoginError('') }}
              >
                Annuler
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAdminLogin}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Lock size={14} /> Se connecter
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
