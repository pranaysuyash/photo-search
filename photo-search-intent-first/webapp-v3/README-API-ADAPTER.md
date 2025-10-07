# API Adapter and Env Usage

The v3 webapp can talk to the existing v1 backend via a frontend adapter.

Env flags (set in .env.local or shell):

- VITE_API_MODE=v1 | refactor
  - v1 (default) uses the v1 adapter in `src/services/api_v1_adapter.ts`
  - refactor uses the native client in `src/services/api.ts`
- VITE_API_BASE=/api or a full URL
  - Overrides the base URL for the backend (useful when backend is on a different host)

Imports remain stable: use `import { apiClient } from '@/services/api'`.

The adapter normalizes shapes for:

- LibraryResponse: `{ paths: string[], total, offset, limit }`
- SearchResponse: `{ results: { path, score }[], total, query }`

Electron note: thumbnails and photos use `file://` URLs when running in Electron to support offline access.

## Branding

Optionally customize the logo shown in the top bar via an environment flag:

- `VITE_BRAND_LOGO` — Path or URL to an image. If not provided, the app will try `/generated/asset_0.png` which you can create using `scripts/gen_brand_assets.sh`. Place images under `webapp-v3/public/generated/` for static serving.
