# Updates, Auto‑Updates, and Paid Upgrades (Plan)

This document outlines how to ship free minor updates within a major version (v1.x) and offer paid upgrades for new major versions (v2), similar to Affinity’s model.

## Policy
- Minor/patch: v1.1 → v1.9 are free for v1 license holders; delivered via auto‑update or manual download.
- Major upgrade: v2 is a new purchase. Offer upgrade discounts to v1 customers. Maintain critical fixes for v1 for a limited period.

### Maintenance & EOL
- v1 maintenance window: security fixes and critical bugfixes for 6–12 months after v2 launch (decide exact window before v2 GA).
- EOL: after maintenance window, v1 receives no further updates; keep final v1 installers available for re‑download.
- Compatibility: avoid breaking changes in minor versions; call out OS support changes in release notes.

## Auto‑Update (Electron)
- Use `electron-builder` + `electron-updater` for macOS/Windows.
- Hosting options: GitHub Releases (simple), S3/CloudFront (generic provider), or other static hosting that supports blockmap files.
- Targets: macOS `dmg` + `zip` (updater prefers zip), Windows `nsis`.

Minimal main process wiring:
```js
const { app, BrowserWindow } = require('electron')
const { autoUpdater } = require('electron-updater')

app.whenReady().then(() => {
  const win = new BrowserWindow({ /* ... */ })
  autoUpdater.checkForUpdatesAndNotify() // check on launch
  autoUpdater.on('update-available', () => win.webContents.send('update:available'))
  autoUpdater.on('download-progress', (p) => win.webContents.send('update:progress', p.percent))
  autoUpdater.on('update-downloaded', () => win.webContents.send('update:ready'))
})
```

Example publish config in `package.json`:
```json
{
  "build": {
    "appId": "com.photos.search",
    "mac": { "category": "public.app-category.photography", "target": ["dmg","zip"] },
    "win": { "target": "nsis" },
    "publish": [ { "provider": "github", "owner": "yourorg", "repo": "photo-search" } ]
  }
}
```

### Channels & Feeds
- Stable: GitHub “latest” releases.
- Beta (optional): pre‑releases to early adopters.
- Feed separation for majors:
  - v1 apps point to a v1 feed (only 1.x). v2 apps use v2 feed.
  - Alternative: single feed + license‑gated install (see below).

### Security, Signing & Integrity
- macOS: Developer ID signing + notarization required for smooth installs and auto‑updates; staple notarization ticket to DMG/ZIP.
- Windows: Code signing certificate (EV recommended) to reduce SmartScreen warnings; enable differential updates (blockmap) for faster patches.
- Release artifacts: generate SHA256 checksums and attach to releases; verify in CI.
- Rollback: keep last stable available; provide a "Revert to previous version" button that downloads last release.

## Licensing (Offline‑friendly)
- License file is a signed JSON (Ed25519) that the app validates offline.
- Fields: `email`, `purchaseId`, `major`, `issuedAt`, optional `features` (e.g., ["local","ai"]).
- Store file in OS app‑data (e.g., `~/.photo_search/license.json`).
- The app embeds the public key to verify `sig`.

Example payload:
```json
{
  "email": "user@example.com",
  "purchaseId": "gum_123",
  "major": 1,
  "features": ["local","fast","ocr","faces"],
  "issuedAt": 1736112000,
  "sig": "base64-ed25519-sig"
}
```

App logic (pseudo):
```ts
const lic = loadLicense()
const appMajor = getAppMajorVersion() // 1 or 2
if (!lic || lic.major < appMajor) {
  // Block auto‑install of higher major; show upgrade CTA
  showUpgradePrompt({ current: appMajor, license: lic?.major ?? 0 })
} else {
  autoUpdater.checkForUpdatesAndNotify()
}
```

## Distribution Flow
- v1 lifecycle: auto‑update to latest 1.x via v1 feed. When v2 is out, optionally show “v2 available” banner with link to purchase and separate v2 installer download.
- v2 purchase: user buys an upgrade license and downloads new installer. App validates license offline.
- Windows/macOS code‑signing and notarization recommended for smooth installs.

## User Experience for Updates
- In‑app menu: "Check for Updates…" and a dedicated Updates dialog showing current version, channel, and release notes.
- Toast/banners: show "update available" non‑intrusively with Snooze/Install/Release Notes actions; offer auto‑restart after download.
- Deferral: allow users to snooze an update 24h/7d; critical security updates may override deferral.
- Release notes: render markdown from release assets; link to full changelog.

## Beta Program (Optional)
- Opt‑in toggle in Preferences to receive beta builds (separate channel/feed).
- Clear warning: beta builds may be unstable; provide easy switch back to stable.

## Versioning & Releases
- Use SemVer: MAJOR.MINOR.PATCH (1.4.2). Increment MAJOR for breaking changes and paid upgrade, MINOR for features, PATCH for fixes.
- Tag format: `v1.4.2`; CI builds per tag; attach artifacts and checksums; update appcast/feed automatically.
- Changelogs: keep `CHANGELOG.md` curated; include highlights in release notes.

## Privacy
- Auto‑update only fetches version metadata and binaries; no photo data is sent.
- Offline license validation: no telemetry required.

## TODO Checklist
- [ ] Add `electron-updater` to Electron main, with status events.
- [ ] Configure `build.publish` for GitHub Releases (or S3) and test auto‑update.
- [ ] Add “Check for Updates” menu and a simple updates UI in renderer.
- [ ] Implement license validator (Ed25519 public key; JSON file loader; UI to paste/load license).
- [ ] Gate major upgrades: v1 feed separation or license‑gated install.
- [ ] Release process doc: tag → CI build → upload → release notes.
- [ ] Prepare upgrade‑only coupons for v1 buyers in store (Gumroad/Lemon Squeezy/Paddle).
- [ ] Define v1 maintenance window (e.g., 12 months) and document EOL.
- [ ] Add release notes rendering in Updates dialog; link to full changelog.
- [ ] Implement rollback to previous version.
- [ ] Add deferral (Snooze 24h/7d) with a dismissible banner.
- [ ] Mac: notarization workflow in CI; Win: code‑signing in CI.
- [ ] Attach SHA256 checksums to releases; verify on download (optional).

## Notes
- Keep a minimal maintenance branch for v1 (critical fixes only) after v2 ships.
- If you later add cloud‑hosted AI features, keep them strictly optional and clearly labeled.
