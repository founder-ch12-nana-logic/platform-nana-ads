# CH12 Nana Ads Tracking Platform

Initial tracking layer for Nana/CH12 ad attribution and event routing.

## Scope

- Frontend tracker file: `public/ch12-ads-tracker.js`
- Event API worker: `worker/src/index.js`
- OpenAPI contract: `openapi.yaml`
- CI deploy workflow: `.github/workflows/deploy-cloudflare-worker.yml`

## Tracked Events

- page_view
- view_bos_world
- view_lab_world
- view_nana_world
- view_forge_world
- open_chatbot
- start_chat
- submit_lead
- request_app_blueprint
- request_app_export
- select_plan
- start_checkout
- purchase
- subscription_start

## Architecture

1. Browser tracker sends each event to Cloudflare Zaraz (`window.zaraz.track`) and to CH12 Event API (`/v1/events`).
2. Worker validates events and returns `202 Accepted`.
3. Worker forwards event copies to destinations when configured:
   - CH12 internal webhook
   - Meta Conversion API
   - TikTok Events API
   - GA4 Measurement Protocol

## Security Model

- No ad platform secrets are present in frontend code.
- Secrets must only be set as Cloudflare Worker secrets/environment values.
- Required sensitive values should be configured via:
  - `wrangler secret put CH12_INTERNAL_WEBHOOK_BEARER`
  - `wrangler secret put META_ACCESS_TOKEN`
  - `wrangler secret put TIKTOK_ACCESS_TOKEN`
  - `wrangler secret put GA4_API_SECRET`

Optional non-secret env values:

- `CH12_INTERNAL_WEBHOOK_URL`
- `META_PIXEL_ID`
- `TIKTOK_PIXEL_CODE`
- `GA4_MEASUREMENT_ID`
- `CORS_ALLOW_ORIGIN`

## Local Usage

Install dependencies:

```bash
npm install
```

Run worker locally:

```bash
npm run worker:dev
```

Run security check:

```bash
npm run security:check
```

## CI/CD

Deployment workflow is in `.github/workflows/deploy-cloudflare-worker.yml` and deploys from branch `ch12-ads-tracking-init`.

Required GitHub repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
