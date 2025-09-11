Authentication and Tokens

Overview
- The API supports an optional bearer token for write/mutate operations (POST/PUT/PATCH/DELETE). When enabled, requests must include `Authorization: Bearer <token>`.
- Read-only GET endpoints (and static assets) remain accessible without a token.

Development (default: no auth)
- Local development is frictionless by default: auth is disabled via `DEV_NO_AUTH=1`.
- To re-enable auth locally for testing, set `DEV_NO_AUTH=0` (or unset it) and set a token:
  - Backend: `API_TOKEN=dev123`
  - Frontend: `VITE_API_TOKEN=dev123` (in `photo-search-intent-first/webapp/.env`) or `localStorage.setItem('api_token','dev123')`

Production (enable auth)
- Set a strong token and ensure `DEV_NO_AUTH` is not set:
  - `API_TOKEN=<long-random-value>`
  - Do NOT set `DEV_NO_AUTH`. Ensure your process manager/env does not include this variable.
- The deployed webapp must send the same token:
  - If serving a built UI from the API (`/app`), set `VITE_API_TOKEN` at build time before `npm run build`.
  - If hosting the UI separately, configure the UI env or reverse proxy to attach `Authorization: Bearer <token>` for write requests.

Endpoints for diagnostics
- `GET /auth/status` → `{ auth_required: boolean }`
- `POST /auth/check` → returns 200 only if the current token is accepted

Header format
- `Authorization: Bearer <token>`

Security notes
- The token is a shared-secret bearer token; use HTTPS in production to prevent interception.
- Prefer setting the token via environment variables or secrets management, not committing to source.
- If you deploy behind a reverse proxy (nginx, Caddy), you can inject the header for trusted frontends and withhold from untrusted origins.

Quick recipes
- No-auth dev (default):
  - `.env`: `DEV_NO_AUTH=1`
  - Start API: `uvicorn photo-search-intent-first.api.server:app --reload --port 8000`
  - Start webapp: `npm --prefix photo-search-intent-first/webapp run dev`

- Auth-enabled dev:
  - `.env`: `DEV_NO_AUTH=0`, `API_TOKEN=dev123`
  - `photo-search-intent-first/webapp/.env`: `VITE_API_TOKEN=dev123`
  - Restart both servers

- Production (token required):
  - Set environment: `API_TOKEN=<strong-token>` (no DEV_NO_AUTH)
  - Build UI (optional): `npm --prefix photo-search-intent-first/webapp run build`
  - Serve API behind TLS; ensure the UI includes the header on write calls

