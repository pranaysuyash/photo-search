# Release Playbook (Intent‑First)

A step‑by‑step guide for cutting dependable releases with clear user value.

## 0) Prep
- Update ROADMAP and TODO with what’s landing.
- Ensure acceptance criteria met and linked in PRs.
- Update docs: LANDING_MEDIA_AND_GROWTH_NOTES (assets/links), ELECTRON_UPDATES_AND_UPGRADES (policy).

## 1) Versioning
- SemVer: bump MINOR for features, PATCH for fixes, MAJOR for paid upgrade.
- Update app versions (Electron/package.json, API if needed).

## 2) Notes
- Write concise release notes: what users can do now (outcome‑first), known issues, upgrade guidance.
- Update CHANGELOG.md with technical details.

## 3) Build & Sign
- CI: build macOS (DMG/ZIP, notarize & staple) and Windows (NSIS, code‑sign).
- Generate SHA256 checksums and attach to artifacts.

## 4) Publish Feed
- Stable channel: upload artifacts to GitHub Releases (or S3) and update appcast/feed.
- Beta channel (optional): pre‑release tag and separate feed.
- Keep previous version available for rollback.

## 5) Landing & Docs
- Swap download URLs in landing/index.html.
- Ensure OG/Twitter cards reflect current visuals.
- Verify Pricing/FAQ copy matches release (features/tiers).

## 6) Smoke Test
- Fresh install on macOS + Windows VMs.
- Auto‑update from previous version (1 step back) to latest.
- Index small library and run 3 search scenarios.

## 7) Announce (Optional)
- Post brief update to mailing list or social (privacy-first; no tracking in app).

## 8) Post‑Release
- Monitor issues; prepare hotfix if needed.
- Tag TODO items that rolled over; update ROADMAP.

## Major Upgrade (v2)
- Freeze v1 feed to 1.x; publish v2 on a new feed.
- Add in‑app “v2 available” banner with Upgrade CTA (no forced update).
- Offer upgrade coupons and new license flow (see ELECTRON_UPDATES_AND_UPGRADES.md).
