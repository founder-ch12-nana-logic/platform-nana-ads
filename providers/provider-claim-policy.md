# Provider Claim Policy

## Scope
The provider ecosystem registry and website copy are informational only.

## Claim restrictions
- Do not imply endorsement, sponsorship, certification, or partnership.
- Do not claim official partnerships unless explicit evidence is recorded.
- Official partner status requires a documented `evidence_ref` in the registry.

## Status model
Provider status must be one of:
- `candidate`
- `tool_in_use`
- `integration_planned`
- `approved_for_public_mention`
- `official_partner`
- `retired`

Default status must be `candidate` or `tool_in_use`.

## Logo usage restrictions
- Third-party logos must not be used unless `logo_usage_approved: true`.
- If `logo_usage_approved` is false, use text-only provider cards.
