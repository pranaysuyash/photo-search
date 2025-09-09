# Landing Page Rollup — Existing, Findings, Pending (Intent‑First)

## Existing (Current State)
- Value prop and structure: Modern hero, demo, features, screenshots, how‑it‑works, testimonials, pricing, FAQ, footer links.
- SEO/Sharing: Absolute OpenGraph/Twitter URLs and canonical tag set.
  - `landing/index.html:20`, `landing/index.html:40`
- JSON‑LD: `SoftwareApplication` metadata present.
  - `landing/index.html:41`
- Accessibility: "Skip to content" link added.
  - `landing/index.html:88`
- Demo links: Header + hero link to built modern UI.
  - `landing/index.html:135`, `landing/index.html:243`
- Header CTAs: Modern UI (intent‑first) and Classic UI entries wired.
  - `landing/index.html:137`, `landing/index.html:142`
- Trust strip: Includes "No subscription (Local)".
  - `landing/index.html:308`
- Feature accuracy tightened:
  - People: “People (local engine)” — `landing/index.html:358`
  - Map: “Map (Timeline coming soon)” — `landing/index.html:368`
  - Smart org: “…duplicate detection (coming soon)” — `landing/index.html:380`
- Roadmap section added (Editing, Backup & Sync, Mobile & PWA).
  - `landing/index.html:392`
- Demo video section (placeholder assets) + screenshots grid (placeholders).
  - `landing/index.html:300`, `landing/index.html:454`
- Pricing tiers and refund note (No refunds) aligned with Terms.
  - `landing/index.html:627`, `landing/tos.html:24`, `landing/refunds.html:11–20`
  - Pricing bullet aligned (duplicate detection marked coming soon): `landing/index.html:584`
- Email capture wired (Formspree) with honeypot and source tag.
  - `landing/index.html:646`
- API UI hosting context: API mounts built UI at `/app` and `/assets`; root redirects to `/app/`.
  - `photo-search-intent-first/api/server.py:44`, `photo-search-intent-first/api/server.py:48`, `photo-search-intent-first/api/server.py:51`

## Findings (Gaps/Mismatches)
- Refunds policy: All pages aligned to “No refunds” (except where required by law).
  - `landing/index.html:627–629`, `landing/refunds.html`, `landing/tos.html:24–27`
- OG/Twitter domain placeholders: `yourdomain.com` must be replaced with real domain; prefer PNG/JPG (1200×630) instead of SVG.
  - `landing/index.html:20–38`
- “de‑dupe” phrasing softened in How‑it‑works.
  - `landing/index.html:520`
- Classic UI link points to dev index; for prod, consider a built/static path or hide until packaged.
  - `landing/index.html:142`
- Download/Buy links are placeholders and should be swapped for real artifacts.
  - `landing/index.html:190–214`, `landing/index.html:620–667`
- Privacy page lacks optional analytics disclosure if Plausible/Umami is later added to landing only.
  - `landing/privacy.html:12`
- Brand naming inconsistency across docs (Photo Search vs PhotoVault) — align externally visible name.
  - `photo-search-intent-first/FEATURE_AUDIT_AND_ROADMAP.md:1`, `photo-search-intent-first/photo-app-master-features.md:1`

## Pending (Prioritized Tasks)
- Critical
  - Align refund policy (choose 14‑day per pricing, or update copy consistently).
    - Edit either `landing/refunds.html:12` or `landing/index.html:631`.
  - Replace OG/Twitter domain and image with final URLs (PNG/JPG, 1200×630).
    - `landing/index.html:20–38`
- High
  - Swap hero video and screenshots placeholders with real media.
    - `landing/assets/hero.mp4`, `landing/assets/hero_poster.*`, `landing/assets/s1..s3.*`
  - Set real download URLs and purchase links.
    - `landing/index.html:190–214`, `landing/index.html:620–667`
  - Update How‑it‑works copy to “duplicate cleanup (coming soon)” or remove until available.
    - `landing/index.html:517`
  - Decide Classic UI strategy: link to packaged build, keep dev‑only link, or hide.
    - `landing/index.html:142`
- Medium
  - Add FAQ entries: indexing time, supported formats, model sizes, offline behavior, key storage.
    - `landing/index.html:668+`
  - Optional: Add Plausible to landing only; note in privacy.
    - `landing/index.html:<head>`, `landing/privacy.html:12`
  - Standardize external brand naming (landing, docs, app UI) — “Photo Search” vs “PhotoVault”.
- Nice to have
  - Add “What’s new”/Changelog link once shipping cadence starts.
  - Add platform minimum specs and local model size guidance in FAQ.

## Copy Snippets (Ready to Use)
- Hero subline (intent‑first): “Local‑first photo search with AI. No subscription for local. Type friends on the beach at sunset and get it instantly — no scrolling.”
- Smart organization (until ready): “Favorites, tags, saved searches, smart albums, duplicate detection (coming soon).”
- Refund note: “14‑day refund. Regional pricing supported. Keys are used only if you opt into AI add‑ons.”
- FAQ additions:
  - “How long does indexing take?” — “On a modern laptop, 10k photos typically index in N–M minutes. You can keep working while it runs.”
  - “Do you store my keys?” — “Keys are session‑only by default. You can opt to save them locally and change this anytime in Settings.”
  - “What formats are supported?” — “JPEG, PNG, WebP, TIFF with EXIF; RAW/video are planned.”

## Cross‑References (Context)
- Intent‑first audits and roadmaps (scope and future claims):
  - `photo-search-intent-first/FEATURE_AUDIT_AND_ROADMAP.md:1`
  - `docs/intent-first/INTENT_FIRST_FEATURE_AUDIT.md:1`
  - `photo-search-intent-first/photo-app-master-features.md:1`
  - `photo-search-intent-first/ISSUES.md:1`
  - `TODO.md:1`
- API/UI hosting behavior (for linking decisions):
  - `photo-search-intent-first/api/server.py:44`, `photo-search-intent-first/api/server.py:48`, `photo-search-intent-first/api/server.py:51`

## Notes
- Keep privacy promise explicit on landing and in‑app Help. Optional analytics must be landing‑only and disclosed.
- When installers are published, prefer `/app/` on the same origin where the API serves the UI (per `server.py`). For static hosting, keep relative links as currently wired.
