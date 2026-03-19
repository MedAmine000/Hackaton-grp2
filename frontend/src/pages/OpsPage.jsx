import { useCallback, useEffect, useMemo, useState } from 'react'
import { Database, HardDrive, ShieldCheck, Server, RefreshCw } from 'lucide-react'
import useBackendHealth from '../hooks/useBackendHealth'
import api from '../services/api'

export default function OpsPage() {
  const { backendAvailable, backendHealth } = useBackendHealth()
  const mongodbConnected = backendHealth?.mongodb === 'connected'
  const [storageHealth, setStorageHealth] = useState(null)
  const [storageStats, setStorageStats] = useState(null)
  const [storageError, setStorageError] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchStorage = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      const [healthRes, statsRes] = await Promise.all([
        api.get('/storage/health'),
        api.get('/storage/stats'),
      ])
      setStorageHealth(healthRes?.data || null)
      setStorageStats(statsRes?.data || null)
      setStorageError('')
    } catch {
      setStorageHealth(null)
      setStorageStats(null)
      setStorageError('Storage API indisponible via le backend proxy')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStorage()
    const interval = setInterval(() => fetchStorage({ silent: true }), 15000)
    return () => clearInterval(interval)
  }, [fetchStorage])

  const minioServiceOk = storageHealth?.services?.minio === 'ok'
  const hasStorageStats = Boolean(storageStats?.minio)
  const rawStats = storageStats?.minio?.['raw-zone'] || null
  const cleanStats = storageStats?.minio?.['clean-zone'] || null
  const curatedStats = storageStats?.minio?.['curated-zone'] || null

  const totalLakeObjects = useMemo(
    () => {
      if (!hasStorageStats) return null
      return Number(rawStats?.count || 0) + Number(cleanStats?.count || 0) + Number(curatedStats?.count || 0)
    },
    [hasStorageStats, rawStats, cleanStats, curatedStats]
  )

  const fmtMb = (value) => `${Number(value || 0).toFixed(2)} MB`

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Ops & Data Lake</h1>
        <button className="btn btn-outline" onClick={fetchStorage} title="Rafraîchir">
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="hero-strip">
        <h3 style={{ color: '#f3fbff', margin: 0 }}>Observabilite technique</h3>
        <p>
          Vision des services coeur, des zones Raw/Clean/Curated et des verrous de securite d'acces.
        </p>
      </div>

      {storageError && (
        <div className="card" style={{ marginBottom: 16, borderColor: '#e63946' }}>
          <strong style={{ color: '#e63946' }}>Mode degrade Data Lake</strong>
          <p style={{ margin: '6px 0 0 0', fontSize: 13, color: '#6c7c8f' }}>
            {storageError}
          </p>
        </div>
      )}

      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi-card">
          <div className="value" style={{ color: backendAvailable ? '#00C896' : '#E63946' }}>
            {backendAvailable ? 'UP' : 'DOWN'}
          </div>
          <div className="label">Backend</div>
        </div>
        <div className="kpi-card">
          <div className="value" style={{ color: mongodbConnected ? '#00C896' : '#E63946' }}>
            {mongodbConnected ? 'OK' : 'KO'}
          </div>
          <div className="label">MongoDB</div>
        </div>
        <div className="kpi-card">
          <div className="value">3</div>
          <div className="label">Zones Data Lake</div>
        </div>
        <div className="kpi-card">
          <div className="value" style={{ color: minioServiceOk ? '#00C896' : '#E63946' }}>
            {loading ? '...' : minioServiceOk ? 'OK' : 'KO'}
          </div>
          <div className="label">MinIO</div>
        </div>
        <div className="kpi-card">
          <div className="value" style={{ color: '#457B9D' }}>{loading ? '...' : totalLakeObjects ?? 'N/A'}</div>
          <div className="label">Objets Data Lake</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Database size={18} color="#15324a" />
            <strong>Raw Zone</strong>
          </div>
          <p style={{ fontSize: 13, color: '#6c7c8f' }}>Documents d'origine, conservation immutable, retention brute.</p>
          <div style={{ fontSize: 13 }}>
            Objets: {hasStorageStats ? rawStats?.count || 0 : 'N/A'} | Taille: {hasStorageStats ? fmtMb(rawStats?.total_size_mb) : 'N/A'}
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <HardDrive size={18} color="#15324a" />
            <strong>Clean Zone</strong>
          </div>
          <p style={{ fontSize: 13, color: '#6c7c8f' }}>Resultats OCR normalises, metadonnees techniques consolidees.</p>
          <div style={{ fontSize: 13 }}>
            Objets: {hasStorageStats ? cleanStats?.count || 0 : 'N/A'} | Taille: {hasStorageStats ? fmtMb(cleanStats?.total_size_mb) : 'N/A'}
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Server size={18} color="#15324a" />
            <strong>Curated Zone</strong>
          </div>
          <p style={{ fontSize: 13, color: '#6c7c8f' }}>Donnees prêtes metier pour CRM, conformité et reporting.</p>
          <div style={{ fontSize: 13 }}>
            Objets: {hasStorageStats ? curatedStats?.count || 0 : 'N/A'} | Taille: {hasStorageStats ? fmtMb(curatedStats?.total_size_mb) : 'N/A'}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <ShieldCheck size={18} color="#15324a" />
          <strong>Securite d'acces</strong>
        </div>
        <p style={{ fontSize: 13, color: '#6c7c8f', marginBottom: 0 }}>
          Acces technique reserve au role admin, credentials non exposes au frontend, et canaux API limites par service.
        </p>
      </div>
    </div>
  )
}
