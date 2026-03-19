import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useUploadContext } from '../context/UploadContext'
import UploadZone from '../components/upload/UploadZone'
import { AlertCircle, CheckCircle, FileText, ShieldCheck } from 'lucide-react'

export default function UploadPage() {
  const navigate = useNavigate()
  const {
    files,
    addFiles,
    removeFile,
    processFiles,
    retryFailedFiles,
    processing,
    progress,
    results,
    backendAvailable,
    backendHealth,
    lastCheckedAt,
    checkBackendHealth,
  } = useUploadContext()

  const failedCount = files.filter((f) => f.status === 'error').length
  const pendingCount = files.filter((f) => f.status === 'pending').length
  const processingCount = files.filter((f) => f.status === 'processing').length
  const doneCount = files.filter((f) => f.status === 'done').length
  const checkedLabel = lastCheckedAt ? new Date(lastCheckedAt).toLocaleTimeString('fr-FR') : '-'

  useEffect(() => {
    const hasPending = files.some(f => f.status === 'pending')
    if (hasPending && !processing && backendAvailable !== false) {
      processFiles()
    }
  }, [files, processing, backendAvailable, processFiles])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Upload de documents</h1>
      </div>

      <div className="hero-strip">
        <h3 style={{ color: '#f3fbff', margin: 0 }}>Traitement intelligent automatique</h3>
        <p>
          Depose 1 a 10 fichiers (PDF/JPG/PNG). Le pipeline OCR + extraction demarre automatiquement,
          puis les resultats sont enrichis cote CRM fournisseur.
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <span className="badge" style={{ background: 'rgba(255,255,255,0.18)', color: '#f3fbff' }}>
            Selectionnes: {files.length}/10
          </span>
          <span className="badge" style={{ background: 'rgba(255,255,255,0.15)', color: '#f3fbff' }}>
            En attente: {pendingCount}
          </span>
          <span className="badge" style={{ background: 'rgba(255,255,255,0.15)', color: '#f3fbff' }}>
            En cours: {processingCount}
          </span>
          <span className="badge" style={{ background: 'rgba(255,255,255,0.15)', color: '#f3fbff' }}>
            Erreurs: {failedCount}
          </span>
          <span className="badge" style={{ background: 'rgba(6,182,138,0.22)', color: '#e9fff8' }}>
            Traites: {doneCount}
          </span>
        </div>
      </div>

      {backendAvailable === false && (
        <div className="card" style={{ marginBottom: 18, borderLeft: '4px solid #d1495b', padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9f2d3f', fontSize: 13, fontWeight: 600 }}>
              <AlertCircle size={16} />
              Service indisponible : le traitement automatique est en attente. Vérifiez votre connexion.
            </div>
            <button className="btn btn-outline" style={{ padding: '6px 10px', fontSize: 12 }} onClick={checkBackendHealth}>
              Vérifier
            </button>
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: '#7f2e3a' }}>
            Dernière vérification : {checkedLabel}
          </div>
        </div>
      )}

      {backendAvailable === true && failedCount > 0 && (
        <div className="card" style={{ marginBottom: 18, borderLeft: '4px solid #06b68a', padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0d6a53', fontSize: 13, fontWeight: 600 }}>
              <CheckCircle size={16} />
              Service disponible. {failedCount} fichier(s) peuvent être relas maintenant.
            </div>
            <button className="btn btn-accent" style={{ padding: '6px 10px', fontSize: 12 }} onClick={retryFailedFiles}>
              Réessayer les erreurs
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <UploadZone
          files={files}
          onAddFiles={addFiles}
          onRemoveFile={removeFile}
          onRetryErrors={retryFailedFiles}
          backendAvailable={backendAvailable}
          processing={processing}
          progress={progress}
        />
      </div>

      {/* Résultats */}
      {results.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: 16 }}>Résultats du traitement</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 16 }}>
            {files.filter(f => f.status === 'done' && f.result).map(f => (
              <div key={f.id} className="card" style={{ borderLeft: '4px solid #00C896' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <h4 style={{ fontSize: 14, marginBottom: 4 }}>{f.name}</h4>
                    <span className={`badge ${f.result.type === 'inconnu' ? 'badge-warning' : 'badge-info'}`}>
                      {f.result.type || 'inconnu'}
                    </span>
                  </div>
                  <ConfidenceGauge value={f.result.ocr_confidence || 0} />
                </div>

                {/* Entités extraites */}
                {f.result.entities && (
                  <div style={{ fontSize: 13, color: '#718096' }}>
                    {Object.entries(f.result.entities)
                      .filter(([_, v]) => v != null)
                      .slice(0, 5)
                      .map(([key, val]) => (
                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #F0F4F8' }}>
                          <span style={{ fontWeight: 500 }}>{key}</span>
                          <span style={{ color: '#2D3748', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(val)}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation inter-onglets - après traitement */}
      {doneCount > 0 && (
        <div style={{
          marginTop: 24, padding: '16px 20px',
          background: 'linear-gradient(135deg, #f0f4f8 0%, #e8f0fe 100%)',
          borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        }}>
          <span style={{ fontSize: 13, color: '#4A5568', fontWeight: 500 }}>
            {doneCount} document(s) traité(s) — étapes suivantes :
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-outline" onClick={() => navigate('/documents')} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <FileText size={15} /> Voir les documents
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/conformity')} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <ShieldCheck size={15} /> Vérifier la conformité
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ConfidenceGauge({ value }) {
  const percent = Math.round(value * 100)
  const color = percent >= 80 ? '#00C896' : percent >= 50 ? '#F4A261' : '#E63946'

  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={50} height={50} viewBox="0 0 50 50">
        <circle cx="25" cy="25" r="20" fill="none" stroke="#E2E8F0" strokeWidth="4" />
        <circle
          cx="25" cy="25" r="20"
          fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${percent * 1.256} 125.6`}
          strokeLinecap="round"
          transform="rotate(-90 25 25)"
        />
        <text x="25" y="28" textAnchor="middle" fontSize="11" fontWeight="600" fill={color}>
          {percent}%
        </text>
      </svg>
      <div style={{ fontSize: 10, color: '#718096' }}>OCR</div>
    </div>
  )
}
