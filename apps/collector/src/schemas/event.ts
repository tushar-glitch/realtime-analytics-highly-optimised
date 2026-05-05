import { z } from 'zod'

export const collectSchema = z.object({
  site_id: z.string().uuid(),
  type: z.enum(['pageview', 'custom']),
  url: z.string().url().max(2000),
  referrer: z.string().url().max(2000).optional().or(z.literal('')),
  event_name: z.string().max(100).optional(),
  props: z.record(z.string().max(200)).optional(),
})

export type CollectPayload = z.infer<typeof collectSchema>
