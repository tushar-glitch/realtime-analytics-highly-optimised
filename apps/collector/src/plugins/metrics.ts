import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { Registry, Counter, Histogram, collectDefaultMetrics } from 'prom-client'

declare module 'fastify' {
  interface FastifyInstance {
    metrics: {
      eventsReceived: Counter
      eventsInvalid: Counter
      kafkaPublishDuration: Histogram
    }
    metricsRegistry: Registry
  }
}

export default fp(async (app: FastifyInstance) => {
  const registry = new Registry()
  collectDefaultMetrics({ register: registry })

  const eventsReceived = new Counter({
    name: 'collector_events_received_total',
    help: 'Total events received by type',
    labelNames: ['type'] as const,
    registers: [registry],
  })

  const eventsInvalid = new Counter({
    name: 'collector_events_invalid_total',
    help: 'Events rejected due to validation failure',
    labelNames: ['reason'] as const,
    registers: [registry],
  })

  const kafkaPublishDuration = new Histogram({
    name: 'collector_kafka_publish_duration_seconds',
    help: 'Time to publish event to Kafka',
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
    registers: [registry],
  })

  app.decorate('metrics', { eventsReceived, eventsInvalid, kafkaPublishDuration })
  app.decorate('metricsRegistry', registry)
})
