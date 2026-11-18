# Release readiness and database upgrade checklist

## Automated verification

- CI: lint, type checking, unit tests, PostgreSQL integration tests, production build and Docker build.
- PR #18 adds privacy regression coverage for public rewards and removes the parent PIN hash from backups.
- Passing CI does **not** establish that an existing family database can be upgraded safely.

## Existing deployments: database migration blocker

The current Compose migration service runs `prisma db push`. The checked-in migration directory contains only an initial baseline, while the current Prisma schema has additional fields and models. Do **not** switch an existing installation directly to `prisma migrate deploy` or mark the baseline applied without first reconciling the live database schema and migration history. Either action can break upgrades or leave schema drift.

Before promoting to `main`:

1. Take a PostgreSQL logical backup (for example, `pg_dump -Fc`) and separately back up the uploads volume. The in-app JSON backup is not a substitute for a verified database restore.
2. Restore both backups into a disposable environment; never test upgrades against the only production copy.
3. Compare the restored schema with `prisma/schema.prisma` and the migration history; generate, review, and commit a non-destructive forward migration for any differences.
4. Test the upgrade from an existing-volume installation and a clean install. Verify stars, approvals, claims, stock reservations, child records, avatars and audit logs.
5. Only after both paths pass, replace the production `db push` strategy with a reviewed versioned migration deployment.

## Manual end-to-end smoke test

- First-run setup, invalid/valid parent PIN, session expiry, logout and unauthenticated parent-route rejection.
- Create/edit a child; create tasks and assignments; complete tasks as a child; approve/decline as parent; confirm stars are awarded only once.
- Check child-specific shop availability, age limits, hidden/out-of-stock/month-limited rewards and assigned rewards.
- Claim a reward; verify stars and stock are reserved once; approve, decline and refund; repeat requests to confirm no double charges or refunds.
- Exercise kiosk auto-return and settings, image upload/serving, and family JSON backup; confirm `parentPin` is null in the export.
- Test on a touch device or touch emulation, and check browser console and server logs.

## Deployment configuration

- Set a unique `JWT_SECRET` of at least 32 characters and a strong `POSTGRES_PASSWORD`.
- When served over HTTPS, set `COOKIE_SECURE=true`. Use an HTTPS reverse proxy and avoid exposing PostgreSQL.
- Keep persistent database and uploads volumes and verify that their backups can be restored.
- Confirm `/api/health` reports success and that the container restarts correctly after a reboot.
