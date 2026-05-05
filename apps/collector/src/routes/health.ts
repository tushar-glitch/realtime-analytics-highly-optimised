import type { FastifyInstance } from 'fastify'

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async (_req, reply) => {
    return reply.send({ status: 'ok', ts: Date.now() })
  })

  app.get('/metrics', async (_req, reply) => {
    const metrics = await app.metricsRegistry.metrics()
    return reply
      .header('content-type', app.metricsRegistry.contentType)
      .send(metrics)
  })
}
