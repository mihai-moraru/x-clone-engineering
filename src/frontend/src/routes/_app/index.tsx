import { useEffect, useRef } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useInfiniteQuery } from "@tanstack/react-query"

import { seo } from "@/lib/seo"
import { timelineQueryOptions } from "@/queries/tweets"
import { Button } from "@/components/ui/button"
import { TweetCard } from "@/components/tweet-card"

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: seo({ title: "Home | X Clone" }),
  }),
  component: Home,
})

function Home() {
  const {
    data,
    status,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery(timelineQueryOptions)

  // Infinite scroll: an invisible marker sits under the last tweet, and coming near it loads the
  // next page. The observer is rebuilt after every page, so a marker that is still in view once
  // a page lands (a short page, a tall screen) keeps loading until the screen is full.
  const endRef = useRef<HTMLDivElement>(null)
  const canLoadMore = hasNextPage && !isFetchingNextPage && !isFetchNextPageError

  useEffect(() => {
    const end = endRef.current
    if (!end || !canLoadMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void fetchNextPage()
      },
      { rootMargin: "200px" }
    )
    observer.observe(end)

    return () => {
      observer.disconnect()
    }
  }, [canLoadMore, fetchNextPage])

  const tweets = data?.pages.flatMap((page) => page.items) ?? []

  return (
    <div className="flex flex-col">
      <h1 className="border-b border-border px-4 pb-3 text-xl font-bold text-foreground">
        Home
      </h1>

      {status === "pending" ? (
        <p role="status" className="px-4 py-8 text-center text-sm text-muted-foreground">
          Loading tweets...
        </p>
      ) : null}

      {status === "error" ? (
        <div className="flex flex-col items-center gap-3 px-4 py-8">
          <p role="alert" className="text-sm text-destructive">
            Couldn't load the timeline. Check your connection and try again.
          </p>
          <Button type="button" variant="outline" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : null}

      {status === "success" && tweets.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          No tweets yet.
        </p>
      ) : null}

      {tweets.map((tweet) => (
        <TweetCard key={tweet.id} tweet={tweet} />
      ))}

      <div ref={endRef} aria-hidden="true" />

      {isFetchingNextPage ? (
        <p role="status" className="px-4 py-4 text-center text-sm text-muted-foreground">
          Loading tweets...
        </p>
      ) : null}

      {isFetchNextPageError ? (
        <div className="flex flex-col items-center gap-3 px-4 py-4">
          <p role="alert" className="text-sm text-destructive">
            Couldn't load older tweets.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => void fetchNextPage()}
          >
            Try again
          </Button>
        </div>
      ) : null}
    </div>
  )
}
