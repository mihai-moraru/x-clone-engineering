/** What the retweet endpoints answer: the tweet's retweet count after the change. */
export type RetweetResult = { retweetCount: number }

async function sendRetweet(tweetId: string, method: "POST" | "DELETE"): Promise<RetweetResult> {
  const response = await fetch(`/api/tweets/${encodeURIComponent(tweetId)}/retweet`, {
    method,
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error(`Could not save the retweet (${response.status.toString()})`)
  }

  return (await response.json()) as RetweetResult
}

/** Retweet a tweet. Idempotent: retweeting a tweet I already retweeted changes nothing. */
export function retweetTweet(tweetId: string): Promise<RetweetResult> {
  return sendRetweet(tweetId, "POST")
}

/** Undo my retweet of a tweet. Idempotent too. */
export function unretweetTweet(tweetId: string): Promise<RetweetResult> {
  return sendRetweet(tweetId, "DELETE")
}
