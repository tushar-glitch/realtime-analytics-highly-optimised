import { collectorConfig } from '@analytics/config'
import { buildApp } from './app.js'

const cfg = collectorConfig()

const app = await buildApp()

await app.listen({ port: cfg.COLLECTOR_PORT, host: '0.0.0.0' })
