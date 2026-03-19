import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Image, Clock, CheckCircle, AlertTriangle, XCircle, Trash2, RefreshCw, Eye, Sparkles, Loader, ShieldCheck, Users } from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'

const STATUS_CONFIG = {
  raw: { color: '#718096', label: 'En attente' },
  ocr_done: { color: '#457B9D', label: 'OCR terminé' },
  validated: { color: '#F4A261', label: 'Validé' },
  llm_refined: { color: '#8B5CF6', label: 'IA raffiné' },
  curated: { color: '#00C896', label: 'Finalisé' },
}

const TYPE_COLORS = {
  facture: '#E63946',
  devis: '#F4A261',
  kbis: '#2A9D8F',
  urssaf: '#457B9D',
  siret: '#6D6875',
  rib: '#1B2A4A',
  inconnu: '#CBD5E0',
}

export default function DocumentsPage() {
  const navigate = useNavigate()
  const [documents, setDocuments] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [extracting, setExtracting] = useState(null)
  const [llmStatus, setLlmStatus] = useState('unknown')

  const fetchDocuments = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      const params = filterType !== 'all' ? `?type=${filterType}&limit=100` : '?limit=100'
      const res = await api.get(`/documents${params}`)
      setDocuments(res.data.documents || [])
      setTotal(res.data.total || 0)
    } catch {
      setDocuments([])
    } finally {
      if (!silent) setLoading(false)
    }
  }, [filterType])

  useEffect(() => { fetchDocuments() }, [fetchDocuments])

  useEffect(() => {
    const handleDataUpdated = () => {
      fetchDocuments({ silent: true })
    }

    const handleVisibility = () => {
      if (!document.hidden) fetchDocuments({ silent: true })
    }

    const interval = setInterval(() => {
      if (!document.hidden) fetchDocuments({ silent: true })
    }, 15000)

    window.addEventListener('docuflow:data-updated', handleDataUpdated)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(interval)
      window.removeEventListener('docuflow:data-updated', handleDataUpdated)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [fetchDocuments])

  useEffect(() => {
    api.get('/llm/status')
      .then((res) => {
        const available = res?.data?.available
        if (typeof available === 'boolean') {
          setLlmStatus(available ? 'available' : 'unavailable')
          return
        }
        setLlmStatus('unknown')
      })
      .catch(() => {
        setLlmStatus('unknown')
      })
  }, [])

  const llmAvailable = llmStatus === 'available'

  const handleReextract = async (docId, fileName) => {
    setExtracting(docId)
    try {
      const res = await api.post(`/llm/reextract/${docId}`, {}, { timeout: 60000 })
      const data = res.data
      toast.success(
        `${fileName} re-extrait par IA (${data.new_type}, confiance ${Math.round((data.confidence || 0) * 100)}%, ${data.tokens_used} tokens)`,
        { duration: 5000 }
      )
      fetchDocuments()
    } catch (err) {
      const msg = err.response?.data?.error || err.message
      toast.error(`Erreur IA : ${msg}`)
    } finally {
      setExtracting(null)
    }
  }

  const handleDelete = async (docId) => {
    try {
      await api.delete(`/documents/${docId}`)
      toast.success('Document supprimé')
      fetchDocuments()
    } catch {
      toast.error('Erreur de suppression')
    }
  }

  const formatDate = (d) => {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const formatSize = (bytes) => {
    if (!bytes) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const docTypes = ['all', 'facture', 'devis', 'kbis', 'urssaf', 'siret', 'rib', 'inconnu']
  const normalizedQuery = searchQuery.trim().toLowerCase()

  const visibleDocuments = normalizedQuery
    ? documents.filter((doc) => {
      const haystack = [
        doc.file_name,
        doc.doc_type,
        doc.entities?.siret,
        doc.entities?.raison_sociale,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedQuery)
    })
    : documents

  const anomaliesCount = documents.reduce((acc, doc) => acc + (doc.anomalies?.length || 0), 0)
  const completedCount = documents.filter((doc) => doc.pipeline_status === 'curated').length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Historique Documents</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#718096' }}>{total} document(s)</span>
          <button className="btn btn-outline" onClick={fetchDocuments} title="Rafraîchir">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="hero-strip">
        <h3 style={{ color: '#f3fbff', margin: 0 }}>Suivi de traitement des documents</h3>
        <p>
          Consulte, filtre et controle les extractions OCR/IA en un coup d'oeil.
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <span className="badge" style={{ background: 'rgba(255,255,255,0.18)', color: '#f3fbff' }}>
            Affiches: {visibleDocuments.length}
          </span>
          <span className="badge" style={{ background: 'rgba(6,182,138,0.22)', color: '#e9fff8' }}>
            Finalises: {completedCount}
          </span>
          <span className="badge" style={{ background: 'rgba(255,255,255,0.15)', color: '#f3fbff' }}>
            Anomalies: {anomaliesCount}
          </span>
          {llmStatus !== 'unknown' && (
            <span className="badge" style={{ background: 'rgba(255,255,255,0.15)', color: '#f3fbff' }}>
              IA: {llmAvailable ? 'Disponible' : 'Optionnelle'}
            </span>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20, padding: 14 }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher par nom de fichier, type, SIRET, raison sociale..."
          style={{
            width: '100%',
            border: '1px solid #d9e3ee',
            borderRadius: 10,
            padding: '10px 12px',
            fontSize: 14,
            color: '#203140',
            background: 'rgba(255,255,255,0.85)',
            outline: 'none',
          }}
        />
      </div>

      {/* Filtres par type */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {docTypes.map(type => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`btn ${filterType === type ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '6px 14px', fontSize: 12, textTransform: 'capitalize' }}
          >
            {type === 'all' ? 'Tous' : type}
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <p style={{ textAlign: 'center', color: '#718096', padding: 40 }}>Chargement...</p>
      ) : visibleDocuments.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60, color: '#718096' }}>
          <FileText size={48} color="#CBD5E0" />
          <p style={{ marginTop: 16 }}>{documents.length === 0 ? 'Aucun document trouve.' : 'Aucun resultat pour cette recherche.'}</p>
          <p style={{ fontSize: 13 }}>{documents.length === 0 ? 'Uploadez des documents pour les voir ici.' : 'Essaie un autre mot-cle ou un autre filtre.'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {visibleDocuments.map(doc => {
            const statusConf = STATUS_CONFIG[doc.pipeline_status] || STATUS_CONFIG.raw
            const typeColor = TYPE_COLORS[doc.doc_type] || TYPE_COLORS.inconnu
            const isExpanded = expanded === doc.document_id
            const hasAnomalies = doc.anomalies && doc.anomalies.length > 0
            const isPdf = doc.mime_type === 'application/pdf'

            return (
              <div key={doc.document_id} className="card" style={{
                padding: 0,
                borderLeft: `4px solid ${typeColor}`,
                overflow: 'hidden',
              }}>
                {/* En-tête */}
                <div
                  style={{
                    padding: 16, display: 'flex', alignItems: 'center', gap: 12,
                    cursor: 'pointer',
                  }}
                  onClick={() => setExpanded(isExpanded ? null : doc.document_id)}
                >
                  {isPdf ? <FileText size={20} color={typeColor} /> : <Image size={20} color={typeColor} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doc.file_name}
                    </div>
                    <div style={{ fontSize: 12, color: '#718096', display: 'flex', gap: 12, marginTop: 2 }}>
                      <span>{formatSize(doc.file_size_bytes)}</span>
                      <span><Clock size={11} style={{ verticalAlign: 'middle' }} /> {formatDate(doc.processed_at || doc.created_at)}</span>
                    </div>
                  </div>

                  {/* Badges */}
                  <span style={{
                    padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                    background: typeColor + '15', color: typeColor, textTransform: 'capitalize',
                  }}>
                    {doc.doc_type}
                  </span>

                  <span style={{
                    padding: '3px 10px', borderRadius: 12, fontSize: 11,
                    background: statusConf.color + '15', color: statusConf.color,
                  }}>
                    {statusConf.label}
                  </span>

                  {doc.ocr_confidence != null && (
                    <span style={{ fontSize: 12, color: doc.ocr_confidence >= 0.8 ? '#00C896' : '#F4A261', fontWeight: 600 }}>
                      {Math.round(doc.ocr_confidence * 100)}%
                    </span>
                  )}

                  {hasAnomalies && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {doc.anomalies.some(a => a.severity === 'ERROR')
                        ? <XCircle size={16} color="#E63946" />
                        : <AlertTriangle size={16} color="#F4A261" />}
                      <span style={{ fontSize: 11, color: '#718096' }}>{doc.anomalies.length}</span>
                    </span>
                  )}

                  {doc.llm_extracted && <Sparkles size={14} color="#8B5CF6" title="Raffiné par IA" />}

                  <Eye size={16} color="#718096" style={{ opacity: isExpanded ? 1 : 0.4 }} />
                </div>

                {/* Détails expansés */}
                {isExpanded && (
                  <div style={{ padding: '0 16px 16px', borderTop: '1px solid #F0F4F8' }}>
                    {/* Entités */}
                    {doc.entities && Object.keys(doc.entities).some(k => doc.entities[k]) && (
                      <div style={{ marginTop: 12 }}>
                        <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#1B2A4A' }}>Entités extraites</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                          {Object.entries(doc.entities)
                            .filter(([, v]) => v != null && v !== '')
                            .map(([key, val]) => (
                              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, borderBottom: '1px solid #F0F4F8' }}>
                                <span style={{ color: '#718096', fontWeight: 500 }}>{key}</span>
                                <span style={{ color: '#2D3748' }}>{String(val)}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Anomalies */}
                    {hasAnomalies && (
                      <div style={{ marginTop: 12 }}>
                        <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#E63946' }}>Anomalies ({doc.anomalies.length})</h4>
                        {doc.anomalies.map((a, i) => (
                          <div key={i} style={{
                            padding: '8px 12px', marginBottom: 4, borderRadius: 6,
                            background: a.severity === 'ERROR' ? '#FEE2E2' : a.severity === 'WARNING' ? '#FEF3C7' : '#DBEAFE',
                            fontSize: 13,
                          }}>
                            <strong>{a.rule}</strong>: {a.message}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {llmAvailable && (
                        <button
                          className="btn btn-accent"
                          style={{ fontSize: 12, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
                          onClick={(e) => { e.stopPropagation(); handleReextract(doc.document_id, doc.file_name) }}
                          disabled={extracting === doc.document_id}
                        >
                          {extracting === doc.document_id
                            ? <><Loader size={14} className="animate-pulse" /> Extraction IA en cours...</>
                            : <><Sparkles size={14} /> Re-extraire avec IA</>
                          }
                        </button>
                      )}
                      {doc.llm_extracted && (
                        <span style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          fontSize: 11, color: '#8B5CF6', padding: '6px 10px',
                          background: 'rgba(139,92,246,0.08)', borderRadius: 6,
                        }}>
                          <Sparkles size={12} /> Raffiné par IA
                          {doc.llm_extraction_date && (' le ' + new Date(doc.llm_extraction_date).toLocaleDateString('fr-FR'))}
                        </span>
                      )}
                      <button
                        className="btn btn-danger"
                        style={{ fontSize: 12, padding: '4px 12px' }}
                        onClick={(e) => { e.stopPropagation(); handleDelete(doc.document_id) }}
                      >
                        <Trash2 size={14} /> Supprimer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Navigation inter-onglets */}
      <div style={{
        marginTop: 28, padding: '16px 20px',
        background: 'linear-gradient(135deg, #f0f4f8 0%, #e8f0fe 100%)',
        borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <span style={{ fontSize: 13, color: '#4A5568', fontWeight: 500 }}>Étape suivante dans le flux :</span>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={() => navigate('/conformity')} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <ShieldCheck size={15} /> Analyser la conformité
          </button>
          <button className="btn btn-outline" onClick={() => navigate('/crm')} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <Users size={15} /> Gérer les fournisseurs
          </button>
        </div>
      </div>
    </div>
  )
}
