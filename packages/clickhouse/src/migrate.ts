import { readdir, readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { migrateConfig } from '@analytics/config'
import { createClickHouseClient } from './client.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = join(__dirname, 'migrations')

async function migrate() {
  const cfg = migrateConfig()
  const client = createClickHouseClient({
    host: cfg.CLICKHOUSE_HOST,
    database: cfg.CLICKHOUSE_DB,
    username: cfg.CLICKHOUSE_USER,
    password: cfg.CLICKHOUSE_PASSWORD,
  })

  // Track applied migrations in ClickHouse itself
  await client.exec({
    query: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version String,
        applied_at DateTime DEFAULT now()
      ) ENGINE = MergeTree() ORDER BY version
    `,
  })

  const applied = new Set(
    (
      await client.query({ query: 'SELECT version FROM schema_migrations', format: 'JSONEachRow' })
        .then((r) => r.json<{ version: string }[]>())
    ).map((r) => r.version),
  )

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    if (applied.has(file)) {
      console.warn(`  skip  ${file}`)
      continue
    }

    const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8')

    // Split on semicolons to execute each statement individually
    const statements = sql.split(';').map((s) => s.trim()).filter(Boolean)

    for (const statement of statements) {
      await client.exec({ query: statement })
    }

    await client.exec({
      query: `INSERT INTO schema_migrations (version) VALUES ('${file}')`,
    })

    console.warn(`  apply  ${file}`)
  }

  await client.close()
  console.warn('Migrations complete')
}

migrate().catch((err) => {
  console.error(err)
  process.exit(1)
})
