export const TOPICS = {
  EVENTS_RAW: 'events.raw',
  EVENTS_DLQ: 'events.dlq',
} as const

export type TopicName = (typeof TOPICS)[keyof typeof TOPICS]

export const TOPIC_CONFIG = {
  [TOPICS.EVENTS_RAW]: {
    numPartitions: 6,        // allows up to 6 parallel consumers
    replicationFactor: 1,
    configEntries: [
      { name: 'retention.ms', value: String(24 * 60 * 60 * 1000) },
      { name: 'compression.type', value: 'lz4' },
      { name: 'min.insync.replicas', value: '1' },
    ],
  },
  [TOPICS.EVENTS_DLQ]: {
    numPartitions: 1,
    replicationFactor: 1,
    configEntries: [
      { name: 'retention.ms', value: String(7 * 24 * 60 * 60 * 1000) },
    ],
  },
} as const
