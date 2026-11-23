# Family Rewards — Self-hosted architecture and phased roadmap

Status: Proposed · Target branch: `develop` · November 2026

## Product principles (non-negotiable)
- Core functionality works on a local Docker host without an internet connection.
- No mandatory paid services, subscriptions, cloud accounts, hosted authentication, or external relay.
- All family data stays on the household PostgreSQL instance by default; backups and exports belong to the family.
- Remote parent access is optional, off by default, and must not compromise the locally available child kiosk.
- One responsive, touch-first kiosk adapts to actual viewport and orientation (Neat Frame, tablets, other displays), not device-specific code.
- Simple setup for nontechnical households; advanced self-hosters retain control.
- No misleading "one-click works everywhere" promise: CGNAT, firewalls, router limitations and certificate/domain requirements must be detected and explained.

## Target architecture
```text
Household kiosk (LAN, paired device) ----+
                                         +--> Caddy (optional HTTPS ingress)
Parent browser (LAN) --------------------+           |
Parent browser (WAN, opt-in) --> HTTPS --+           v
                                            Next.js Family Rewards
                                            - child kiosk routes
                                            - parent UI
                                            - API + domain services
                                            - parent auth and device permissions
                                                      |
                                               PostgreSQL (private)
```
- Docker Compose core: application + PostgreSQL. Caddy optional/recommended for HTTPS.
- Do not expose PostgreSQL or administration interfaces to the internet.
- No mandatory Authelia, Redis, Cloudflare Tunnel, third-party IdP, or external API.
- Built-in parent accounts, strong password hashing, secure HTTP-only sessions and optional TOTP MFA; OIDC federation (e.g. self-hosted Authelia) is an optional advanced integration.
- Preserve parent PIN only for local step-up confirmation where appropriate; PIN alone must not authenticate internet-facing parent sessions.
- Authorisation enforced server-side for **every** API action; never trust client-provided child IDs or proxy headers without validation.
- Kiosk pairing by an authenticated parent, with revocable device-bound scoped sessions. Selected child must be authorised for the paired family; no kiosk administrative privileges.
- Protect remote routes at the app/API layer even when reverse proxy and TLS are configured.

## Remote-access design and honest constraints
- Settings > Remote Access starts OFF. Enable launches a preflight wizard; enabling the switch alone never means connectivity is live.
- Preflight: verify parent authentication/MFA policy, local TLS/HTTPS configuration, external address and CGNAT likelihood, router/firewall reachability, certificate/hostname, and actual off-LAN connection.
- Preferred paths: (1) free direct HTTPS using a user-controlled hostname and router/firewall configuration; (2) self-hosted WireGuard for private parent access. Router-assisted port mapping via UPnP/NAT-PMP is opt-in, clearly explained, and never silently enabled.
- If a trusted certificate, reachable address, router support or external test is unavailable, show precise status and guided manual steps; do not advertise universal automatic connectivity.
- Do not require a paid domain; document free DNS/hostname options and their dependencies. Certificates and DNS automation must be optional and failure-tolerant.
- Optional external tunnels/relays may be documented as third-party choices, never bundled as required infrastructure.
- Remote scope: parent UI and strictly necessary authenticated APIs only; kiosk stays LAN-only by default. Validate route-level isolation and deep links, not merely navigation visibility.
- Remote access disable must revoke/close remote exposure where managed, while retaining local access. Do not expose insecure HTTP on WAN.

## Phased change plan (each phase: small draft PRs against develop)
### Phase 0 — Existing baseline, audit and security [BLOCKING]
- Review PR #24 kiosk navigation, #25 avatar onboarding, #26 completion-status fix (stacked on #24), #27 avatar security fix (stacked on #25), and #28 approval mutation auth fix.
- Rebase/retarget stacked fixes for integration CI, resolve conflicts, no blind merges.
- Audit all API methods and parent/kiosk authorisation; test anonymous PATCH/PUT/DELETE rejection.
- Verify child creation -> assignment -> completion -> approval -> stars -> reward claim -> approval/decline/refund and stock accounting.
- Add input validation, audit consistency, migration strategy for existing installations, Docker smoke tests.
Exit: CI green; no known critical auth/data-integrity gaps; verified release baseline.

