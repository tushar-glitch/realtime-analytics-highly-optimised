import type { Consumer } from 'kafkajs'
import type { Logger } from '@analytics/logger'
import type { KafkaEvent } from '@analytics/types'
import { TOPICS } from '@analytics/kafka'
import { enrich } from '../services/enricher.js'
import type { ClickHouseBatchWriter } from '../clickhouse/writer.js'
import { Counter } from 'prom-client'

const eventsConsumed = new Counter({
  name: 'processor_events_consumed_total',
  help: 'Total events consumed from Kafka',
  labelNames: ['type'] as const,
})

const eventsDropped = new Counter({
  name: 'processor_events_dropped_total',
  help: 'Events dropped due to parse errors',
  labelNames: ['reason'] as const,
})

export async function startEventsConsumer(
  consumer: Consumer,
  writer: ClickHouseBatchWriter,
  log: Logger,
) {
  await consumer.subscribe({ topic: TOPICS.EVENTS_RAW, fromBeginning: false })

  await consumer.run({
    // Process partitions in parallel, but messages within a partition stay ordered
    partitionsConsumedConcurrently: 3,
    eachMessage: async ({ message, partition }) => {
      if (!message.value) {
        eventsDropped.inc({ reason: 'empty_message' })
        return
      }

      let raw: KafkaEvent
      try {
        raw = JSON.parse(message.value.toString()) as KafkaEvent
      } catch {
        eventsDropped.inc({ reason: 'json_parse' })
        log.warn({ partition }, 'Failed to parse Kafka message')
        return
      }

      try {
        const enriched = enrich(raw)
        writer.push(enriched)
        eventsConsumed.inc({ type: raw.type })
      } catch (err) {
        eventsDropped.inc({ reason: 'enrichment' })
        log.error({ err, site_id: raw.site_id }, 'Enrichment failed')
      }
    },
  })
}
