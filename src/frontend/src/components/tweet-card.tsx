import { LikeButton } from "@/components/like-button"
import { formatRelativeTime } from "@/lib/format-relative-time"
import { formatHandle } from "@/lib/user"
import type { Tweet } from "@/queries/tweets"

export function TweetCard({ tweet }: { tweet: Tweet }) {
  const image = tweet.mediaUrls.at(0)

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
      {/* The action row: the like button now, retweet (XC-11) and reply (XC-12) will sit beside it. */}
      <footer className="-ml-2.5 flex items-center gap-4">
        <LikeButton tweet={tweet} />
      </footer>
    </article>
  )
}
