/** What the like endpoints answer: the tweet's like count after the change. */
export type LikeResult = { likeCount: number }

async function sendLike(tweetId: string, method: "POST" | "DELETE"): Promise<LikeResult> {
  const response = await fetch(`/api/tweets/${encodeURIComponent(tweetId)}/like`, {
    method,
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error(`Could not save the like (${response.status.toString()})`)
  }

  return (await response.json()) as LikeResult
}

/** Like a tweet. Idempotent: liking a tweet I already like changes nothing. */
export function likeTweet(tweetId: string): Promise<LikeResult> {
  return sendLike(tweetId, "POST")
}

/** Remove my like from a tweet. Idempotent too. */
export function unlikeTweet(tweetId: string): Promise<LikeResult> {
  return sendLike(tweetId, "DELETE")
}
