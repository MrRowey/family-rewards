# Release readiness and database upgrade checklist

## Automated verification

- CI: lint, type checking, unit tests, PostgreSQL integration tests, production build and Docker build.
- PR #18 adds privacy regression coverage for public rewards and removes the parent PIN hash from backups.
- Passing CI does **not** establish that an existing family database can be upgraded safely.

## Fresh installation and updates in PowerShell

There is currently no live Family Rewards installation and no production data to preserve. The first deployment can initialize an empty PostgreSQL volume directly from the current `prisma/schema.prisma` using the existing Compose `prisma db push` migration service. This is intentional for the initial fresh install; the historical migration baseline is **not** an accurate representation of the current schema and must not be applied with `prisma migrate deploy`.

From the repository root, create the environment file on a fresh checkout and replace its example secrets before starting Compose:

```powershell
Copy-Item .env.example .env
docker compose up --build -d
docker compose ps
Invoke-RestMethod http://localhost:3000/api/health
```

Open the app on port 3000, follow the first-run parent PIN setup, and open the parent dashboard. Create a child, create and assign a chore, and add a prize with a star cost and starting stock. Confirm the prize appears in the parent inventory and the eligible child's shop. Create a group goal and confirm it appears under Family Group Goals.

For a code-only update, first verify that the incoming release has no schema changes. Back up PostgreSQL and the uploads volume and test restoration on a separate installation. Retain the same Compose project name, environment file, and volume configuration. From the verified release checkout, run `docker compose up --build -d`, check health, and confirm existing records and uploads are present. A restart (`docker compose restart`) reuses both volumes.

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


## Distribution and future in-app updates

**GitHub first install (v1):** Clone or download the repository, configure environment secrets, and start Docker Compose. This is supported only against an empty Family Rewards database. Do not delete or replace an existing installation's volumes.

**Later Parent Dashboard feature — App Updates:** An authenticated parent-only page may check published release metadata, display the version and changelog, and initiate a controlled upgrade workflow. The app must never run arbitrary commands from user-supplied URLs, expose Docker control to unauthenticated requests, or assume the application container can safely replace itself.

**Required upgrade safeguards before implementing the update button:**
1. Introduce reviewed, versioned, forward-only Prisma migrations and verify upgrades from the last released schema.
2. Take consistent PostgreSQL and uploaded-file backups; verify restore procedures and provide a recovery path.
3. Check release compatibility and available disk space, run preflight validation, and surface migration/upgrade errors to the parent.
4. Prefer a trusted host-side updater or deployment orchestrator over mounting the Docker socket into the web app.
5. Preserve database and uploads volumes during application image replacement; never run `docker compose down --volumes` for upgrades.
6. Add integration tests for upgrade, interruption, failure recovery and retained family data.

The in-app update feature is **out of scope for PR #18**. This PR only prepares a secure, clean first installation and documents the future upgrade contract.
