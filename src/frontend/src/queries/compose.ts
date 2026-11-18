import type { QueryClient } from "@tanstack/react-query"

import { timelineQueryOptions, type Tweet } from "@/queries/tweets"

const COULDNT_POST = "Couldn't post your tweet. Try again."

/** A failed upload or post, with a message that is ready to show to the person. */
export class ComposeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ComposeError"
  }
}

/** The message to show for anything that went wrong while posting. */
export function composeErrorMessage(error: unknown): string {
  return error instanceof ComposeError ? error.message : COULDNT_POST
}

/**
 * Send a request and return the successful response. The API refusing the request (400, or 413
 * for a file that is too large) is the person's to fix: the API's own message is shown, or
 * `refusedFallback` when it sent none. A network failure or any other status is "try again".
 */
async function send(url: string, init: RequestInit, refusedFallback: string): Promise<Response> {
  let response: Response
  try {
    response = await fetch(url, { ...init, credentials: "include" })
  } catch {
    throw new ComposeError(COULDNT_POST)
  }

  if (response.ok) return response

  if (response.status === 400 || response.status === 413) {
    const body = (await response.json().catch(() => null)) as { error?: unknown } | null
    const message = typeof body?.error === "string" ? body.error.trim() : ""
    throw new ComposeError(message || refusedFallback)
  }

  throw new ComposeError(COULDNT_POST)
}

/** Upload one image and return its media key, to pass to `createTweet`. */
export async function uploadImage(file: File): Promise<string> {
  const body = new FormData()
  body.append("files", file)

  const response = await send(
    "/api/upload",
    { method: "POST", body },
    "That image was refused. Use a JPEG, PNG, GIF or WebP under 5 MB."
  )

  const { keys } = (await response.json()) as { keys?: string[] }
  const key = keys?.at(0)
  if (!key) throw new ComposeError(COULDNT_POST)

  return key
}

/** Post a tweet. Send `content` only when there is text and `mediaKeys` only when there is an image. */
export async function createTweet(input: {
  content?: string
  mediaKeys?: string[]
}): Promise<Tweet> {
  const response = await send(
    "/api/tweets",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    "That tweet was refused. Check the text and the image and try again."
  )

  return (await response.json()) as Tweet
}

/**
 * Put a tweet the API just returned at the top of the first page of the cached timeline, so it
 * shows at once. With nothing cached yet there is nothing to put it into, so the timeline is
 * fetched again instead.
 */
export async function addTweetToTimeline(queryClient: QueryClient, tweet: Tweet): Promise<void> {
  const { queryKey } = timelineQueryOptions

  if (!queryClient.getQueryData(queryKey)?.pages.length) {
    void queryClient.invalidateQueries({ queryKey })
    return
  }

  // A fetch already under way would land with a timeline that lacks the new tweet.
  await queryClient.cancelQueries({ queryKey })
  queryClient.setQueryData(queryKey, (cached) =>
    cached && {
      ...cached,
      pages: cached.pages.map((page, index) =>
        index === 0
          ? { ...page, items: [tweet, ...page.items.filter((item) => item.id !== tweet.id)] }
          : page
      ),
    }
  )
}
