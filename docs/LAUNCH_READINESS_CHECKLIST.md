# Launch Readiness Checklist

Use this to drive v1 launch to completion. It emphasizes outcome-first validation, privacy clarity, and working installers over extras.

## Product Freeze
- [ ] Define v1 scope (features, known omissions) and freeze new features.
- [ ] Triage and fix P0/P1 bugs only.

## Functional QA (Core Flows)
- Build → Search → Organize
  - [ ] Index a folder (≤ 1k photos) on macOS and Windows.
  - [ ] Run 5 natural-language searches; verify top results are sensible.
  - [ ] Favorites, tags (add/remove), saved searches; export CSV.
  - [ ] Duplicate finder: run grouping, compare, and copy selected.
  - [ ] Map: plot GPS photos; verify clustering.
- Workspace & Fast Search
  - [ ] Add multiple folders; run cross-folder search.
  - [ ] Build FAISS/HNSW/Annoy where available; verify diagnostics.
- OCR & EXIF
  - [ ] Build OCR (en); confirm “has text” and quoted matches work.
  - [ ] Build metadata; verify camera/place filters.
- People (if enabled)
  - [ ] Build faces; rename a cluster; filter by person.

## Performance & Stability
- [ ] Baseline indexing throughput on macOS/Windows (sample: 10k mixed JPG/PNG).
- [ ] Time to first result for typical queries (< 300ms with FAISS/HNSW on medium libs).
- [ ] Monitor memory usage during index/search; no leaks or crashes.

## Packaging (Electron)
- [ ] macOS DMG/ZIP builds open; app launches, backend starts automatically.
- [ ] Windows NSIS installer runs; app launches; firewall prompts acceptable.
- [ ] App icons, product name, version displayed correctly.
- [ ] (Optional) Code signing and notarization validated on CI.

## Landing Page
- [ ] Real screenshots and demo video linked (landing/assets/* updated).
- [ ] Download buttons point to real installers (DMG/ZIP/EXE/MSI).
- [ ] Pricing tiers match app capabilities and docs.
- [ ] OG/Twitter cards generate a good preview.
- [ ] Privacy/Terms/Refunds pages reviewed.

## Docs & Support
- [ ] Quickstart: Install, choose folder, build, search, organize.
- [ ] Privacy & data flow: Local-first, optional cloud add-ons, keys usage.
- [ ] Troubleshooting: model downloads, missing deps (FAISS/Annoy/OCR), unreadable files.
- [ ] Support channel (email or issue template) and refund instructions.

## Release Process
- [ ] Release notes (outcome-first) + CHANGELOG entry.
- [ ] Build artifacts uploaded; checksums attached.
- [ ] Final smoke test on clean macOS + Windows VMs, including export operations.

## Post-Launch
- [ ] Monitor issues for 48–72h; prepare hotfix if needed.
- [ ] Collect early feedback; prioritize v1.x fixes over new features.

Notes
- Defer auto-updates and license gating until after v1 if needed. Focus launch on stable installers, clear privacy, and core value delivery.
