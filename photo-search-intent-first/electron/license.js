const fs = require('fs')
const path = require('path')
const { app } = require('electron')

// Public key for Ed25519 signature verification (base64). Replace before GA.
const PUBLIC_KEY_BASE64 = process.env.PS_LIC_PUBKEY || 'PUBLIC_KEY_PLACEHOLDER'

function userLicensePath() {
  try {
    return path.join(app.getPath('userData'), 'license.json')
  } catch { // not in app context (tests)
    return path.join(process.env.HOME || process.cwd(), '.photo_search_license.json')
  }
}

function parseLicense(text) {
  try { return JSON.parse(text) } catch { return null }
}

function verifySignature(lic) {
  try {
    const nacl = require('tweetnacl')
    if (!PUBLIC_KEY_BASE64 || PUBLIC_KEY_BASE64 === 'PUBLIC_KEY_PLACEHOLDER') return false
    const pub = Buffer.from(PUBLIC_KEY_BASE64, 'base64')
    const sig = Buffer.from(String(lic.sig || ''), 'base64')
    const payload = JSON.stringify({
      email: lic.email,
      purchaseId: lic.purchaseId,
      major: lic.major,
      features: lic.features,
      issuedAt: lic.issuedAt
    })
    const msg = Buffer.from(payload, 'utf-8')
    return nacl.sign.detached.verify(msg, sig, pub)
  } catch {
    return false
  }
}

function loadLicense() {
  try {
    const p = userLicensePath()
    if (!fs.existsSync(p)) return null
    const lic = parseLicense(fs.readFileSync(p, 'utf-8'))
    if (!lic) return null
    return lic
  } catch { return null }
}

async function saveAndValidate(text) {
  const lic = parseLicense(text)
  if (!lic) return false
  try { fs.writeFileSync(userLicensePath(), JSON.stringify(lic, null, 2)) } catch {}
  return verifySignature(lic)
}

function licenseAllowsMajor(lic, targetMajor) {
  if (!targetMajor || isNaN(targetMajor)) return true
  const current = parseInt(String((lic && lic.major) || 0), 10)
  return current >= targetMajor
}

module.exports = { loadLicense, saveAndValidate, licenseAllowsMajor }

