import { Redis } from 'ioredis'

export class Cache {
  private client: Redis

  constructor(redisUrl: string) {
    this.client = new Redis(redisUrl, { lazyConnect: true })
  }

  async connect() {
    await this.client.connect()
  }

  async get<T>(key: string): Promise<T | null> {
    const val = await this.client.get(key)
    if (!val) return null
    return JSON.parse(val) as T
  }

  async set(key: string, value: unknown, ttlSeconds: number) {
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds)
  }

  // Decorator pattern — fetch from cache or compute and store
  async cached<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key)
    if (cached !== null) return cached
    const result = await fn()
    await this.set(key, result, ttl)
    return result
  }

  async close() {
    await this.client.quit()
  }
}
