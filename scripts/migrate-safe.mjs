/**
 * Safe database bootstrapping for the self-hosted Docker deployment.
 * An older Family Rewards installation used `prisma db push` without recording
 * Prisma migration history. Preserve its tables and balances before enabling
 * ledger migrations. Never run db push on an existing family database.
 */
import { Client } from "pg";
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
  const existing = await queryBool(client, hasTableSql("Child"));

  if (!existing) {
    await client.end();
    // Only an empty, brand-new database may use db push to reconcile legacy
    // fields that predated the checked-in migration history.
    prisma("migrate", "deploy");
    prisma("db", "push");
    const verify = new Client({ connectionString: url });
    await verify.connect();
    try { await reconcileOpeningBalances(verify); } finally { await verify.end(); }
    process.stdout.write("Fresh Family Rewards database initialised and verified.\n");
    return;
  }

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
  await client.end();
  prisma("migrate", "deploy");
  const verify = new Client({ connectionString: url });
  await verify.connect();
  try { await reconcileOpeningBalances(verify); } finally { await verify.end(); }
  process.stdout.write("Existing Family Rewards schema migrated; balances and ledgers verified.\n");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
