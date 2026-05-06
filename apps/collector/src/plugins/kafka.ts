import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import type { Producer } from 'kafkajs'
import { createKafkaClient } from '@analytics/kafka'

declare module 'fastify' {
  interface FastifyInstance {
    kafkaProducer: Producer
  }
}

export default fp(async (app: FastifyInstance) => {
  const brokers = process.env['KAFKA_BROKERS'] ?? 'localhost:19092'
  const kafka = createKafkaClient(brokers, 'collector')

  const producer = kafka.producer({
    allowAutoTopicCreation: false,
    idempotent: true,
  })

  await producer.connect()
  app.decorate('kafkaProducer', producer)

  app.addHook('onClose', async () => {
    await producer.disconnect()
  })
})
