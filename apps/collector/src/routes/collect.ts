import type { FastifyInstance } from 'fastify'
import { TOPICS } from '@analytics/kafka'
import type { KafkaEvent } from '@analytics/types'
import { collectSchema } from '../schemas/event.js'
import { makeVisitorId } from '../services/fingerprint.js'

export async function collectRoutes(app: FastifyInstance) {
  // POST /collect — primary ingest endpoint
  app.post('/collect', async (req, reply) => {
    const result = collectSchema.safeParse(req.body)

    if (!result.success) {
      app.metrics.eventsInvalid.inc({ reason: 'schema' })
      return reply.code(400).send({ error: 'Invalid payload' })
    }

    const ip =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
      req.ip

    const userAgent = req.headers['user-agent'] ?? ''
    const visitorId = makeVisitorId(ip, userAgent, result.data.site_id)

    const event: KafkaEvent = {
      ...result.data,
      ip,
      user_agent: userAgent,
      received_at: Date.now(),
      visitor_id: visitorId,
    }

    const end = app.metrics.kafkaPublishDuration.startTimer()

    await app.kafkaProducer.send({
      topic: TOPICS.EVENTS_RAW,
      messages: [
        {
          // Partition by site_id — all events from one site land on the same partition (ordered)
          key: result.data.site_id,
          value: JSON.stringify(event),
        },
      ],
    })

    end()
    app.metrics.eventsReceived.inc({ type: result.data.type })

    // 204 — intentionally no body to keep response tiny (tracking pixel pattern)
    return reply.code(204).send()
  })

  // GET /collect — beacon fallback (image pixel for no-JS environments)
  app.get('/collect', async (req, reply) => {
    const query = req.query as Record<string, string>
    const result = collectSchema.safeParse({ ...query, type: 'pageview' })

    if (!result.success) return reply.code(204).send()

    const ip =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ?? req.ip

    const event: KafkaEvent = {
      ...result.data,
      ip,
      user_agent: req.headers['user-agent'] ?? '',
      received_at: Date.now(),
      visitor_id: makeVisitorId(ip, req.headers['user-agent'] ?? '', result.data.site_id),
    }

    await app.kafkaProducer
      .send({ topic: TOPICS.EVENTS_RAW, messages: [{ key: result.data.site_id, value: JSON.stringify(event) }] })
      .catch(() => {/* swallow — beacon requests cannot retry */})

    // Return 1x1 transparent GIF
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
    return reply.code(200).header('content-type', 'image/gif').send(pixel)
  })
}
