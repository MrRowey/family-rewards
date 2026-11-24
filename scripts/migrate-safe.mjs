/**
 * Safe database bootstrapping for the self-hosted Docker deployment.
 * An older Family Rewards installation used `prisma db push` without recording
 * Prisma migration history. Preserve its tables and balances before enabling
 * ledger migrations. Never run db push on an existing family database.
 */
import { Client } from "pg";
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const url = process.env.DATABASE_URL;

function prisma(...args) {
  const child = spawnSync("npx", ["prisma", ...args], { stdio: "inherit", env: process.env });
  if (child.error) throw child.error;
  if (child.status !== 0) throw new Error(`Prisma ${args.join(" ")} exited with ${child.status}`);
}

function hasTableSql(table) {
  return `EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='${table}')`;
}
function hasColumnSql(table, column) {
  return `EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='${table}' AND column_name='${column}')`;
}

async function queryBool(client, sql) {
  const row = (await client.query(`SELECT (${sql}) AS present`)).rows[0];
  return Boolean(row?.present);
}

async function currentHistory(client) {
  if (!await queryBool(client, hasTableSql("_prisma_migrations"))) return new Set();
  const result = await client.query('SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL');
  return new Set(result.rows.map(row => row.migration_name));
}

async function reconcileOpeningBalances(client) {
  // After an old db-push deployment, the new ledger tables may already exist.
  // Bootstrap any missing opening snapshots using the difference, never double
  // credit or rewrite previously committed events.
  await client.query(`
    INSERT INTO "XpLedger" ("id","childId","sourceKey","delta","stars","minFactor","maxFactor")
    SELECT gen_random_uuid()::text, c."id", 'opening:before-ledger:v1',
      c."xp" - COALESCE((SELECT SUM(x."delta") FROM "XpLedger" x WHERE x."childId"=c."id"),0), 0,0,0
    FROM "Child" c
    ON CONFLICT ("childId","sourceKey") DO NOTHING
  `);
  await client.query(`
    INSERT INTO "AvatarCurrencyLedger" ("id","childId","sourceKey","delta","debtDelta","reason")
    SELECT gen_random_uuid()::text, c."id", 'opening:before-ledger:v1',
      c."avatarCoins" - COALESCE((SELECT SUM(l."delta") FROM "AvatarCurrencyLedger" l WHERE l."childId"=c."id"),0),
      c."avatarCoinDebt" - COALESCE((SELECT SUM(l."debtDelta") FROM "AvatarCurrencyLedger" l WHERE l."childId"=c."id"),0),
      'OPENING_BALANCE'
    FROM "Child" c
    ON CONFLICT ("childId","sourceKey") DO NOTHING
  `);
  const inconsistencies = await client.query(`
    SELECT c."id" FROM "Child" c WHERE
      c."xp" <> COALESCE((SELECT SUM(x."delta") FROM "XpLedger" x WHERE x."childId"=c."id"),0)
      OR c."avatarCoins" <> COALESCE((SELECT SUM(l."delta") FROM "AvatarCurrencyLedger" l WHERE l."childId"=c."id"),0)
      OR c."avatarCoinDebt" <> COALESCE((SELECT SUM(l."debtDelta") FROM "AvatarCurrencyLedger" l WHERE l."childId"=c."id"),0)
    LIMIT 1
  `);
  if (inconsistencies.rowCount) throw new Error("Avatar ledger/balance discrepancy detected; refusing to start the application");
}

async function main() {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
  await client.query("SELECT pg_advisory_lock(7261200)");
  if (await queryBool(client, hasTableSql("_prisma_migrations"))) {
    const failed = await client.query('SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NULL AND rolled_back_at IS NULL');
    if (failed.rowCount) throw new Error("Unfinished migration detected; restore a verified backup or seek recovery guidance before retrying.");
  }
  const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'");
  if (tables.rowCount === 0) {
    // Historical migrations omit parts of the original schema. Only a truly
    // empty database may be bootstrapped from the complete current schema.
    prisma("db", "push");
    for (const entry of readdirSync(new URL("../prisma/migrations/", import.meta.url), { withFileTypes: true }).filter(e => e.isDirectory()).toSorted((a,b) => a.name.localeCompare(b.name))) {
      prisma("migrate", "resolve", "--applied", entry.name);
    }
    await reconcileOpeningBalances(client);
    process.stdout.write("Fresh Family Rewards database initialised and verified.\n");
    return;
  }
  if (!await queryBool(client, hasTableSql("Child"))) throw new Error("Unrecognised non-empty database; refusing automatic bootstrap.");

  // Resolve only the migrations whose effects already exist in legacy data.
  // This avoids CREATE TABLE on real user data from pre-migration db-push installs.
  const history = await currentHistory(client);
  const candidates = [
    ["0_init_baseline", hasTableSql("Child")],
    ["20261120190000_avatar_coins_unlocks",
      `${hasColumnSql("Child","avatarCoins")} AND ${hasTableSql("AvatarUnlock")}`],
    ["20261120200000_child_xp_progression",
      `${hasColumnSql("Child","xp")} AND ${hasColumnSql("Child","rewardedLevel")}`],
    ["20261123093000_avatar_ledgers",
      `${hasTableSql("XpLedger")} AND ${hasTableSql("AvatarCurrencyLedger")}`],
    ["20261123094500_ledger_baselines_and_debts",
      `${hasColumnSql("Child","avatarCoinDebt")} AND ${hasColumnSql("AvatarCurrencyLedger","debtDelta")}
      AND ${hasColumnSql("FamilyConfig","coinsPerLevel")}`],
    ["20261123120000_child_achievement_celebrations",
      `${hasColumnSql("ChildBadge","celebrationSeenAt")} AND EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='ChildBadge_childId_celebrationSeenAt_idx')`],
    ["20261123110000_avatar_level_milestones",
      `${hasTableSql("AvatarMilestone")} AND ${hasColumnSql("FamilyConfig","milestoneBonusCoins")}`],
  ];
  for (const [migration, condition] of candidates) {
    if (history.has(migration)) continue;
    if (await queryBool(client, condition)) {
      prisma("migrate", "resolve", "--applied", migration);
      history.add(migration);
      process.stdout.write(`Recognised existing migration state: ${migration}\n`);
    }
  }
  prisma("migrate", "deploy");
  await client.query("BEGIN");
  try { await reconcileOpeningBalances(client); await client.query("COMMIT"); } catch (error) { await client.query("ROLLBACK"); throw error; }
  process.stdout.write("Existing Family Rewards schema migrated; balances and ledgers verified.\n");
  } finally { await client.end(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
