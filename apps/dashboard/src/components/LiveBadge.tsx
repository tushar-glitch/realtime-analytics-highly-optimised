'use client'
import { useEffect, useState } from 'react'

interface Props {
  siteId: string
}

export function LiveBadge({ siteId }: Props) {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    const es = new EventSource(`/api/live?site_id=${siteId}`)
    es.onmessage = (e) => {
      const d = JSON.parse(e.data) as { active_visitors: number }
      setCount(Number(d.active_visitors))
    }
    return () => es.close()
  }, [siteId])

  if (count === null) return null

  return (
    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
      </span>
      {count} live
    </div>
  )
}
