import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'

const UploadContext = createContext(null)
const MAX_FILES = 10

function emitDataUpdated(payload = {}) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('docuflow:data-updated', {
    detail: { at: Date.now(), ...payload },
  }))
}

export function UploadProvider({ children }) {
  const [files, setFiles] = useState([])
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState([])
  const [backendAvailable, setBackendAvailable] = useState(null)
  const [backendHealth, setBackendHealth] = useState(null)
  const [lastCheckedAt, setLastCheckedAt] = useState(null)

  const checkBackendHealth = useCallback(async () => {
    try {
      const res = await api.get('/health', { timeout: 5000 })
      setBackendAvailable(true)
      setBackendHealth(res?.data || null)
      setLastCheckedAt(Date.now())
      return true
    } catch {
      setBackendAvailable(false)
      setBackendHealth(null)
      setLastCheckedAt(Date.now())
      return false
    }
  }, [])

  useEffect(() => {
    checkBackendHealth()
    const interval = setInterval(checkBackendHealth, 10000)
    return () => clearInterval(interval)
  }, [checkBackendHealth])

  const addFiles = useCallback((newFiles) => {
    setFiles(prev => {
      const availableSlots = Math.max(0, MAX_FILES - prev.length)
      if (availableSlots === 0) {
        toast.error(`Maximum ${MAX_FILES} fichiers`) 
        return prev
      }

      const accepted = newFiles.slice(0, availableSlots)
      if (accepted.length < newFiles.length) {
        toast.error(`Maximum ${MAX_FILES} fichiers`) 
      }

      const mapped = accepted.map(file => ({
        file,
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        size: file.size,
        status: 'pending',
        result: null,
      }))

      return [...prev, ...mapped]
    })
  }, [])

  const removeFile = useCallback((id) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }, [])

  const processFiles = useCallback(async () => {
    const pendingFiles = files.filter(f => f.status === 'pending')
    if (pendingFiles.length === 0) return

    const apiReady = await checkBackendHealth()
    if (!apiReady) {
      toast.error('Backend indisponible. Les fichiers restent en attente.')
      return
    }

    setProcessing(true)
    setProgress(0)

    const totalFiles = pendingFiles.length
    const newResults = []

    for (let i = 0; i < pendingFiles.length; i++) {
      const fileEntry = pendingFiles[i]
      setFiles(prev => prev.map(f =>
        f.id === fileEntry.id ? { ...f, status: 'processing' } : f
      ))

      try {
        const formData = new FormData()
        formData.append('documents', fileEntry.file)

        const response = await api.post('/process', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 180000,
        })

        const data = response.data
        const result = data.results?.[0] || data
        newResults.push(result)
        setBackendAvailable(true)

        setFiles(prev => prev.map(f =>
          f.id === fileEntry.id ? { ...f, status: 'done', result } : f
        ))
      } catch (error) {
        setBackendAvailable(false)
        const errorMsg = error.response?.data?.error || error.message
        setFiles(prev => prev.map(f =>
          f.id === fileEntry.id ? { ...f, status: 'error', result: { error: errorMsg } } : f
        ))
        toast.error(`Erreur : ${fileEntry.name}`)
      }

      setProgress(Math.round(((i + 1) / totalFiles) * 100))
    }

    setResults(prev => [...prev, ...newResults])
    setProcessing(false)
    emitDataUpdated({ source: 'upload', processed: newResults.length, total: totalFiles })
    toast.success(`${newResults.length}/${totalFiles} document(s) traité(s)`)
  }, [files, checkBackendHealth])

  const retryFailedFiles = useCallback(() => {
    let retried = 0
    setFiles(prev => prev.map((f) => {
      if (f.status === 'error') {
        retried += 1
        return { ...f, status: 'pending', result: null }
      }
      return f
    }))

    if (retried === 0) {
      toast('Aucun fichier en erreur a relancer')
      return
    }

    toast.success(`${retried} fichier(s) remis en attente`)
  }, [])

  const reset = useCallback(() => {
    setFiles([])
    setResults([])
    setProgress(0)
  }, [])

  return (
    <UploadContext.Provider value={{
      files,
      addFiles,
      removeFile,
      processFiles,
      retryFailedFiles,
      processing,
      progress,
      results,
      reset,
      backendAvailable,
      backendHealth,
      lastCheckedAt,
      checkBackendHealth,
    }}>
      {children}
    </UploadContext.Provider>
  )
}

export function useUploadContext() {
  const ctx = useContext(UploadContext)
  if (!ctx) throw new Error('useUploadContext must be used within UploadProvider')
  return ctx
}
