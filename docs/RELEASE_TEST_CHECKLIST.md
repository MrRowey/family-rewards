# Family Rewards — pre-merge test checklist

## Before starting

- [ ] Back up the existing PostgreSQL database and uploaded images; verify that the backup can be restored.
- [ ] Copy .env.example to .env, replace both secrets with strong unique random values, and retain the existing database password when reusing an existing PostgreSQL volume.
- [ ] Review database schema changes. The baseline migration is not yet reconciled with the current schema. The Compose service currently uses `prisma db push` **without** `--accept-data-loss` as a temporary safeguard. Do not force destructive changes.

## Build and tests

```sh
npm ci
npx prisma generate
npm run lint
npm test
npm run build
docker compose config
docker compose build
docker compose up -d
```

## Manual regression checks

- [ ] First-run setup works on an empty database, and cannot be repeated after configuration.
- [ ] Correct parent PIN logs in; incorrect PIN locks out after repeated failures.
- [ ] Changing the PIN logs out the current browser; new PIN works and old PIN fails.
- [ ] Unauthenticated requests to /api/admin/backup, /api/approvals and /api/audit-logs are rejected.
- [ ] /api/config/kiosk and /api/kiosk/children do not return parentPin.
- [ ] Weekly and fortnightly assignments show only on scheduled days; expired tasks do not appear.
- [ ] Child cannot submit a task that is not assigned today.
- [ ] Parent approves a task once; repeated approval does not add points again.
- [ ] Child requests a reward, parent approves once; points are not deducted twice.
- [ ] Out-of-stock rewards cannot be approved and stock never becomes negative.
- [ ] Declining a pending reward returns reserved points; refunding an approved reward restores stock and points once.
- [ ] Upload an image, recreate the app container, and confirm the image still loads.
- [ ] The database survives `docker compose down` followed by `docker compose up -d` (never use `down -v` for this test).
- [ ] Daily tasks reset correctly around UK midnight, including BST/GMT changes.

## Known gaps before stable release

- Parent sessions on *other* devices are not revoked by a PIN reset.
- In-memory PIN rate limiting does not persist across multiple app processes or restarts.
- Daily five-task maximum and one-off overrides are not fully enforced.
- Full API read-access audit and end-to-end concurrency testing remain outstanding.
- Validate volume permissions for uploads under the non-root distroless container.

Do not merge this draft PR until the build and deployment checks pass and known security gaps are resolved.
