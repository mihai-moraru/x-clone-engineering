import { useId } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { RepeatIcon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { useOptimisticToggle } from "@/hooks/use-optimistic-toggle"
import { cn } from "@/lib/utils"
import { retweetTweet, unretweetTweet } from "@/queries/retweets"
import type { Tweet } from "@/queries/tweets"

/**
 * One tap retweets, the next tap undoes it. The name is "Retweet" and the count is its
 * description, so a screen reader says "Retweet, toggle button, pressed, 3". The retweeted state
 * shows as a bolder icon and count as well as a colour.
 */
export function RetweetButton({
  tweet,
}: {
  tweet: Pick<Tweet, "id" | "retweetedByMe" | "retweetCount">
}) {
  const countId = useId()
  const { toggle } = useOptimisticToggle({
    tweetId: tweet.id,
    active: tweet.retweetedByMe,
    flagField: "retweetedByMe",
    countField: "retweetCount",
    activate: retweetTweet,
    deactivate: unretweetTweet,
    errorMessage: "Couldn't save your retweet. Try again.",
  })

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label="Retweet"
      aria-pressed={tweet.retweetedByMe}
      aria-describedby={countId}
      onClick={toggle}
      className={cn(
        "text-muted-foreground hover:text-emerald-600 aria-pressed:text-emerald-600 dark:hover:text-emerald-400 dark:aria-pressed:text-emerald-400",
        tweet.retweetedByMe && "font-semibold"
      )}
    >
      <HugeiconsIcon
        icon={RepeatIcon}
        className="size-4"
        strokeWidth={tweet.retweetedByMe ? 2.5 : 1.5}
        aria-hidden="true"
      />
      <span id={countId} className="tabular-nums">
        {tweet.retweetCount}
      </span>
    </Button>
  )
}
