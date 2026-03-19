import { useCallback, useEffect, useState } from 'react'
import api from '../services/api'

export default function useBackendHealth(pollMs = 10000) {
  const [backendAvailable, setBackendAvailable] = useState(null)
  const [backendHealth, setBackendHealth] = useState(null)
  const [lastCheckedAt, setLastCheckedAt] = useState(null)
  const [consecutiveFailures, setConsecutiveFailures] = useState(0)

  const FAILURE_THRESHOLD = 3

  const checkBackendHealth = useCallback(async () => {
    try {
      const res = await api.get('/health', { timeout: 5000 })
      setBackendAvailable(true)
      setBackendHealth(res?.data || null)
      setConsecutiveFailures(0)
      setLastCheckedAt(Date.now())
      return true
    } catch {
      setConsecutiveFailures((prev) => {
        const next = prev + 1
        if (next >= FAILURE_THRESHOLD) {
          setBackendAvailable(false)
          setBackendHealth(null)
        }
        return next
      })
      setLastCheckedAt(Date.now())
      return false
    }
  }, [])

  useEffect(() => {
    checkBackendHealth()
    const interval = setInterval(checkBackendHealth, pollMs)
    return () => clearInterval(interval)
  }, [checkBackendHealth, pollMs])

  return {
    backendAvailable,
    backendHealth,
    lastCheckedAt,
    consecutiveFailures,
    checkBackendHealth,
  }
}