### Phase 1 — Adaptive shared kiosk
- Responsive layouts via CSS grid/container queries, orientation and viewport reflow; 360x800, 600x960, 800x1280, 1024x768, 1920x1080 automated checks.
- Touch targets >=48 CSS px where practical; no hover-only actions; keyboard/accessibility support; reduced motion; avoid clipped modals and horizontal overflow.
- Child picker, chores, pending/done states, rewards, avatars, idle-to-home and offline/error feedback.
- Neat Frame real-device compatibility test (browser and organisational device policy are not assumed).
Exit: portrait/landscape E2E checks, real touch acceptance.

### Phase 2 — Parent identities and kiosk trust
- Built-in parent accounts and password reset/recovery design (no mandatory email service), secure sessions, optional TOTP MFA.
- Scoped roles, rate limiting, CSRF/origin protections, API permissions matrix.
- Parent-authorised kiosk pairing, session rotation/revocation, child selection scope, safe shared-device logout.
- Optional OIDC integration as a later non-default path; ensure no local lockout on IdP outage.
Exit: unauthenticated and cross-child negative tests; session expiry/revocation tests.

### Phase 3 — Optional remote-access manager
- Settings wizard: disabled -> preflight -> configure -> verify externally -> connected/error.
- Optional Caddy deployment profile; HTTPS/TLS, secure headers, no DB exposure.
- Support direct HTTPS and WireGuard guide; optional explicitly consented router automation.
- Detect/report CGNAT, port forwarding, DNS and certificate blockers.
- Remote route/API exposure tests and kill-switch; remote status only after external verification.
Exit: local-only remains functional; compatible-network remote tests; failure-path tests.

### Phase 4 — Parent dashboard
- Mobile approvals inbox for chores/rewards/refunds, activity and audit history, multi-parent support.
- Optional notifications: in-app/polling first, browser push only when compatible and consented; no paid notification provider.
Exit: mobile end-to-end approval from remote authenticated session.

### Phase 5 — Docker and maintenance
- Compose profiles for core/local HTTPS/remote, documented env vars and secrets, container health checks.
- Versioned Prisma migrations with safe baseline/adoption for existing db-push installations; backups before upgrade; restore tests.
- Setup wizard, upgrade/rollback instructions, no secrets committed, no forced cloud signup.
Exit: clean-install and existing-install upgrade/restore smoke tests.

### Phase 6 — Release candidate
- Lint, typecheck, unit and integration tests, production build, Docker Compose config/build/start, migrations, backup/restore.
- Security review, authz matrix, accessibility, viewport/browser testing, physical touch kiosk, WAN disabled/enabled regression.
Exit: release checklist signed off; tagged release only after manual acceptance.

## Proposed PR sequence
1. Existing #24–#28: finish review, integration CI, test and merge only after approval.
2. `feat/kiosk-responsive-layout` — adaptive kiosk and viewport tests.
3. `feat/parent-accounts-sessions` — parent identity and secure session foundation.
4. `feat/kiosk-device-pairing` — scoped kiosk sessions and revocation.
5. `feat/remote-access-preflight` — settings state machine and diagnostics, no automatic port opening.
6. `feat/optional-caddy-https` — HTTPS profile, secure routing, docs.
7. `feat/remote-access-manager` — consent-based setup, verification and disable.
8. `feat/parent-mobile-approvals` — remote-ready mobile workflow.
9. `chore/docker-migrations-backups` — safe deployment and upgrade path.
10. `test/release-e2e-security` — full regression and release gates.

## Acceptance principles
- A family with no WAN connection can install, run and use all chore/reward features.
- No subscription, hosted account or third-party service is required.
- Remote parent access cannot bypass API authorisation; local kiosk never becomes public by accident.
- Turning remote access off does not break local kiosk or parent operation.
- One kiosk UI responds to viewport changes without separate Neat Frame-specific branches.
- A failing router/certificate/CGNAT preflight produces a truthful actionable error, not a false success state.
