import { createKafkaClient } from './client.js'
import { TOPIC_CONFIG } from './topics.js'

async function setupTopics() {
  const brokers = process.env['KAFKA_BROKERS'] ?? 'localhost:19092'
  const kafka = createKafkaClient(brokers, 'topic-setup')
  const admin = kafka.admin()

  await admin.connect()

  const existing = new Set(await admin.listTopics())
  const toCreate = Object.entries(TOPIC_CONFIG)
    .filter(([name]) => !existing.has(name))
    .map(([topic, config]) => ({
      topic,
      ...config,
      // spread readonly tuple → mutable array (kafkajs ITopicConfig requires mutable)
      configEntries: [...config.configEntries],
    }))

  if (toCreate.length === 0) {
    console.warn('All topics already exist')
  } else {
    await admin.createTopics({ topics: toCreate, waitForLeaders: true })
    console.warn(`Created topics: ${toCreate.map((t) => t.topic).join(', ')}`)
  }

  await admin.disconnect()
}

setupTopics().catch((err) => {
  console.error(err)
  process.exit(1)
})
