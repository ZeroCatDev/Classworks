import FingerprintJS from '@fingerprintjs/fingerprintjs'

let fpPromise

export const loadFingerprint = () => {
  if (!fpPromise) {
    fpPromise = FingerprintJS.load()
  }
  return fpPromise
}

export const getVisitorId = async () => {
  const fp = await loadFingerprint()
  const result = await fp.get()
  return result.visitorId
}

export const getFingerprintData = async () => {
    const fp = await loadFingerprint()
    const result = await fp.get()
    return result
}
