import http from 'node:http'
import { processorConfig } from '@analytics/config'
import { createKafkaClient, TOPICS } from '@analytics/kafka'
import { createClickHouseClient } from '@analytics/clickhouse'
import { createLogger } from '@analytics/logger'
import { collectDefaultMetrics, register } from 'prom-client'
import { initGeoIP } from './services/geoip.js'
import { ClickHouseBatchWriter } from './clickhouse/writer.js'
import { startEventsConsumer } from './consumers/events.js'

const cfg = processorConfig()
const log = createLogger('processor')

collectDefaultMetrics()

if (cfg.GEOIP_DB_PATH) {
  await initGeoIP(cfg.GEOIP_DB_PATH)
  log.info({ path: cfg.GEOIP_DB_PATH }, 'GeoIP database loaded')
} else {
  log.warn('GEOIP_DB_PATH not set — geo enrichment disabled')
}

const chClient = createClickHouseClient({
  host: cfg.CLICKHOUSE_HOST,
  database: cfg.CLICKHOUSE_DB,
  username: cfg.CLICKHOUSE_USER,
  password: cfg.CLICKHOUSE_PASSWORD,
})

const writer = new ClickHouseBatchWriter(
  chClient,
  cfg.BATCH_SIZE,
  cfg.BATCH_TIMEOUT_MS,
  log,
)

const kafka = createKafkaClient(cfg.KAFKA_BROKERS, 'processor')
const consumer = kafka.consumer({ groupId: cfg.KAFKA_GROUP_ID })

await consumer.connect()
await startEventsConsumer(consumer, writer, log)

// Minimal HTTP server for /health and /metrics (Prometheus scrape target)
const metricServer = http.createServer(async (req, res) => {
  if (req.url === '/metrics') {
    res.writeHead(200, { 'content-type': register.contentType })
    res.end(await register.metrics())
  } else {
    res.writeHead(200)
    res.end(JSON.stringify({ status: 'ok' }))
  }
})
metricServer.listen(9091, '0.0.0.0')

log.info('Processor started')

async function shutdown(signal: string) {
  log.info({ signal }, 'Shutting down')
  await consumer.disconnect()
  await writer.close()
  await chClient.close()
  metricServer.close()
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
