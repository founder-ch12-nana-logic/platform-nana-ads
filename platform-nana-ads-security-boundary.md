# platform-nana-ads Security Boundary

## Repository boundary
This repository stores non-secret policy and registry metadata only.

## Strictly prohibited content
- API keys
- Tokens
- Passwords
- Private keys
- Customer data
- Raw contact identifiers (email/phone) in event payload definitions

## Platform boundary
- No Cloudflare mutation from this repository.
- No DNS changes.
- No deployment actions.
- No live tracking enablement.
