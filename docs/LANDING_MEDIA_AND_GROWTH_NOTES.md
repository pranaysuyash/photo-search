# Landing Page – Media & (Optional) Growth Notes

This note documents how to swap the demo video and screenshots, and outlines optional, privacy‑respecting ways to add email capture and basic analytics later. Nothing here is required for the local app to function.

## Media: Video and Screenshots

- Video player lives in `landing/index.html` under section `#demo`.
  - File path: `landing/assets/hero.mp4` (placeholder – add your real MP4).
  - Poster image: `landing/assets/hero_poster.svg` (replace with a PNG/JPG if desired).
  - Recommended video: MP4 (H.264), 1280×720 or 1920×1080, ≤ 15–30 MB.
  - To change paths, edit the `<source src="...">` and `poster` attributes in the video tag.

- Screenshots grid lives under `#shots`.
  - Placeholder files: `landing/assets/s1.svg`, `landing/assets/s2.svg`, `landing/assets/s3.svg`.
  - Replace with real `PNG/JPG` using same filenames, or update the `src`/`href` attributes in `landing/index.html`.
  - Recommended size: 1200×800 or similar (optimize with `ImageOptim`, `squoosh.app`, or `pngquant`).
  - Add descriptive alt text for accessibility.

- Optional: Host assets on a CDN (S3/CloudFront/R2) and swap URLs to reduce bandwidth on your origin.

## Download & Purchase Links

- Buttons in the hero and pricing sections have placeholder links:
  - `Download for macOS` → set to your DMG/ZIP URL.
  - `Download for Windows` → set to your EXE/MSI ZIP URL.
  - `Buy Local` and `Buy Local + AI` → replace `https://gum.co/your-product` with your real product URLs.
- If using Razorpay, keep it off the landing page initially (Gumroad is simpler). If adding later, wire an order creation endpoint and key.

## Optional: Email Capture (Why/When)

- Why: capture interest from visitors not ready to buy yet; announce new installers, updates, pricing changes.
- When: only if you plan launches/updates and want a minimal feedback loop.
- Providers (privacy‑respecting and simple):
  - Buttondown: copy/paste form; no trackers by default.
  - ConvertKit/MailerLite: popular, but verify privacy settings.
  - Self‑hosted/Zapier/Formspree/Netlify Forms: no JS, form POST → inbox or sheet.

### Minimal Form Example (static POST)

```
<form action="https://formspree.io/f/yourId" method="POST" class="mt-6 flex gap-2">
  <input type="email" name="email" required placeholder="Your email for updates"
         class="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm" />
  <button type="submit" class="px-4 py-2 rounded-md bg-gray-900 text-white text-sm">Notify me</button>
  <input type="hidden" name="source" value="landing" />
  <input type="text" name="_gotcha" style="display:none" />
</form>
```

- Add a one‑line privacy note: “We send occasional updates. Unsubscribe anytime.”
- Keep it on the landing page only; not in the app UI.

## Optional: Analytics (Why/When)

- Why: understand which CTAs convert and where traffic comes from; improve copy/design.
- When: only if you’re iterating on the landing page; not needed for the app’s functionality.
- Tools (privacy‑first):
  - Plausible (no cookies), Umami (self‑hostable). Avoid invasive trackers.

### Minimal Plausible Snippet (add in `<head>`)

```
<script defer data-domain="yourdomain.com" src="https://plausible.io/js/script.js"></script>
```

- Track outbound clicks by adding `data-analytics="cta-download-mac"` or similar and binding a simple `click` event if needed.
- Scope analytics to the landing page only; explicitly state this in Privacy if you add it.

## Optional: YouTube/Loom Embed (instead of local MP4)

- Replace the `<video>` element with a responsive iframe:

```
<div class="aspect-video rounded-lg overflow-hidden border">
  <iframe
    src="https://www.youtube.com/embed/VIDEO_ID"
    title="Photo Search Demo"
    frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowfullscreen
    class="w-full h-full"></iframe>
</div>
```

## SEO & Social (Quick Wins)

- Update `<title>` and `<meta name="description">` (already present). Add OpenGraph/Twitter cards if desired:

```
<meta property="og:title" content="Photo Search – Private, Fast, Intent‑First" />
<meta property="og:description" content="Find any photo fast with natural language. Local‑first privacy." />
<meta property="og:image" content="/landing/assets/hero_poster.png" />
<meta name="twitter:card" content="summary_large_image" />
```

## Launch Checklist

- [ ] Replace hero video (`assets/hero.mp4`) and poster.
- [ ] Replace screenshots (`assets/s1..s3`).
- [ ] Update download links and pricing CTAs.
- [ ] Verify Terms/Privacy/Refunds copy.
- [ ] Optional: add email capture form and provider.
- [ ] Optional: add privacy‑friendly analytics to landing only.
- [ ] Test dark/light mode, mobile/responsive, and alt text.

## Notes

- Keep the privacy promise: no tracking in the app, no uploads by default. If you add optional cloud engines, label clearly.
- If you later add an auto‑updater in the desktop app, the email list becomes less important; keep it minimal regardless.

