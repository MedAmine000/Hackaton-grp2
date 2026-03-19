import { useCallback, useEffect, useMemo, useState } from 'react'
import { Headset, MessageSquareWarning, Clock3, CheckCircle2, RefreshCw, Search, Download } from 'lucide-react'
import api from '../services/api'

const SUPPORT_PREFS_KEY = 'docuflow_support_prefs'

function loadSupportPrefs() {
  try {
    const raw = localStorage.getItem(SUPPORT_PREFS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function formatElapsedMinutes(minutes) {
  if (!Number.isFinite(minutes) || minutes < 0) return 'N/A'
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function buildTicketFromAnomaly(anomaly, index, documentsById) {
  const severity = anomaly?.severity || 'INFO'
  const priority = severity === 'ERROR' ? 'Haute' : severity === 'WARNING' ? 'Moyenne' : 'Basse'
  const status = severity === 'ERROR' ? 'Ouvert' : severity === 'WARNING' ? 'En cours' : 'Resolue'
  const docId = anomaly?.document_id || anomaly?.concerned_document_ids?.[0]
  const doc = documentsById.get(docId)
  const referenceDate = doc?.processed_at || doc?.created_at

  let elapsedMinutes = null
  if (referenceDate) {
    const diffMs = Date.now() - new Date(referenceDate).getTime()
    elapsedMinutes = Math.max(0, Math.round(diffMs / 60000))
  }

  return {
    id: `SUP-${String(index + 1).padStart(4, '0')}`,
    sujet: anomaly?.message || `Anomalie ${anomaly?.rule_id || 'UNKNOWN'}`,
    priorite: priority,
    statut: status,
    delai: formatElapsedMinutes(elapsedMinutes),
    elapsedMinutes,
    ruleId: anomaly?.rule_id || 'UNKNOWN',
    fileName: anomaly?.file_name || doc?.file_name || 'Document non renseigne',
  }
}

export default function SupportPage() {
  const prefs = loadSupportPrefs()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastSyncAt, setLastSyncAt] = useState(null)
  const [statusFilter, setStatusFilter] = useState(prefs?.statusFilter || 'all')
  const [priorityFilter, setPriorityFilter] = useState(prefs?.priorityFilter || 'all')
  const [query, setQuery] = useState(prefs?.query || '')
  const [sortBy, setSortBy] = useState(prefs?.sortBy || 'priority-desc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(prefs?.pageSize || 20)

  const fetchTickets = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      const [validationRes, docsRes] = await Promise.all([
        api.get('/validation/results'),
        api.get('/documents?limit=200'),
      ])

      const anomalies = validationRes?.data?.anomalies || []
      const documents = docsRes?.data?.documents || []
      const documentsById = new Map(documents.map((d) => [d.document_id, d]))

      const mapped = anomalies.slice(0, 100).map((a, i) => buildTicketFromAnomaly(a, i, documentsById))
      setTickets(mapped)
      setLastSyncAt(Date.now())
    } catch {
      setTickets([])
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTickets()
    const interval = setInterval(() => fetchTickets({ silent: true }), 15000)
    return () => clearInterval(interval)
  }, [fetchTickets])

  const highPriorityCount = useMemo(() => tickets.filter((t) => t.priorite === 'Haute').length, [tickets])
  const openCount = useMemo(() => tickets.filter((t) => t.statut !== 'Resolue').length, [tickets])
  const resolvedCount = useMemo(() => tickets.filter((t) => t.statut === 'Resolue').length, [tickets])
  const slaBreachedCount = useMemo(
    () => tickets.filter((t) => t.statut !== 'Resolue' && Number.isFinite(t.elapsedMinutes) && t.elapsedMinutes > 30).length,
    [tickets]
  )
  const resolutionRate = useMemo(() => {
    if (tickets.length === 0) return null
    const resolved = tickets.filter((t) => t.statut === 'Resolue').length
    return Math.round((resolved / tickets.length) * 100)
  }, [tickets])

  const filteredTickets = useMemo(() => {
    const q = query.trim().toLowerCase()
    const result = tickets.filter((ticket) => {
      if (statusFilter !== 'all' && ticket.statut !== statusFilter) return false
      if (priorityFilter !== 'all' && ticket.priorite !== priorityFilter) return false
      if (!q) return true

      const haystack = `${ticket.id} ${ticket.sujet} ${ticket.fileName} ${ticket.ruleId}`.toLowerCase()
      return haystack.includes(q)
    })

    const priorityWeight = { Haute: 3, Moyenne: 2, Basse: 1 }
    const statusWeight = { Ouvert: 3, 'En cours': 2, Resolue: 1 }

    if (sortBy === 'priority-desc') {
      return [...result].sort((a, b) => (priorityWeight[b.priorite] || 0) - (priorityWeight[a.priorite] || 0))
    }
    if (sortBy === 'status-desc') {
      return [...result].sort((a, b) => (statusWeight[b.statut] || 0) - (statusWeight[a.statut] || 0))
    }
    if (sortBy === 'id-desc') {
      return [...result].sort((a, b) => (a.id < b.id ? 1 : -1))
    }

    return result
  }, [tickets, statusFilter, priorityFilter, query, sortBy])

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const pagedTickets = filteredTickets.slice(startIndex, endIndex)

  useEffect(() => {
    setPage(1)
  }, [statusFilter, priorityFilter, query, sortBy, pageSize])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  useEffect(() => {
    const safePageSize = [10, 20, 50].includes(pageSize) ? pageSize : 20
    localStorage.setItem(
      SUPPORT_PREFS_KEY,
      JSON.stringify({
        statusFilter,
        priorityFilter,
        query,
        sortBy,
        pageSize: safePageSize,
      })
    )
  }, [statusFilter, priorityFilter, query, sortBy, pageSize])

  const exportFilteredCsv = () => {
    if (filteredTickets.length === 0) return

    const headers = ['ticket_id', 'sujet', 'priorite', 'statut', 'rule_id', 'file_name']
    const rows = filteredTickets.map((t) => [t.id, t.sujet, t.priorite, t.statut, t.ruleId, t.fileName])

    const escapeCell = (value) => {
      const raw = String(value ?? '')
      if (raw.includes(',') || raw.includes('"')) {
        return `"${raw.replace(/"/g, '""')}"`
      }
      return raw
    }

    const csvContent = [headers, ...rows]
      .map((line) => line.map(escapeCell).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `support_tickets_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const resetFilters = () => {
    setStatusFilter('all')
    setPriorityFilter('all')
    setQuery('')
    setSortBy('priority-desc')
    setPageSize(20)
    setPage(1)
    localStorage.removeItem(SUPPORT_PREFS_KEY)
  }

  const formatTime = (ts) => {
    if (!ts) return '-'
    return new Date(ts).toLocaleTimeString('fr-FR')
  }

  const priorityBadgeClass = (priority) => {
    if (priority === 'Haute') return 'badge-danger'
    if (priority === 'Moyenne') return 'badge-warning'
    return 'badge-info'
  }

  const statusBadgeClass = (status) => {
    if (status === 'Ouvert') return 'badge-danger'
    if (status === 'En cours') return 'badge-warning'
    return 'badge-success'
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Support Client</h1>
        <button className="btn btn-outline" onClick={fetchTickets} title="Rafraîchir">
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="hero-strip">
        <h3 style={{ color: '#f3fbff', margin: 0 }}>Suivi experience et assistance</h3>
        <p>
          Centralise les incidents clients, les priorites de traitement et les delais de resolution.
        </p>
        <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(243,251,255,0.8)' }}>
          Derniere synchronisation: {formatTime(lastSyncAt)}
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi-card">
          <div className="value">{openCount}</div>
          <div className="label">Tickets ouverts</div>
        </div>
        <div className="kpi-card">
          <div className="value" style={{ color: '#F4A261' }}>{highPriorityCount}</div>
          <div className="label">Priorite haute</div>
        </div>
        <div className="kpi-card">
          <div className="value" style={{ color: '#00C896' }}>
            {resolutionRate == null ? 'N/A' : `${resolutionRate}%`}
          </div>
          <div className="label">Taux de resolution</div>
        </div>
        <div className="kpi-card">
          <div className="value" style={{ color: '#457B9D' }}>{loading ? '...' : `${filteredTickets.length}`}</div>
          <div className="label">Tickets affiches</div>
        </div>
        <div className="kpi-card">
          <div className="value" style={{ color: '#d1495b' }}>{loading ? '...' : `${slaBreachedCount}`}</div>
          <div className="label">SLA {'>'} 30 min</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16, padding: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr auto auto', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #E2E8F0', borderRadius: 10, padding: '8px 10px' }}>
            <Search size={15} color="#6c7c8f" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher ticket, sujet, document..."
              style={{ border: 'none', outline: 'none', width: '100%', fontSize: 13, fontFamily: 'Manrope, sans-serif' }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: '8px 10px', fontSize: 13, fontFamily: 'Manrope, sans-serif', color: '#203140' }}
          >
            <option value="all">Tous les statuts</option>
            <option value="Ouvert">Ouvert</option>
            <option value="En cours">En cours</option>
            <option value="Resolue">Resolue</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: '8px 10px', fontSize: 13, fontFamily: 'Manrope, sans-serif', color: '#203140' }}
          >
            <option value="all">Toutes priorites</option>
            <option value="Haute">Haute</option>
            <option value="Moyenne">Moyenne</option>
            <option value="Basse">Basse</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: '8px 10px', fontSize: 13, fontFamily: 'Manrope, sans-serif', color: '#203140' }}
          >
            <option value="priority-desc">Tri: Priorite</option>
            <option value="status-desc">Tri: Statut</option>
            <option value="id-desc">Tri: Plus recents</option>
          </select>

          <button className="btn btn-outline" style={{ padding: '8px 10px', fontSize: 12 }} onClick={exportFilteredCsv} disabled={filteredTickets.length === 0}>
            <Download size={14} /> Export CSV
          </button>

          <button className="btn btn-outline" style={{ padding: '8px 10px', fontSize: 12 }} onClick={resetFilters}>
            Reinitialiser filtres
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: 16, borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Headset size={18} color="#15324a" />
          <h3 style={{ fontSize: 16, margin: 0 }}>File de tickets</h3>
        </div>

        {loading ? (
          <p style={{ padding: 18, color: '#718096' }}>Chargement des tickets...</p>
        ) : filteredTickets.length === 0 ? (
          <p style={{ padding: 18, color: '#718096' }}>
            {tickets.length === 0 ? 'Aucun ticket actif pour le moment.' : 'Aucun ticket ne correspond aux filtres actifs.'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 2.1fr 1fr 1fr 1.2fr 0.9fr',
                gap: 10,
                alignItems: 'center',
                padding: '10px 16px',
                borderBottom: '1px solid #E2E8F0',
                fontSize: 12,
                fontWeight: 700,
                color: '#4A5568',
                background: '#F8FBFF',
              }}
            >
              <span>Ticket</span>
              <span>Sujet</span>
              <span>Priorite</span>
              <span>Statut</span>
              <span>Document</span>
              <span>Delai</span>
            </div>
            {pagedTickets.map((ticket) => (
              <div
                key={ticket.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 2.1fr 1fr 1fr 1.2fr 0.9fr',
                  gap: 10,
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderBottom: '1px solid #F0F4F8',
                  fontSize: 13,
                }}
              >
                <strong>{ticket.id}</strong>
                <span title={ticket.sujet}>{ticket.sujet}</span>
                <span className={`badge ${priorityBadgeClass(ticket.priorite)}`}>{ticket.priorite}</span>
                <span className={`badge ${statusBadgeClass(ticket.statut)}`}>{ticket.statut}</span>
                <span title={`Regle: ${ticket.ruleId}`}>{ticket.fileName}</span>
                <span style={{ color: '#4A5568', fontSize: 12 }}>{ticket.delai}</span>
              </div>
            ))}

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              padding: '12px 16px',
              borderTop: '1px solid #E2E8F0',
              background: '#FCFDFE',
            }}>
              <span style={{ fontSize: 12, color: '#6c7c8f' }}>
                Affichage {filteredTickets.length === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, filteredTickets.length)} sur {filteredTickets.length}
              </span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <label style={{ fontSize: 12, color: '#6c7c8f' }}>Lignes</label>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: '4px 8px', fontSize: 12, color: '#203140', fontFamily: 'Manrope, sans-serif' }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <button
                  className="btn btn-outline"
                  style={{ padding: '6px 10px', fontSize: 12 }}
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Precedent
                </button>
                <span style={{ fontSize: 12, color: '#4A5568', alignSelf: 'center' }}>
                  Page {currentPage}/{totalPages}
                </span>
                <button
                  className="btn btn-outline"
                  style={{ padding: '6px 10px', fontSize: 12 }}
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Suivant
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span className="badge badge-warning"><MessageSquareWarning size={12} /> Incidents critiques monitorés</span>
        <span className="badge badge-info"><Clock3 size={12} /> Escalade automatique {'>'} 30 min ({slaBreachedCount})</span>
        <span className="badge badge-success"><CheckCircle2 size={12} /> Historique client consolidé</span>
      </div>
    </div>
  )
}
