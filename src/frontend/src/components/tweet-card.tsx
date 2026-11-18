import { useId, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Comment01Icon } from "@hugeicons/core-free-icons"

import { LikeButton } from "@/components/like-button"
import { ReplyThread } from "@/components/reply-thread"
import { RetweetButton } from "@/components/retweet-button"
import { Button } from "@/components/ui/button"
import { formatRelativeTime } from "@/lib/format-relative-time"
import { formatHandle } from "@/lib/user"
import type { Tweet } from "@/queries/tweets"

export function TweetCard({ tweet }: { tweet: Tweet }) {
  const image = tweet.mediaUrls.at(0)
  const threadId = useId()
  const countId = useId()
  // The thread is closed by default; opening it is what loads the replies.
  const [threadOpen, setThreadOpen] = useState(false)

  return (
    <article className="flex flex-col gap-2 border-b border-border px-4 py-3">
      <header className="flex min-w-0 items-baseline gap-1.5 text-sm">
        <span className="truncate font-bold text-foreground">
          {tweet.author.name}
        </span>
        <span className="truncate text-muted-foreground">
          {formatHandle(tweet.author.handle)}
        </span>
        <span aria-hidden="true" className="text-muted-foreground">
          ·
        </span>
        <time
          dateTime={tweet.createdAt}
          title={new Date(tweet.createdAt).toLocaleString()}
          className="shrink-0 text-muted-foreground"
        >
          {formatRelativeTime(tweet.createdAt)}
        </time>
      </header>
      {tweet.content ? (
        <p className="text-sm break-words whitespace-pre-wrap text-foreground">
          {tweet.content}
        </p>
      ) : null}
      {image ? (
        <img
          src={image}
          alt={`Image posted by ${tweet.author.name}`}
          loading="lazy"
          className="max-h-[510px] w-full rounded-lg border border-border object-cover"
        />
      ) : null}
      <footer className="-ml-2.5 flex items-center gap-4">
        <LikeButton tweet={tweet} />
        <RetweetButton tweet={tweet} />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Reply"
          aria-expanded={threadOpen}
          aria-controls={threadOpen ? threadId : undefined}
          aria-describedby={countId}
          onClick={() => {
            setThreadOpen((open) => !open)
          }}
          className="text-muted-foreground hover:text-sky-600 aria-expanded:text-sky-600 dark:hover:text-sky-400 dark:aria-expanded:text-sky-400"
        >
          <HugeiconsIcon icon={Comment01Icon} className="size-4" aria-hidden="true" />
          <span id={countId} className="tabular-nums">
            {tweet.replyCount}
          </span>
        </Button>
      </footer>
      {threadOpen ? <ReplyThread id={threadId} tweet={tweet} /> : null}
    </article>
  )
}
