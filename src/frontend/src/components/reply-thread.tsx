import { useState, type ChangeEvent, type FormEvent } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { validateTweetText } from "@/lib/compose"
import { formatRelativeTime } from "@/lib/format-relative-time"
import { formatHandle } from "@/lib/user"
import {
  RepliesUnavailableError,
  createReply,
  recordReply,
  repliesQueryOptions,
  replyErrorMessage,
} from "@/queries/replies"
import type { Tweet } from "@/queries/tweets"

/** One reply: who wrote it, when, the text and the image if there is one. Replies are single level, so it has no actions. */
function Reply({ reply }: { reply: Tweet }) {
  const image = reply.mediaUrls.at(0)

  return (
    <li className="flex flex-col gap-1.5 border-t border-border py-3 first:border-t-0">
      <div className="flex min-w-0 items-baseline gap-1.5 text-sm">
        <span className="truncate font-bold text-foreground">{reply.author.name}</span>
        <span className="truncate text-muted-foreground">{formatHandle(reply.author.handle)}</span>
        <span aria-hidden="true" className="text-muted-foreground">
          ·
        </span>
        <time
          dateTime={reply.createdAt}
          title={new Date(reply.createdAt).toLocaleString()}
          className="shrink-0 text-muted-foreground"
        >
          {formatRelativeTime(reply.createdAt)}
        </time>
      </div>
      {reply.content ? (
        <p className="text-sm break-words whitespace-pre-wrap text-foreground">{reply.content}</p>
      ) : null}
      {image ? (
        <img
          src={image}
          alt={`Image posted by ${reply.author.name}`}
          loading="lazy"
          className="max-h-[320px] w-full rounded-lg border border-border object-cover"
        />
      ) : null}
    </li>
  )
}

/**
 * The thread under a tweet in the timeline: its replies, oldest first, and a form to add one.
 * It only exists while the thread is open, so the replies are fetched when it is opened. A new
 * reply goes to the end of the list at once and adds one to the tweet's `replyCount`.
 */
export function ReplyThread({
  tweet,
  id,
}: {
  tweet: Pick<Tweet, "id" | "author">
  /** The element id the "Reply" button points at with `aria-controls`. */
  id: string
}) {
  const queryClient = useQueryClient()
  const replies = useQuery(repliesQueryOptions(tweet.id))
  const [text, setText] = useState("")

  const post = useMutation({
    mutationFn: (content: string) => createReply({ parentTweetId: tweet.id, content }),
    onSuccess: async (reply) => {
      await recordReply(queryClient, tweet.id, reply)
      setText("")
    },
  })

  const posting = post.isPending
  const textError = validateTweetText(text)
  const canPost = !posting && !textError && text.trim().length > 0
  const unavailable = replies.error instanceof RepliesUnavailableError

  function handleTextChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setText(event.target.value)
    if (post.isError) post.reset()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // A form can be submitted without the button (the keyboard, a script), so check again here.
    if (!canPost) return

    post.mutate(text.trim())
  }

  return (
    <section id={id} aria-label={`Replies to ${tweet.author.name}`} className="flex flex-col gap-3">
      {replies.status === "pending" ? (
        <p role="status" className="text-sm text-muted-foreground">
          Loading replies...
        </p>
      ) : null}

      {unavailable ? (
        <p className="text-sm text-muted-foreground">Replies aren't available for this tweet.</p>
      ) : null}

      {replies.status === "error" && !unavailable ? (
        <div className="flex items-center gap-3">
          <p role="alert" className="text-sm text-destructive">
            Couldn't load the replies.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => void replies.refetch()}>
            Try again
          </Button>
        </div>
      ) : null}

      {replies.status === "success" && replies.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No replies yet.</p>
      ) : null}

      {replies.status === "success" && replies.data.length > 0 ? (
        <ul className="flex flex-col">
          {replies.data.map((reply) => (
            <Reply key={reply.id} reply={reply} />
          ))}
        </ul>
      ) : null}

      {/* With no replies to show for this tweet there is nobody to reply to. */}
      {unavailable ? null : (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-2">
          <Textarea
            aria-label={`Reply to ${tweet.author.name}`}
            aria-invalid={textError ? true : undefined}
            placeholder="Post your reply"
            value={text}
            readOnly={posting}
            onChange={handleTextChange}
            className="min-h-12 text-sm"
          />
          {textError ? (
            <p role="alert" className="text-sm text-destructive">
              {textError}
            </p>
          ) : null}
          {post.isError ? (
            <p role="alert" className="text-sm text-destructive">
              {replyErrorMessage(post.error)}
            </p>
          ) : null}
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={!canPost}>
              Post reply
            </Button>
          </div>
        </form>
      )}
    </section>
  )
}
