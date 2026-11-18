import { queryOptions, type QueryClient } from "@tanstack/react-query"

import { timelineQueryOptions, type Tweet } from "@/queries/tweets"

const COULDNT_POST = "Couldn't post your reply. Try again."

/** The API has no replies to show for this tweet (404): it is not the caller's or a followee's. */
export class RepliesUnavailableError extends Error {
  constructor() {
    super("Replies aren't available for this tweet.")
    this.name = "RepliesUnavailableError"
  }
}

/** A failed reply, with a message that is ready to show to the person. */
export class ReplyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ReplyError"
  }
}

/** The message to show for anything that went wrong while posting a reply. */
export function replyErrorMessage(error: unknown): string {
  return error instanceof ReplyError ? error.message : COULDNT_POST
}

/** The replies to one tweet, oldest first. Single level: a reply has no replies of its own. */
export async function fetchReplies(tweetId: string): Promise<Tweet[]> {
  const response = await fetch(`/api/tweets/${encodeURIComponent(tweetId)}/replies`, {
    credentials: "include",
  })

  if (response.status === 404) throw new RepliesUnavailableError()
  if (!response.ok) {
    throw new Error(`Could not load the replies (${response.status.toString()})`)
  }

  const body = (await response.json()) as { items?: Tweet[] }
  return body.items ?? []
}

const repliesKey = (tweetId: string) => ["replies", tweetId] as const

/** A tweet's replies, loaded when its thread is opened. */
export function repliesQueryOptions(tweetId: string) {
  return queryOptions({
    queryKey: repliesKey(tweetId),
    queryFn: () => fetchReplies(tweetId),
    // The thread has a "Try again" button; a 404 must not wait for retries before it shows.
    retry: false,
  })
}

/**
 * Reply to a tweet. The text is trimmed, `parentTweetId` is the tweet being replied to and the
 * API makes it a single-level reply. The API refusing the request (any 4xx) is the person's to
 * read: its own message is shown, or a fallback when it sent none. A network failure or a 5xx is
 * "try again".
 */
export async function createReply(input: { parentTweetId: string; content: string }): Promise<Tweet> {
  let response: Response
  try {
    response = await fetch("/api/tweets", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: input.content.trim(), parentTweetId: input.parentTweetId }),
    })
  } catch {
    throw new ReplyError(COULDNT_POST)
  }

  if (response.ok) {
    try {
      return (await response.json()) as Tweet
    } catch {
      throw new ReplyError(COULDNT_POST)
    }
  }

  if (response.status >= 400 && response.status < 500) {
    const body = (await response.json().catch(() => null)) as {
      error?: unknown
      message?: unknown
    } | null
    const sent = [body?.error, body?.message].find((value) => typeof value === "string" && value.trim())
    throw new ReplyError(
      typeof sent === "string" ? sent.trim() : "That reply was refused. Check the text and try again."
    )
  }

  throw new ReplyError(COULDNT_POST)
}

/**
 * Show a reply the API just returned: at the end of the tweet's thread (a thread that has not
 * loaded yet is fetched again instead, so it can't land without the reply) and as one more in
 * that tweet's `replyCount` in the cached timeline. Nothing is refetched for the timeline: that
 * would reset the infinite list.
 */
export async function recordReply(
  queryClient: QueryClient,
  parentTweetId: string,
  reply: Tweet
): Promise<void> {
  // The key from `queryOptions` carries the data type, so the cache reads and writes are typed.
  const threadKey = repliesQueryOptions(parentTweetId).queryKey
  const timelineKey = timelineQueryOptions.queryKey

  // A fetch already under way would land with data that lacks the new reply.
  await Promise.all([
    queryClient.cancelQueries({ queryKey: threadKey }),
    queryClient.cancelQueries({ queryKey: timelineKey }),
  ])

  const thread = queryClient.getQueryData(threadKey)
  if (thread) {
    queryClient.setQueryData(threadKey, [...thread.filter((item) => item.id !== reply.id), reply])
  } else {
    void queryClient.invalidateQueries({ queryKey: threadKey })
  }

  queryClient.setQueryData(timelineKey, (cached) =>
    cached && {
      ...cached,
      pages: cached.pages.map((page) => ({
        ...page,
        items: page.items.map((tweet) =>
          tweet.id === parentTweetId ? { ...tweet, replyCount: tweet.replyCount + 1 } : tweet
        ),
      })),
    }
  )
}
