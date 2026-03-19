import { Router } from 'express'
import axios from 'axios'

const router = Router()

const STORAGE_API_URL = process.env.STORAGE_API_URL || 'http://storage-api:5003'
const STORAGE_API_KEY = process.env.STORAGE_API_KEY || ''

function storageHeaders() {
  return STORAGE_API_KEY
    ? { 'X-API-Key': STORAGE_API_KEY }
    : {}
}

router.get('/health', async (req, res) => {
  try {
    const response = await axios.get(`${STORAGE_API_URL}/api/storage/health`, {
      timeout: 10000,
      headers: storageHeaders(),
    })
    res.json(response.data)
  } catch (err) {
    const message = err.response?.data || { error: err.message }
    res.status(err.response?.status || 502).json(message)
  }
})

router.get('/stats', async (req, res) => {
  try {
    const response = await axios.get(`${STORAGE_API_URL}/api/storage/stats`, {
      timeout: 15000,
      headers: storageHeaders(),
    })
    res.json(response.data)
  } catch (err) {
    const message = err.response?.data || { error: err.message }
    res.status(err.response?.status || 502).json(message)
  }
})

export default router
