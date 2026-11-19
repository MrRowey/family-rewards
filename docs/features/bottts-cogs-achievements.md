# Bottts Robot Workshop, Cogs and Achievements — V1 follow-up feature

Status: **Proposed / not implemented**. Separate from the release-blocking V1 stabilisation work and V2 remote-access architecture.

## Goal
Add a second, cosmetic-only progression system to Family Rewards. **Stars** remain exclusively for parent-configured real-world rewards. **Cogs** are earned from achievements and spent on cosmetic options for a child's **DiceBear Bottts** avatar. An achievement may instead unlock a cosmetic directly.

## User experience
- Child kiosk: display Stars and Cogs separately; open a touch-friendly **Robot Workshop**; preview, buy, equip and unequip owned cosmetics; show achievement progress and earned rewards.
- Starter avatar: Bottts, with the full character visible and a curated set of free starter options. Do not assume every Bottts option or an arbitrary “full cast” preset exists; inspect the installed DiceBear version and its actual schema before building the catalogue.
- Parent dashboard: manage achievement eligibility and rewards; optionally configure Cog amounts and cosmetic unlocks. No direct access to child purchase endpoints without a valid scoped child/kiosk session.
- Achievements: first approved chore, N approved chores, scheduled-task milestones and parent-defined challenges are examples, not yet final product rules. Make eligibility and time-zone boundaries explicit.
- Child-friendly UX: locked items show requirements, clear balance/price, confirmation before purchase, accessible feedback, no purchases using Stars.

## Security and accounting invariants
1. Stars and Cogs are independent; existing Star approval, claim and refund logic must remain unchanged.
2. All Cog grants and spends happen server-side inside database transactions; no client-supplied balance, price or achievement-complete flag is trusted.
3. Maintain immutable Cog ledger entries (award, purchase, adjustment/refund) with idempotency keys and references to the achievement or cosmetic purchase.
4. Prevent duplicate achievement awards, duplicate purchases, overspending and negative Cog balances under concurrent requests.
5. Award only on **approved** qualifying completions; resubmission or repeated approval must not re-award an achievement. Define repeatable achievements explicitly if supported.
6. Parent changes to achievement definitions must not silently revoke already-owned cosmetics or retroactively mint Cogs without an explicit policy.
7. Validate cosmetic category and option against an allowlisted catalogue generated for the installed Bottts version; don't trust arbitrary avatar options or remote URLs.
8. Save avatar configuration and cosmetic entitlements in PostgreSQL. Render DiceBear locally where practical; do not make an external DiceBear API mandatory.
9. Avoid exposing cross-child history or enabling a child to purchase/equip for another child; enforce kiosk/parent auth per API endpoint.
10. Plan reversible schema migrations and backups for existing self-hosted installations.

## Suggested data model (design, not committed schema)
- `Child.cogsBalance` integer default 0 (or derive from ledger with a cached balance maintained transactionally).
- `CogTransaction`: id, childId, delta, reason, sourceType, sourceId, idempotencyKey (unique), createdAt.
- `CosmeticDefinition`: stable id, Bottts category, validated option key, priceCogs, unlockRule, enabled, catalogueVersion.
- `ChildCosmetic`: childId, cosmeticId, acquiredAt, acquisitionSource; unique (childId, cosmeticId).
- `ChildAvatarConfiguration`: childId unique, Bottts seed and equipped option IDs / validated config JSON.
- `AchievementDefinition`: id, trigger type, target, rewardCogs or cosmeticId, repeatability, enabled.
- `ChildAchievement`: childId, achievementId, progress, earnedAt, grant key; unique per one-time achievement.
- Keep existing Star records and rewards unchanged; add migrations, never reset child data.

## Suggested API boundaries (exact routes subject to audit)
- GET child-scoped cosmetic catalogue, inventory, Cog balance, achievements and progress.
- POST purchase cosmetic; POST equip cosmetic. Both require valid child/kiosk or parent authorisation and server-side ownership checks.
- Parent-only CRUD for achievement definitions and optional Cog adjustments.
- Achievement evaluation invoked from existing approved-completion domain transaction or a reliable outbox/job with idempotent grant processing.
- Never expose an unauthenticated public PATCH/DELETE route for balances, grants, approvals or configuration.

## Implementation PR breakdown (after V1 baseline)
1. **Bottts catalogue and starter avatar** — confirm installed DiceBear options; catalogue tests; local rendering; default free cosmetics.
2. **Cogs and purchase ledger** — schema migrations, transactional earn/spend and inventory; concurrency/idempotency tests.
3. **Achievement engine** — approved-chore triggers, progress and one-time grants; test resubmissions and duplicate approvals.
4. **Robot Workshop UI** — responsive touch-first previews, locked/owned/equipped states, feedback.
5. **Parent configuration and E2E** — parent controls and full integration regression tests.

## Acceptance criteria
- Existing Stars and real-world rewards work unchanged.
- A newly created child gets a valid Bottts avatar and starter options without needing internet access.
- Cogs are granted only by verified achievement logic and cannot be spent twice.
- Cosmetics can be purchased once, remain owned after restart and only equip when owned.
- No achievement can be repeatedly claimed unless configured as repeatable.
- Child A cannot view or modify Child B's private transactions or avatar inventory.
- Child kiosk works on portrait/landscape touchscreens.
- Existing installations migrate without losing children, Stars, rewards or approvals.
- Automated unit, integration and Docker build tests pass before merging.

## Release boundary
This PR is **planning-only** and does not change runtime behaviour. Do not merge this feature into the first stable V1 release until the core chore/reward flow and security work are verified.
