let fpPromise

const buildFallbackAgent = (error) => ({
  get: async () => ({
    visitorId: 'unknown',
    error: error?.message || String(error || ''),
    fallback: true,
  }),
})

const loadFingerprintLib = async () => {
  try {
    const mod = await import('@fingerprintjs/fingerprintjs')
    return mod?.default || mod
  } catch (err) {
    console.warn('Fingerprint library blocked or failed to load; using fallback agent.', err)
    return null
  }
}

export const loadFingerprint = () => {
  if (!fpPromise) {
    fpPromise = (async () => {
      const FingerprintJS = await loadFingerprintLib()
      if (!FingerprintJS) return buildFallbackAgent(new Error('fingerprint module unavailable'))

      try {
        return await FingerprintJS.load()
      } catch (err) {
        console.warn('FingerprintJS.load failed, using fallback agent.', err)
        return buildFallbackAgent(err)
      }
    })()
  }
  return fpPromise
}

export const getVisitorId = async () => {
  const fp = await loadFingerprint()
  const result = await fp.get()
  return result?.visitorId || 'unknown'
}

export const getFingerprintData = async () => {
  const fp = await loadFingerprint()
  const result = await fp.get()
  return result
}
