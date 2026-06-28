# platform-nana-ads

Private marketing and ads control workspace for Nana Logic.

## Purpose
This repository manages:
- Ads planning
- Provider registry
- Event taxonomy
- Consent policy
- Campaign backlog and lifecycle states
- Budget controls
- Future Cloudflare Zaraz integration plans

## Operating boundaries
- `ads_status`: `planned_not_enabled`
- `tracking_status`: `disabled`
- `zaraz_status`: `not_configured`
- `consent_status`: `required_before_tracking`
- `budget_status`: `zero_spend_until_approved`
- `production_deploy`: `forbidden`

## Hard prohibitions
- Do not deploy.
- Do not change DNS.
- Do not mutate Cloudflare.
- Do not enable Cloudflare Zaraz.
- Do not add live pixels or tracking scripts.
- Do not add Google Ads tags, Meta Pixel, TikTok Pixel, or other live tracking tags.
- Do not add secrets, tokens, passwords, private keys, customer data, or customer secrets.
- Do not auto-merge.
- Do not create production code.
- Do not spend ad budget without approval.
