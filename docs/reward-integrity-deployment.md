# Reward integrity deployment and rollback

This guide applies to PR #15 (`feature/reward-integrity`). The production database is PostgreSQL.

## Before upgrading

1. Stop new reward claims during the upgrade. Back up the PostgreSQL database using `pg_dump` (or your existing backup solution) and verify the backup is restorable.
2. Check for pending claims and record the current balances and stock counts:
   ```sql
   SELECT "rewardId", count(*) FROM "RewardRedemption" WHERE status = 'PENDING' GROUP BY "rewardId";
   SELECT id, title, "currentStock", "monthlyStock", "starCost" FROM "Reward";
   SELECT id, name, stars FROM "Child";
   ```
3. Deploy the application and schema together. Do **not** run the new application against an old schema or an old application against a database with mixed claim semantics.

## Schema change

The deployment currently runs `npx prisma db push` via the Docker Compose `migrate` service. The Prisma schema introduces:

```prisma
stockReserved Boolean @default(false)
starCostAtClaim Int?
```

Prisma adds the non-null column with a default of `false`, preserving existing redemption rows as **legacy/unreserved** claims. New claims explicitly set `stockReserved: true` and snapshot `starCostAtClaim`. Existing rows have a null snapshot. This change is additive; no backfill of old pending claims is required or appropriate.

- New claim: atomically reserve one stock unit and charge stars.
- New approval: does not decrement stock again.
- New decline: restores reserved stock and refunds stars.
- Legacy pending approval: decrements stock at approval time.
- Legacy pending decline: refunds stars but does not increment stock.
- Approved redemption refund: restores stock and refunds stars.

## Post-upgrade checks

1. Confirm `stockReserved` exists and older rows are `false`.
2. Create a **new** test claim, verify stock and stars each decrease once, decline it and verify both return to their previous values.
3. Approve a new claim and confirm stock does not decrease a second time.
4. Verify an older pending claim can still be approved or declined. If its reward has zero available stock, approval correctly fails without changing its pending status.
5. Check the app logs for repeated Prisma `P2034` errors; the code retries serialization conflicts up to three times.

## Rollback

**Do not simply deploy old application code over a database that has new `stockReserved: true` redemptions.** Old code assumes pending claims have not reserved stock, and would double-decrement on approval or fail to restore reserved stock on decline.

For a full rollback, stop writes and restore a **consistent database backup from before the upgrade**, along with the old application version. This loses any changes made after that backup. If preserving post-upgrade data is required, perform a reviewed, bespoke data migration rather than reverting blindly.

## Known follow-ups

- New claims refund the stored claim-time price, even if the reward price changes. Legacy claims lack snapshots and fall back to the current price; avoid price edits while old claims are refundable.
- PostgreSQL concurrency integration tests run in CI. A passing test suite is not a substitute for a verified backup and a deployment rehearsal.
- `prisma db push` is not a versioned migration system. Converting to `prisma migrate deploy` requires reconciling the existing baseline with deployed databases; handle that as a separate migration project rather than swapping commands without verification.
