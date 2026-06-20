const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

const migrationsDir = path.join(__dirname, '..', 'migrations');
const fresh = process.argv.includes('--fresh');
const seedOnly = process.argv.includes('--seed-only');

async function runSqlFile(client, filename) {
  const fullPath = path.join(migrationsDir, filename);
  const sql = fs.readFileSync(fullPath, 'utf8');
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query(
      'INSERT INTO _migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING',
      [filename]
    );
    await client.query('COMMIT');
    console.log(`OK ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`FAIL ${filename}: ${error.message}`);
    throw error;
  }
}

async function reset(client) {
  await client.query('DROP TABLE IF EXISTS chat_messages, budget_history, budgets, transactions, wallets, categories, _migrations CASCADE');
  await client.query('DROP TYPE IF EXISTS transaction_source, transaction_type, currency_code, wallet_type, category_type CASCADE');
}

async function main() {
  const client = await pool.connect();
  try {
    if (fresh) await reset(client);
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const done = await client.query('SELECT filename FROM _migrations');
    const doneSet = new Set(done.rows.map((row) => row.filename));
    const files = fs.readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .filter((file) => !seedOnly || file.includes('seed'))
      .sort();

    for (const file of files) {
      if (!fresh && doneSet.has(file) && !file.includes('seed')) {
        console.log(`SKIP ${file}`);
        continue;
      }
      await runSqlFile(client, file);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
