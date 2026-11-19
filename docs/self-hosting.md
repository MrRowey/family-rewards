# Self-hosting Family Rewards

## Recommended hosting options

**Docker Compose (recommended default)** works on Linux, Windows Docker Desktop and Docker-enabled Proxmox VMs. **Portainer** is a convenient GUI for managing the same stack. The app and database are identical across both methods. For Proxmox, a Linux VM running Docker is the simplest supported approach.

The official application image is `ghcr.io/mrrowey/family-rewards:latest`. The one-time fresh-install schema image is `ghcr.io/mrrowey/family-rewards:init`. Both are published by the main-branch workflow. Public GHCR package visibility must be enabled by the repository owner; otherwise authenticate Docker/Portainer to GHCR.

### New installation (Docker Compose)

1. Download `compose.deploy.yml`, `compose.init.yml` and `.env.example` from the same release. Rename `.env.example` to `.env` and replace **both** example secrets with long, unique values.
2. Run `docker compose -f compose.deploy.yml up -d postgres`.
3. **Only for a brand-new, empty database:** run `docker compose -f compose.deploy.yml -f compose.init.yml --profile setup run --rm init` to initialise the schema. Never use this command to upgrade a database containing family data.
4. Run `docker compose -f compose.deploy.yml up -d`, then check `docker compose -f compose.deploy.yml ps`. Open `http://localhost:3000` and complete the parent PIN setup.

Do not run `docker compose down -v` or delete the named volumes: that permanently deletes database records and uploaded images.

### Portainer

Use **Stacks → Add stack → Repository**, select the Family Rewards Git repository, set **Compose path** to `compose.deploy.yml`, and supply `POSTGRES_PASSWORD`, `JWT_SECRET`, and optionally `APP_PORT`, `COOKIE_SECURE` and `FAMILY_REWARDS_IMAGE` as stack environment variables. **Initialise the empty database first**, using the one-time Compose setup above on the Docker host (with the **same Compose project/stack name and volumes**), or a separately managed one-shot init job attached to the same database. Portainer's stack name determines the Compose volume prefix; changing it can make existing data appear missing. Verify the volume names before starting.

For a Portainer-only installation where the operator cannot run the one-time database setup, the source-build `docker-compose.yml` is the alternative initial installation method; it includes the initialisation service. Do not use its automatic `prisma db push` behaviour as a production upgrade strategy once data exists.

**Updating:** GHCR publishes new images automatically when `main` changes. Portainer does **not** automatically deploy an updated `:latest` image merely because it was published. After backing up and verifying release compatibility, use Portainer's stack pull/redeploy mechanism (or an explicitly configured GitOps/webhook workflow). Do not enable unattended auto-updates until versioned schema migrations, tested backups and rollback support exist. Prefer pinning `FAMILY_REWARDS_IMAGE` to an immutable release digest for production.

### Backups and security

- Back up **both** PostgreSQL and the uploads volume, and test a restore before upgrading.
- Keep database port 5432 internal; the example does not publish it.
- Set `COOKIE_SECURE=true` behind HTTPS, using a trusted reverse proxy.
- Do not expose the Docker socket to the Family Rewards app.
- Database passwords containing URL-reserved characters must be URL-encoded in the PostgreSQL connection string; choose URL-safe random secrets or supply an appropriately encoded connection string in a custom stack.
- For existing installations, **do not switch Compose project names or volumes without a deliberate migration**. A new stack normally creates new volumes rather than adopting your old data.

For upgrade constraints and testing, see [release readiness](release-readiness.md).
