import { createClient, type ClickHouseClient } from '@clickhouse/client'

interface ClickHouseConfig {
  host: string
  database: string
  username: string
  password: string
}

export function createClickHouseClient(config: ClickHouseConfig): ClickHouseClient {
  return createClient({
    url: config.host,
    database: config.database,
    username: config.username,
    password: config.password,
    clickhouse_settings: {
      // Allow larger inserts to flow through without blocking reads
      async_insert: 0,
      wait_for_async_insert: 0,
      // Faster for analytics — avoids per-row dedup overhead
      insert_deduplicate: 0,
    },
    compression: {
      request: true,   // compress data we send
      response: true,  // accept compressed responses
    },
  })
}
