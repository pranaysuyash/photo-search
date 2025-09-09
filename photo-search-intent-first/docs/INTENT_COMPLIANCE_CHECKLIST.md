# Intent‑First Compliance Checklist

This checklist ensures our app, docs, and landing follow the Intent‑First Handbook across development, UX, testing, deployment, and content.

## 1) Development (Investigate Before Acting)
- Element audit: Before removing or “quick‑fixing,” capture original intent, value, and effort (use the Decision Matrix).
- MVP scope: Prefer completing to MVP if user/business value is high and risk is low.
- Decision logs: Document decisions in PRs referencing intent, effort, and acceptance criteria.

## 2) UX (Design for Experience)
- Onboarding: First‑run guides users to “Build → Search” with sample queries; no dead ends; helpful empty states.
- Outcome‑first copy: Emphasize user outcomes (“Find this memory”) over feature lists.
- Privacy clarity: State “Local‑first” in‑app and on landing; explain optional cloud with clear consent.
- Fast feedback: Spinners, progress, and non‑blocking background tasks; undo where reasonable.
- Accessibility: Color contrast, alt text, focus order, keyboard shortcuts.

## 3) Testing (Test What Matters Most)
- Critical flows: Index → Search → Organize (favorites/tags/collections) covered with smoke tests.
- Failure modes: Provider errors, missing deps (FAISS/Annoy/OCR), unreadable images, low disk.
- Security: License validation (if present) and no secret persistence; key usage is session‑only.
- Performance: Time‑to‑first‑result and indexing throughput tracked in diagnostics.

## 4) Deployment (Ship Confidently)
- Release notes: Summaries of user‑visible outcomes; link to changelog.
- Auto‑update: Stable channel; beta optional; rollback path defined.
- Signing: macOS notarization; Windows code signing; checksums attached.

## 5) Content (Write for the Reader)
- Landing page: Clear headline/value, visual proof (video/screenshots), social proof, pricing clarity, FAQs.
- Docs: Short, actionable guides (run, update, privacy data flow, upgrades).
- Messaging consistency: Same engine/provider labels across app, docs, and landing.

## 6) Data & Security (Private by Default)
- Data flow: Local indexing by default; explicit consent for cloud add‑ons; keys never persisted by default.
- Storage: Index under per‑provider namespaces; user‑removable; export/import documented.
- Logs/analytics: None in app; optional privacy‑first analytics only on landing page.

## Sign‑off Gates (per release)
- [ ] Onboarding flow verified end‑to‑end
- [ ] Privacy copy verified in app & landing
- [ ] Critical path smoke tests passing
- [ ] Release notes + version bump ready
- [ ] Notarization/signing OK; checksums attached
- [ ] Rollback path available
