import { Kafka, type KafkaConfig } from 'kafkajs'

export function createKafkaClient(brokers: string, clientId: string): Kafka {
  const config: KafkaConfig = {
    clientId,
    brokers: brokers.split(',').map((b) => b.trim()),
    retry: {
      initialRetryTime: 100,
      retries: 8,
    },
  }
  return new Kafka(config)
}
