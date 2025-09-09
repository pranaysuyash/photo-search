# Landing Page Review & Recommendations

Scope: Evaluate `landing/index.html` for clarity, trust, and conversion; propose concise improvements.

## What Works
- Clear value prop: “Find any photo fast — just describe it. Private, local‑first.”
- Simple navigation and CTA to web demo.
- Feature highlights with plain language (local-first, fast results, power tools).
- Pricing section placeholder with Gumroad/Razorpay stubs and legal links (TOS/Privacy/Refunds).

## Gaps Impacting Conversion
- Social proof: No testimonials, quotes, or logos to build trust.
- Visuals: Missing real product screenshots and a short hero video demo.
- Proof & transparency: No “How it works” visual for local indexing; missing performance claim (fast index options) with tangible numbers.
- OS clarity: No platform badges or minimum specs; no “Works offline” badge.
- Pricing clarity: No tier comparison, inclusions, or refund window; no regional pricing note.
- Lead capture: No email subscription for updates or early access.
- FAQ: Lacks answers on privacy (local-only), model downloads, indexing time, OCR/faces, and refunds.

## Recommended Changes (MVP)
1) Add visuals
- Replace the hero placeholder with a real 30–60s video and 3–4 screenshots (Build, Search, People, Map).

2) Add a proof section
- “How it works (Local-first)” mini diagram: Photos → Local embeddings/OCR/EXIF → Private index → Fast search (FAISS/Annoy/HNSW).
- Short performance note (e.g., “10k photos indexed in ~N minutes on M1/M2”).

3) Clarify pricing
- Add a two-column comparison (Local vs AI add-ons), with inclusions and a 14‑day refund note.
- Add OS badges (macOS/Windows) and “works offline.”

4) Add trust elements
- 2–3 testimonial quotes (initial users or friendly beta feedback).
- Privacy bullet: “Photos never leave your device unless you opt into a cloud engine.”

5) Add email capture
- Simple form (Buttondown/ConvertKit) above the footer: “Get updates and early access deals.”

6) Add FAQ
- Topics: Privacy & data flow, offline use, model sizes, indexing time, supported formats, OCR languages, faces privacy, refunds.

## Suggested Copy Snippets
- Badge strip: “Private by default • Works offline • macOS/Windows • No subscription (local)”
- CTA buttons: “Download for macOS”, “Download for Windows”, “Try Web Demo”, “Buy Local License”

## Implementation Notes
- Keep Tailwind CDN for simplicity; replace placeholder links with real Gumroad product and download URLs.
- Consider adding Plausible/Umami for privacy-respecting analytics.

