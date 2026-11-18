import { infiniteQueryOptions } from "@tanstack/react-query"

export type Tweet = {
  id: string
  authorId: string
  /** `handle` arrives "@"-prefixed from the API. */
  author: { name: string; handle: string }
  content: string
  /** Fully-resolved, publicly fetchable media URLs. */
  mediaUrls: string[]
  /** ISO 8601 timestamp. */
  createdAt: string
  likeCount: number
  retweetCount: number
  replyCount: number
  likedByMe: boolean
  retweetedByMe: boolean
}

export type TimelinePage = {
  items: Tweet[]
  /** Pass as `cursor` to get the next (older) page; `null` on the last page. */
  nextCursor: string | null
}

export const TIMELINE_PAGE_SIZE = 20

async function fetchTimelinePage(cursor: string | null): Promise<TimelinePage> {
  const params = new URLSearchParams({ limit: TIMELINE_PAGE_SIZE.toString() })
  if (cursor) params.set("cursor", cursor)

  const response = await fetch(`/api/timeline?${params.toString()}`, {
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error(`Could not load the timeline (${response.status.toString()})`)
  }

  return (await response.json()) as TimelinePage
}

/** The home timeline, newest first, one page per `fetchNextPage()`. */
export const timelineQueryOptions = infiniteQueryOptions({
  queryKey: ["timeline"] as const,
  queryFn: ({ pageParam }) => fetchTimelinePage(pageParam),
  initialPageParam: null as string | null,
  getNextPageParam: (lastPage) => lastPage.nextCursor,
})
