'use strict';

/**
 * Smart migration runner for Railway deployments.
 *
 * Handles two scenarios:
 *  1. Fresh DB  – runs `migrate deploy` which applies all migrations from scratch.
 *  2. Existing DB (previously managed with `db push`, no _prisma_migrations table)
 *     – baselines the init migration so Prisma skips it, then applies only the
 *       newer migrations (e.g. the Stripe Connect columns).
 */

const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

const run = (cmd) => execSync(cmd, { stdio: 'inherit' });

function tryResolve(migrationName) {
  try {
    execSync(`npx prisma migrate resolve --applied "${migrationName}"`, { stdio: 'pipe' });
    console.log(`  ✓ Baselined: ${migrationName}`);
  } catch {
    // Already recorded or not applicable — safe to ignore
    console.log(`  – Skipped (already recorded): ${migrationName}`);
  }
}

async function main() {
  const prisma = new PrismaClient();

  let dbHasTables = false;
  try {
    // If the studios table exists the DB was previously set up via db push
    await prisma.$queryRaw`SELECT 1 FROM studios LIMIT 1`;
    dbHasTables = true;
  } catch (_) {
    dbHasTables = false;
  } finally {
    await prisma.$disconnect();
  }

  if (dbHasTables) {
    console.log('Existing database detected – baselining pre-existing migrations…');
    // Mark all migrations that may have succeeded, failed, or been applied via db push.
    // The recovery migration (add_stripe_recovery) will ensure all Stripe schema changes
    // are actually present using IF NOT EXISTS statements, regardless of prior state.
    tryResolve('20240101000000_init');
    tryResolve('20240102000000_add_stripe_connect');
    tryResolve('20260407000100_add_stripe_fields');
  } else {
    console.log('Fresh database detected – running all migrations…');
  }

  run('npx prisma migrate deploy');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
