# PR #25 — Local Review and Data-Safe Upgrade

This checklist is for reviewing the **feature branch** before merging it into `develop`.
Do not run `docker compose down -v`, delete the PostgreSQL volume, or run
`prisma db push` manually against a family database.

## 1. Back up the existing PostgreSQL data

From PowerShell in the Family Rewards repository:

```powershell
New-Item -ItemType Directory -Force .\backups | Out-Null
docker compose up -d postgres
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/family-rewards-before-pr25.dump'
docker cp family_rewards_db:/tmp/family-rewards-before-pr25.dump .\backups\family-rewards-before-pr25.dump
Get-Item .\backups\family-rewards-before-pr25.dump | Select-Object Name,Length
```

Keep the backup outside the Docker volumes. Confirm the backup file has a nonzero
length. A database backup is important even if you also download the app's JSON
backup, because JSON backups from earlier app releases omitted Avatar ledgers
and cosmetic inventory.

## 2. Deploy feature branch for testing

```powershell
git fetch origin
git switch feat/first-child-avatar
git pull --ff-only origin feat/first-child-avatar
docker compose up -d --build
docker compose ps
docker compose logs --tail=150 migrate
```

The `migrate` service performs a non-destructive, audited upgrade and verifies
the XP and coin ledgers. The distroless app container intentionally lacks `npx`;
do not try to deploy migrations using `docker compose exec app npx ...`.

If migration reports a schema mismatch or a ledger inconsistency, **stop**:
retain the database and backup, capture the `migrate` logs, and report them
instead of resetting data.

## 3. Family Hub and Workshop review

1. Confirm pre-existing children, Stars, approved chores, rewards, avatars and
   purchased cosmetics are unchanged.
2. Select Child A in the Family Hub. Open their Avatar Workshop and progress.
   A direct request to Child B's avatar and progress API from Child A's signed
   child session must return HTTP 403. A verified parent can access both.
3. For a child under 8, first avatar theme selection is available, but a later
   theme switch requires a parent PIN. A child aged 8+ can switch independently.
4. Buy a valid locked part with verified parent approval; check the balance
   decrements once, ownership persists after reload, a duplicate purchase does
   not charge again and the part remains owned through theme changes.
5. Check touchscreen layouts, reduced-motion setting, avatar previews,
   category tabs and new permanent milestone halo frames.

## 4. Progression and reversal review

1. In Parent Settings configure XP multipliers, per-level coins and level-10
   milestone bonus. Changes only affect **future** awards.
2. Approve one new chore. Confirm its existing Stars are awarded unchanged;
   the randomly awarded XP is an integer between
   `Stars awarded × minimum multiplier` and
   `Stars awarded × maximum multiplier` inclusive.
3. Check the level progress bar advances according to the increasing level
   curve. Repeated approval of the same completion must not award XP or coins
   again.
4. Cross a new level: confirm default award is 25 Avatar Coins. At level 10,
   confirm a one-time default 50-coin bonus and an exclusive halo frame.
5. Reverse an approved chore from Parent > Review Requests > Recently Approved
   Chores. XP and Stars should decrease according to the original snapshots.
   Spent Avatar Coins become nonspendable debt, not a negative wallet balance.
6. Earn more XP or coins and verify debt is repaid before the wallet increases.
   Re-crossing a previously rewarded level must not grant a new entitlement.
   Purchased cosmetics and earned halo frames remain owned.
7. Historic approvals without a recorded XP snapshot are intentionally not
   reversible: their XP cannot be reconstructed safely.
8. Compare balances before/after a server restart; nothing should reset.

## 5. Backup and final review

Download the Family Rewards JSON backup from Parent mode. Its version should
be **3.0**, including XP and currency ledgers, permanent AvatarUnlock records
and AvatarMilestone records. Use the restore preview to check it validates the
backup before confirming any destructive restore. Test actual restoration
against a **separate disposable database**, never the live family database.

Keep PR #25 open until these local checks pass, then merge it into `develop`
only after explicit sign-off.
