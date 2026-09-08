import { getStorageMode, isStorageReady } from '../services/repository.js'

/** Reject API calls when no storage backend is ready. */
export function requireDb(req, res, next) {
  if (isStorageReady()) {
    return next()
  }

  const mode = getStorageMode()
  res.status(503).json({
    error:
      mode === 'none'
        ? 'Database is starting. Wait a few seconds and refresh, or restart the backend (npm run backend).'
        : 'Database is not connected. Check MONGODB_URI or set USE_LOCAL_DB=true in backend/.env.',
    dbConnected: false,
    storageMode: mode,
  })
}
