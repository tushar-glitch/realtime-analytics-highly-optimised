import type { ClickHouseClient } from '@clickhouse/client'
import type { EnrichedEvent } from '@analytics/types'
import type { Logger } from '@analytics/logger'
import { Counter, Histogram } from 'prom-client'

const insertsTotal = new Counter({
  name: 'processor_clickhouse_inserts_total',
  help: 'Total rows inserted into ClickHouse',
})

const insertErrors = new Counter({
  name: 'processor_clickhouse_insert_errors_total',
  help: 'ClickHouse insert errors',
})

const insertDuration = new Histogram({
  name: 'processor_clickhouse_insert_duration_seconds',
  help: 'Time to bulk-insert a batch',
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
})

const batchSize = new Histogram({
  name: 'processor_batch_size',
  help: 'Number of events per insert batch',
  buckets: [100, 500, 1000, 2500, 5000, 10000],
})

export class ClickHouseBatchWriter {
  private queue: EnrichedEvent[] = []
  private timer: NodeJS.Timeout | null = null

  constructor(
    private readonly client: ClickHouseClient,
    private readonly maxBatchSize: number,
    private readonly maxWaitMs: number,
    private readonly log: Logger,
  ) {}

  push(event: EnrichedEvent) {
    this.queue.push(event)
    if (this.queue.length >= this.maxBatchSize) {
      this.flush()
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.maxWaitMs)
    }
  }

  async flush() {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    if (this.queue.length === 0) return

    const batch = this.queue.splice(0, this.queue.length)
    const end = insertDuration.startTimer()
    batchSize.observe(batch.length)

    try {
      await this.client.insert({
        table: 'events',
        values: batch,
        format: 'JSONEachRow',
      })
      insertsTotal.inc(batch.length)
      this.log.info({ count: batch.length }, 'batch inserted')
    } catch (err) {
      insertErrors.inc()
      this.log.error({ err, count: batch.length }, 'batch insert failed — events lost')
      // In production: write batch to DLQ topic here
    } finally {
      end()
    }
  }

  async close() {
    await this.flush()
  }
}
