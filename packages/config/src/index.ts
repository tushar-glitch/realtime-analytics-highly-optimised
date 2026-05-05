import { z } from 'zod'

function parseEnv<T extends z.ZodType>(schema: T): z.infer<T> {
  const result = schema.safeParse(process.env)
  if (!result.success) {
    console.error('❌ Invalid environment variables:')
    for (const [key, errors] of Object.entries(result.error.flatten().fieldErrors)) {
      console.error(`  ${key}: ${(errors as string[]).join(', ')}`)
    }
    process.exit(1)
  }
  return result.data
}

const kafkaSchema = z.object({
  KAFKA_BROKERS: z.string().default('localhost:19092'),
})

const clickhouseSchema = z.object({
  CLICKHOUSE_HOST: z.string().url().default('http://localhost:8123'),
  CLICKHOUSE_DB: z.string().default('analytics'),
  CLICKHOUSE_USER: z.string().default('analytics'),
  CLICKHOUSE_PASSWORD: z.string(),
})

const redisSchema = z.object({
  REDIS_URL: z.string().default('redis://localhost:6379'),
})

export const collectorConfig = () =>
  parseEnv(
    kafkaSchema.merge(redisSchema).extend({
      COLLECTOR_PORT: z.coerce.number().default(3000),
      RATE_LIMIT_MAX: z.coerce.number().default(100),
      RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
      NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    }),
  )

export const processorConfig = () =>
  parseEnv(
    kafkaSchema.merge(clickhouseSchema).extend({
      KAFKA_GROUP_ID: z.string().default('processor-group'),
      BATCH_SIZE: z.coerce.number().default(5000),
      BATCH_TIMEOUT_MS: z.coerce.number().default(3000),
      GEOIP_DB_PATH: z.string().optional(),
    }),
  )

export const queryApiConfig = () =>
  parseEnv(
    clickhouseSchema.merge(redisSchema).extend({
      QUERY_API_PORT: z.coerce.number().default(3002),
      CACHE_TTL_SECONDS: z.coerce.number().default(60),
    }),
  )

export const migrateConfig = () => parseEnv(clickhouseSchema)
