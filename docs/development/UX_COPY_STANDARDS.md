# UX Copy Standards (Intent‑First)

Principles to keep copy outcome‑focused, consistent, and privacy‑first.

## Tone & Voice
- Friendly, direct, helpful. Emphasize outcomes (“Find that moment”) not raw features.
- Avoid jargon where possible; explain model/provider choices in plain language.

## Key Areas
- Onboarding: “Choose your photo folder. We’ll build a private index on your device.”
- Engine selector: “On‑device (Recommended) — private, offline. Cloud engines (optional) may send data to your chosen provider.”
- Errors: Short, actionable guidance. If a provider fails, offer a quick fallback to local.
- Privacy: “Photos never leave your device by default.” Mention session‑only keys when applicable.
- Buttons: Clear verbs (“Build Index”, “Search”, “Prepare Faster Search”, “Export”).

## Consistency
- Provider labels: On‑device (Recommended), On‑device (Compatible), Hugging Face (CLIP), Hugging Face (Caption), OpenAI (Captions).
- Features: “Smart albums” (not variations), “Favorites”, “Collections”, “People”.
- Units: Use seconds/minutes for user‑visible operations; avoid ML internals in primary flows.

## Microcopy Examples
- Empty state (Search): “Type a description like ‘friends on the beach at sunset’.”
- Empty state (Build): “Click Build to index your folder. You can continue using your computer.”
- Fast index prepared: “FAISS ready. Searches over large libraries are now instant.”
- OCR built: “Text from images will improve search accuracy. You can add more languages later.”

## Accessibility
- Alt text for screenshots; aria‑labels for icon‑only buttons.
- Dark/light mode copy contrast verified; avoid color‑only indicators.

## Release Notes Style
- Lead with what users can do now, not internal changes.
- Group under: Search, Organize, Speed, Privacy, Fixes.
