# Family Rewards — Avatar & Progression System

Status: **Approved product specification; implementation in stages.** This document supersedes the Bottts-only/Cogs-only proposal. Related implementation PR: #25. This planning PR: #30. No runtime behaviour is changed by this document.

## Core loop
A parent approves a chore -> the existing Stars award remains for real-world rewards -> the child receives one random XP grant based on the Stars actually awarded -> XP increases their shared avatar level -> every level crossed awards avatar currency -> the child spends currency on appearance options. Stars and avatar currency are never exchangeable.

## Seven themes and display-only currency labels
| Theme | Currency label |
| --- | --- |
| Sprouts — Animated | Seeds |
| Bottts — Full Cast | Cogs |
| Critters — Animated | Paws |
| Bottts Neutral — Full Cast | Bolts |
| Voxel Bot — Animated | Pixels |
| Planets — Warm System | Orbits |
| Constellations — Animated | Stardust |

One **shared wallet per child** and one **shared XP total and level**. The currency label changes with the active theme; switching does not exchange, grant or reset funds. Verify the exact DiceBear styles, animation support, available schemas and licensing before committing to cosmetic parts; curated local presets or application-owned frames are acceptable where styles lack supported parts. Do not assume all names correspond to packages in the installed @dicebear/styles version.

## Age and access
- Child under 8: choose an initial theme; cannot independently switch themes thereafter. Parent can switch with verified PIN and an authenticated parent session.
- Child 8 or older: may switch themes independently, without charge.
- Use the saved DOB to determine age at request time; validate server-side on **every** theme-changing route, including kiosk and child APIs. Existing profile defaults and legacy avatar modes require a compatibility/migration strategy.
- Parent-only changes must verify server-side PIN/session. Child identity must be scoped to an authenticated kiosk session, never just a client-supplied childId. Do not expose arbitrary cross-child updates.

## XP calculation and level curve
- Default XP for an approved chore with S awarded Stars: a single cryptographically secure uniformly random **integer** in inclusive [5*S, 8*S]. Both positive multipliers are configurable in Parent Settings, minimum <= maximum, with bounded server-side validation.
- Use the **Stars award snapshot at approval**, not a mutable task price; XP is awarded exactly once per approval transition. Pending/declined chores award no XP.
- Suggested baseline XP to go from level L to L+1: for 1 <= L <= 9, 50 + 15*(L-1); at L=10, 200; for L >= 10, 200 + 30*(L-10) + 5*(L-10)*(L-11)/2. This yields L=15: 350, L=20: 550, L=30: 1100, L=40: 2150, L=50: 3700. **The earlier illustrative 40/50 figures differed; use one verified implementation formula and tune via tests before release.** No maximum level; avoid integer overflow and ensure bounded calculations.
- Store cumulative earned/adjusted XP as the source of truth and derive the current level and progress from the versioned curve. Existing earned entitlements must not be silently re-awarded after curve changes.
- Every level-up awards **25 shared currency** by default (parent-configurable for future awards). Every tenth level also grants **bonus currency and an exclusive cosmetic**. Exact bonus amount and catalogue identity to be selected during balancing; use a versioned milestone policy.
- No minimum level requirement for purchasing ordinary Workshop items. Achievements can separately grant exclusive badges/cosmetics.

## Reversals and accounting
- Reversing an approved chore reverses its Stars according to the existing domain policy, records a compensating XP ledger entry, recalculates the level and reconciles previously granted level currency.
- Do not re-roll XP on retries or reversal/reapproval. Define reapproval as a new explicit approval event with its own unique key only if the existing completion lifecycle supports it.
- Preserve already purchased cosmetics. If revoked rewards exceed available currency, track **non-spendable debt** separately; future earnings settle debt before increasing spendable funds. No negative spendable wallet and no silent removal of ownership.
- Do not repeatedly grant level/milestone rewards when XP crosses the same level again following a reversal. Track milestone entitlements and reversals with durable source keys; exclusive awarded cosmetics remain owned unless parents explicitly choose a separate revocation policy.
- XP, currency and Star mutations must be atomic with the existing approval/reversal transaction, or use a durable transactional outbox with idempotent consumers. No partial success.
- All grant/spend/compensation operations use an immutable ledger, unique idempotency keys, transactional balances, server-side prices and serialisable/row-locked purchase safety. Child A cannot inspect or mutate child B's records.

## Child UX
- Touch-first avatar onboarding with free starter options and locally rendered avatar previews.
- Avatar level, progress bar, XP gain feedback, currency name and balance, milestone celebration and achievement badges.
- Workshop supports theme-specific catalogues, previews, purchases, owned/equipped states, and confirmation; no paid services or mandatory network avatar rendering.
- Owned items persist through theme switches, restarts, upgrades and migrations. Reduced-motion and age-adaptive Junior/Explorer/Teen presentation must be respected.

## Parent UX
- Parent Settings: configurable minimum/maximum XP multipliers, currency per level, milestone bonus policy, cosmetic availability and achievement definitions.
- Parent PIN-gated theme changes for children under 8; parent adjustments recorded in audit log.
- Settings changes apply prospectively; previously recorded XP awards and purchase prices are not recomputed without explicit audited migration.

## Suggested implementation data boundaries (final Prisma schema subject to code audit)
- Per-child progress aggregate: cumulative XP and level projection (if cached), spendable currency and debt.
- Immutable XP ledger: childId, signed delta, approval/completion reference, settings snapshot, event idempotency key.
- Immutable currency ledger: childId, signed delta, reason, source milestone/level/purchase/reversal, unique idempotency key.
- Avatar style/preset catalogue, cosmetic definitions and version, child inventory and equipped configuration.
- Level/milestone award entitlement with unique (childId, level, reward type, policy version) to prevent replay.
- Achievement definition and child achievement records with repeatability policy.
- Do not reset or reinterpret existing Stars, completions, child DOB, or reward records.

## Implementation stages
1. **PR #25 avatar foundation**: inspect current child avatar routes and theme defaults; fix authorization, PIN/session handling and atomic audit; add verified style registry, age-gated switching, initial selection and migration compatibility.
2. **PR #30 specification**: maintain this document as the source of truth; PR #30 is planning-only and does not implement the feature.
3. **XP engine**: introduce schema/migration, approval-time XP snapshot, random roll and immutable ledger; test retry, duplicate approval and reversal.
4. **Level engine**: deterministic versioned curve, progress display, 25-currency grants and one-time milestone rewards.
5. **Wallet and Workshop**: ledger, debt handling, catalogue, purchase/equip APIs, scoped permissions, local rendering.
6. **Achievements and Parent Settings**: configuration and audits, badge/cosmetic rewards, milestone controls.
7. **Integration and release**: transactional E2E tests, concurrency tests, migration backup/restore, Docker build, touchscreen/reduced-motion checks.

## Release gates and technical verification
- Audit actual approval and reversal routes before wiring grants; determine how reapproval works and what happens if Stars were spent.
- Verify the seven DiceBear style IDs and capabilities against installed packages and licences; verify whether animation works offline and with reduced motion.
- Audit current child/kiosk auth, parent PIN verification, age calculation and whether DOB is populated for legacy profiles.
- Decide milestone bonus amount and exact exclusive cosmetic assets; verify the XP curve against representative chore volumes and existing Star values.
- Back up PostgreSQL before migrations; test upgrades on existing self-hosted data and preserve all Stars and purchases.
- Unit/integration tests cover first-time creation, theme restrictions, XP snapshots, reversal, replay, level crossing, wallet debt, double purchase and cross-child access.
- Do not merge the feature into a stable release until the core chores/rewards flow and security work are verified.
