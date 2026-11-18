import { useId } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { FavouriteIcon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { useOptimisticToggle } from "@/hooks/use-optimistic-toggle"
import { likeTweet, unlikeTweet } from "@/queries/likes"
import type { Tweet } from "@/queries/tweets"

/**
 * One tap likes, the next tap unlikes. The name is "Like" and the count is its description, so a
 * screen reader says "Like, toggle button, pressed, 3". The liked state is a filled heart as well
 * as a colour.
 */
export function LikeButton({ tweet }: { tweet: Pick<Tweet, "id" | "likedByMe" | "likeCount"> }) {
  const countId = useId()
  const { toggle } = useOptimisticToggle({
    tweetId: tweet.id,
    active: tweet.likedByMe,
    flagField: "likedByMe",
    countField: "likeCount",
    activate: likeTweet,
    deactivate: unlikeTweet,
    errorMessage: "Couldn't save your like. Try again.",
  })

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label="Like"
      aria-pressed={tweet.likedByMe}
      aria-describedby={countId}
      onClick={toggle}
      className="text-muted-foreground hover:text-rose-600 aria-pressed:text-rose-600 dark:hover:text-rose-400 dark:aria-pressed:text-rose-400"
    >
      <HugeiconsIcon
        icon={FavouriteIcon}
        className="size-4"
        fill={tweet.likedByMe ? "currentColor" : "none"}
        aria-hidden="true"
      />
      <span id={countId} className="tabular-nums">
        {tweet.likeCount}
      </span>
    </Button>
  )
}
