# Release readiness and database upgrade checklist

## Automated verification

- CI: lint, type checking, unit tests, PostgreSQL integration tests, production build and Docker build.
- PR #18 adds privacy regression coverage for public rewards and removes the parent PIN hash from backups.
- Passing CI does **not** establish that an existing family database can be upgraded safely.

## Database policy: fresh installation only

There is currently no live Family Rewards installation and no production data to preserve. The first deployment can initialize an empty PostgreSQL volume directly from the current `prisma/schema.prisma` using the existing Compose `prisma db push` migration service. This is intentional for the initial fresh install; the historical migration baseline is **not** an accurate representation of the current schema and must not be applied with `prisma migrate deploy`.

For a disposable local installation only, to erase all existing Family Rewards database records **and uploaded images**, run:

```sh
docker compose down --volumes
docker compose up --build -d
```

**Warning:** `docker compose down --volumes` permanently deletes the project's named PostgreSQL and uploads volumes. Verify the Compose project and volumes before running it. Never use this command on an installation containing data you want to keep.

The first production release must be verified against a clean database. Once families begin using the app, do not reset their volumes or rely on automatic schema synchronization for upgrades. Before any subsequent schema-changing release, introduce a reviewed versioned migration strategy and test a backup/restore plus upgrade path.

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
