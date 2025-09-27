# Photo Search – Pre‑Launch Distribution & Pricing (Alpha)

## Goals
- Ship local, privacy‑first desktop builds (macOS/Windows) without exposing source.
- Light paywall for early adopters; frictionless offline use.
- Optional AI add‑ons (OpenAI/HF) are opt‑in and clearly labeled.

## Editions (Alpha)
- Trial: free, local features with light limits (e.g., 2k photos, slower batch).
- Supporter License: one‑time purchase unlocks local features; future major upgrades via license `major` field.
- AI Add‑ons: optional — user supplies API keys locally; nothing sent unless explicitly enabled.

## Packaging
- Electron + FastAPI backend.
- Backend bundled via PyInstaller (per‑platform) into `resources/engine/` and spawned by Electron.
- Electron packaged with `asar` and minified bundles; DevTools disabled in production.
- macOS: Developer ID signed + notarized DMG.
- Windows: Code‑signed NSIS installer.

## Licensing (offline)
- License file `license.json` delivered post‑purchase.
- Payload: `{ email, purchaseId, major, features, issuedAt }` + Ed25519 signature.
- Public key baked into the app via `PS_LIC_PUBKEY`.
- In‑app: “Manage License…” (Electron menu) loads the file; verification is offline.
- Trial mode banner + safe limits until license is applied.

## Payments & Delivery
- Use Lemon Squeezy or Gumroad to sell the Supporter License and deliver installers + license file.
- Alternative: Stripe Checkout + email automation that attaches `license.json`.

## Landing Page Flow
- Hero → “Request Access” (email or Typeform), macOS/Windows buttons stay disabled until public release.
- After purchase → email delivers installers + `license.json` with simple instructions.
- Links to Terms and Refund Policy.

## Offline vs AI (Privacy)
- Default: everything local; embeddings, OCR, faces, and search run on device.
- AI Add‑ons: user can enable and paste keys in Settings; keys stored locally (per OS secure storage if available).
- Network: only called when users enable an AI toggle or a feature that states it uses the key.
- Clear in UI: “Local”, “Local + AI (OpenAI/HF)”.

## App Configuration
- Environment variables (dev/debug):
  - `OPENAI_API_KEY`, `HF_API_TOKEN` (optional)
  - `PS_LIC_PUBKEY` for license verification
  - `PS_APPDATA_DIR` to centralize index storage
- In‑app Settings:
  - Watcher: Start/Stop (auto‑starts if available)
  - Excluded Patterns: persisted per folder
  - Models: capability check + pre‑download CLIP
  - Danger Zone: clear folder index / clear centralized data

## Release Checklist
1. Build PyInstaller backends (mac/win); copy into Electron `extraResources`.
2. Package Electron apps (asar on, sourcemaps off, DevTools disabled).
3. Sign and notarize (mac); sign (win).
4. Test trial limits and license unlock.
5. Upload installers to distributor; configure post‑purchase emails with license.
6. Publish landing page with Request Access + Terms/Refunds.

## Support & Updates
- Auto‑updates: configure electron‑updater channels for alpha/beta.
- Collect optional app diagnostics locally; do not transmit without explicit consent.

---

## Appendix – Feature Gating (suggested)
- Trial limits:
  - Index batch size capped, total indexed photos (e.g., 2k), disabled sharing.
- Supporter license unlocks:
  - All local features, fast indexes, sharing.
- AI flags available in Settings, but calls disabled unless keys present.

