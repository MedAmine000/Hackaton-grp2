import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, Image, X, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import toast from 'react-hot-toast'

const ACCEPT = {
  'application/pdf': ['.pdf'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function StatusIcon({ status }) {
  switch (status) {
    case 'done': return <CheckCircle size={18} color="#00C896" />
    case 'error': return <AlertCircle size={18} color="#E63946" />
    case 'processing': return <Loader size={18} color="#F4A261" className="animate-pulse" />
    default: return <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid #CBD5E0' }} />
  }
}

export default function UploadZone({ files, onAddFiles, onRemoveFile, onRetryErrors, backendAvailable, processing, progress }) {
  const onDrop = useCallback((accepted) => {
    if (accepted.length > 0) onAddFiles(accepted)
  }, [onAddFiles])

  const onDropRejected = useCallback(() => {
    toast.error('Maximum 10 fichiers a la fois')
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: ACCEPT,
    multiple: true,
    minFiles: 1,
    maxFiles: 10,
    disabled: processing || files.length >= 10,
  })

  const formatError = (error) => {
    const msg = String(error || '')
    if (!msg) return 'Echec du traitement.'
    if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('connect')) {
      return 'Backend indisponible. Verifiez que les services sont demarres.'
    }
    return msg
  }

  return (
    <div>
      {/* Dropzone */}
      <div
        {...getRootProps()}
        style={{
          minHeight: 210,
          border: `2px dashed ${isDragActive ? '#06b68a' : '#bcd0e0'}`,
          borderRadius: 18,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: processing || files.length >= 10 ? 'not-allowed' : 'pointer',
          background: isDragActive
            ? 'linear-gradient(160deg, rgba(6,182,138,0.13), rgba(31,76,107,0.06))'
            : 'linear-gradient(160deg, rgba(21,50,74,0.02), rgba(6,182,138,0.03))',
          transition: 'all 0.3s',
          marginBottom: 24,
        }}
      >
        <input {...getInputProps()} />
        <Upload size={40} color={isDragActive ? '#06b68a' : '#8ca6bb'} style={{ marginBottom: 12 }} />
        <p style={{ fontSize: 16, fontWeight: 600, color: '#2D3748' }}>
          {isDragActive ? 'Deposez les fichiers ici...' : 'Glissez vos documents ou cliquez pour selectionner'}
        </p>
        <p style={{ fontSize: 13, color: '#718096', marginTop: 4 }}>
          PDF, PNG, JPG - Taille max 20 MB - 1 a 10 fichiers
        </p>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#35566e', marginTop: 6 }}>
          Minimum 1 fichier requis - Maximum 10 fichiers par upload
        </p>
        {(processing || files.length >= 10) && (
          <p style={{ fontSize: 12, color: '#718096', marginTop: 6 }}>
            {processing ? 'Upload verrouille pendant le traitement en cours.' : 'Limite de 10 fichiers atteinte.'}
          </p>
        )}
      </div>

      {/* Liste des fichiers */}
      {files.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
            <h3 style={{ fontSize: '1rem', marginBottom: 0 }}>
              {files.length} document(s) sélectionné(s)
            </h3>
            {!processing && files.some((f) => f.status === 'error') && (
              <button
                className="btn btn-outline"
                style={{ padding: '6px 10px', fontSize: 12 }}
                onClick={onRetryErrors}
              >
                Reessayer les erreurs
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {files.map(f => (
              <div key={f.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                background: 'white',
                borderRadius: 8,
                border: '1px solid #E2E8F0',
              }}>
                <StatusIcon status={f.status} />
                {f.name.endsWith('.pdf') ? <FileText size={18} color="#E63946" /> : <Image size={18} color="#00C896" />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{f.name}</div>
                  <div style={{ fontSize: 12, color: '#718096' }}>{formatSize(f.size)}</div>
                  {f.status === 'error' && (
                    <div style={{ fontSize: 12, color: '#d1495b', marginTop: 4 }}>
                      {formatError(f.result?.error)}
                    </div>
                  )}
                </div>
                {f.result?.type && (
                  <span className="badge badge-info">{f.result.type}</span>
                )}
                {f.result?.ocr_confidence != null && (
                  <span style={{ fontSize: 12, color: '#718096' }}>
                    OCR: {Math.round(f.result.ocr_confidence * 100)}%
                  </span>
                )}
                {f.status === 'pending' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveFile(f.id) }}
                    style={{ background: 'none', border: 'none', padding: 4 }}
                  >
                    <X size={16} color="#718096" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Barre de progression */}
      {processing && (
        <div style={{ marginBottom: 16 }}>
          <div style={{
            height: 8,
            background: '#E2E8F0',
            borderRadius: 4,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #00C896, #1B2A4A)',
              borderRadius: 4,
              transition: 'width 0.3s',
            }} />
          </div>
          <p style={{ textAlign: 'center', fontSize: 13, color: '#718096', marginTop: 6 }}>
            {progress}% — Traitement en cours...
          </p>
        </div>
      )}

      {files.some(f => f.status === 'pending') && !processing && (
        <p style={{ fontSize: 13, color: backendAvailable === false ? '#d1495b' : '#718096', textAlign: 'center' }}>
          {backendAvailable === false
            ? 'En attente du Backend pour lancer le traitement automatique...'
            : 'Traitement automatique pret a demarrer...'}
        </p>
      )}
    </div>
  )
}
