import type { ReactNode } from "react"
import {
  QueryClient,
  QueryClientProvider,
  useInfiniteQuery,
  type InfiniteData,
} from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useOptimisticToggle } from "@/hooks/use-optimistic-toggle"
import { timelineQueryOptions, type TimelinePage, type Tweet } from "@/queries/tweets"

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

const MESSAGE = "Couldn't save your like. Try again."

function makeTweet(id: string, overrides: Partial<Tweet> = {}): Tweet {
  return {
    id,
    authorId: "user-1",
    author: { name: "Ada Lovelace", handle: "@ada" },
    content: `Tweet ${id}`,
    mediaUrls: [],
    createdAt: new Date(0).toISOString(),
    likeCount: 4,
    retweetCount: 0,
    replyCount: 0,
    likedByMe: false,
    retweetedByMe: false,
    ...overrides,
  }
}

/** Two pages: the tweet under test is on the second one. */
function seedTimeline(queryClient: QueryClient) {
  const data: InfiniteData<TimelinePage, string | null> = {
    pages: [
      { items: [makeTweet("a"), makeTweet("b", { likeCount: 9, likedByMe: true })], nextCursor: "c1" },
      { items: [makeTweet("c"), makeTweet("d")], nextCursor: null },
    ],
    pageParams: [null, "c1"],
  }
  queryClient.setQueryData(timelineQueryOptions.queryKey, data)
}

type Deferred = {
  resolve: (likeCount: number) => void
  reject: () => void
}

/** Fakes for the two endpoints: every call waits until the test answers it. */
function makeEndpoints() {
  const calls: { method: "POST" | "DELETE"; tweetId: string }[] = []
  const pending: Deferred[] = []

  const send = (method: "POST" | "DELETE") => (tweetId: string) => {
    calls.push({ method, tweetId })
    return new Promise<{ likeCount: number }>((resolve, reject) => {
      pending.push({
        resolve: (likeCount) => {
          resolve({ likeCount })
        },
        reject: () => {
          reject(new Error("500"))
        },
      })
    })
  }

  return { calls, pending, activate: vi.fn(send("POST")), deactivate: vi.fn(send("DELETE")) }
}

function setup(tweetId = "c") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  seedTimeline(queryClient)
  const endpoints = makeEndpoints()
  const timelineFetch = vi.fn(() => Promise.reject(new Error("the timeline must not be refetched")))

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  const view = renderHook(
    () => {
      // Like the home page: observes the timeline, and never refetches what it already holds.
      const { data } = useInfiniteQuery({
        ...timelineQueryOptions,
        queryFn: timelineFetch,
        staleTime: Infinity,
      })
      const tweet = data?.pages.flatMap((page) => page.items).find((item) => item.id === tweetId)
      const toggle = useOptimisticToggle({
        tweetId,
        active: tweet?.likedByMe ?? false,
        flagField: "likedByMe",
        countField: "likeCount",
        activate: endpoints.activate,
        deactivate: endpoints.deactivate,
        errorMessage: MESSAGE,
      })
      return { tweet, toggle }
    },
    { wrapper }
  )

  const tweets = () =>
    Object.fromEntries(
      (
        queryClient.getQueryData<InfiniteData<TimelinePage>>(timelineQueryOptions.queryKey)?.pages ?? []
      )
        .flatMap((page) => page.items)
        .map((tweet) => [tweet.id, tweet])
    )

  return { queryClient, endpoints, timelineFetch, view, tweets }
}

/** Let queued promise callbacks (and TanStack Query's scheduled notifications) run. */
const flush = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)) })

beforeEach(() => {
  vi.mocked(toast.error).mockClear()
})

describe("useOptimisticToggle", () => {
  it("flips the flag and the count at once, before any response, on the right tweet only", async () => {
    const { endpoints, view, tweets } = setup("c")

    act(() => {
      view.result.current.toggle.toggle()
    })

    await waitFor(() => {
      expect(view.result.current.tweet).toMatchObject({ likedByMe: true, likeCount: 5 })
    })
    // The request has not been answered yet.
    expect(endpoints.calls).toEqual([{ method: "POST", tweetId: "c" }])
    // Everything else is as it was, including the same-page neighbour and the other page.
    expect(tweets().a).toMatchObject({ likedByMe: false, likeCount: 4 })
    expect(tweets().b).toMatchObject({ likedByMe: true, likeCount: 9 })
    expect(tweets().d).toMatchObject({ likedByMe: false, likeCount: 4 })
  })

  it("takes the count from the response and does not refetch the timeline", async () => {
    const { endpoints, timelineFetch, view, tweets } = setup("c")

    act(() => {
      view.result.current.toggle.toggle()
    })
    await waitFor(() => {
      expect(endpoints.pending).toHaveLength(1)
    })
    // Someone else liked it too, meanwhile: the server's count wins over the guess of 5.
    act(() => {
      endpoints.pending[0].resolve(7)
    })

    await waitFor(() => {
      expect(tweets().c).toMatchObject({ likedByMe: true, likeCount: 7 })
    })
    expect(timelineFetch).not.toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()
  })

  it("unlikes when the tweet is liked: DELETE, count down by one", async () => {
    const { endpoints, view, tweets } = setup("b")

    act(() => {
      view.result.current.toggle.toggle()
    })

    await waitFor(() => {
      expect(tweets().b).toMatchObject({ likedByMe: false, likeCount: 8 })
    })
    expect(endpoints.calls).toEqual([{ method: "DELETE", tweetId: "b" }])
  })

  it("puts the previous values back, with a message, when saving fails", async () => {
    const { endpoints, view, tweets } = setup("c")

    act(() => {
      view.result.current.toggle.toggle()
    })
    await waitFor(() => {
      expect(tweets().c).toMatchObject({ likedByMe: true, likeCount: 5 })
    })
    act(() => {
      endpoints.pending[0].reject()
    })

    await waitFor(() => {
      expect(tweets().c).toMatchObject({ likedByMe: false, likeCount: 4 })
    })
    expect(toast.error).toHaveBeenCalledExactlyOnceWith(MESSAGE)
    // Other tweets were not touched by the rollback.
    expect(tweets().b).toMatchObject({ likedByMe: true, likeCount: 9 })
  })

  it("sends requests for one tweet in tap order, one at a time", async () => {
    const { endpoints, view, tweets } = setup("c")

    // Like, unlike, like again, as fast as a finger can.
    act(() => {
      view.result.current.toggle.toggle()
      view.result.current.toggle.toggle()
      view.result.current.toggle.toggle()
    })
    await flush()

    // The screen already shows the final state; only the first request has gone out.
    expect(tweets().c).toMatchObject({ likedByMe: true, likeCount: 5 })
    expect(endpoints.calls.map((call) => call.method)).toEqual(["POST"])

    act(() => {
      endpoints.pending[0].resolve(5)
    })
    await waitFor(() => {
      expect(endpoints.calls.map((call) => call.method)).toEqual(["POST", "DELETE"])
    })
    // Still not the end state's response: the middle tap's answer must not undo the last tap.
    expect(tweets().c).toMatchObject({ likedByMe: true, likeCount: 5 })

    act(() => {
      endpoints.pending[1].resolve(4)
    })
    await waitFor(() => {
      expect(endpoints.calls.map((call) => call.method)).toEqual(["POST", "DELETE", "POST"])
    })
    act(() => {
      endpoints.pending[2].resolve(5)
    })

    // The server's last word (liked) is the button's last word, and the count counted once.
    await waitFor(() => {
      expect(view.result.current.toggle.isPending).toBe(false)
    })
    expect(tweets().c).toMatchObject({ likedByMe: true, likeCount: 5 })
  })

  it("never applies a count twice when taps pile up", async () => {
    const { endpoints, view, tweets } = setup("c")

    act(() => {
      view.result.current.toggle.toggle()
      view.result.current.toggle.toggle()
    })
    await flush()
    // Like then unlike: back to where it started, not 3 or 5 off.
    expect(tweets().c).toMatchObject({ likedByMe: false, likeCount: 4 })

    act(() => {
      endpoints.pending[0].resolve(5)
    })
    await waitFor(() => {
      expect(endpoints.pending).toHaveLength(2)
    })
    act(() => {
      endpoints.pending[1].resolve(4)
    })

    await waitFor(() => {
      expect(view.result.current.toggle.isPending).toBe(false)
    })
    expect(tweets().c).toMatchObject({ likedByMe: false, likeCount: 4 })
    expect(endpoints.calls.map((call) => call.method)).toEqual(["POST", "DELETE"])
  })

  it("keeps the screen steady while a later tap is queued, and rolls back once the last one has failed", async () => {
    const { endpoints, view, tweets } = setup("c")

    act(() => {
      view.result.current.toggle.toggle() // like
      view.result.current.toggle.toggle() // unlike
      view.result.current.toggle.toggle() // like again
    })
    await flush()

    // The first request fails: the unlike and the second like are still to be sent, so the
    // button must not jump back yet.
    act(() => {
      endpoints.pending[0].reject()
    })
    await waitFor(() => {
      expect(endpoints.calls).toHaveLength(2)
    })
    expect(tweets().c).toMatchObject({ likedByMe: true, likeCount: 5 })

    // The queued requests fail too: now the button goes back to what the server last confirmed.
    act(() => {
      endpoints.pending[1].reject()
    })
    await waitFor(() => {
      expect(endpoints.calls).toHaveLength(3)
    })
    act(() => {
      endpoints.pending[2].reject()
    })

    await waitFor(() => {
      expect(tweets().c).toMatchObject({ likedByMe: false, likeCount: 4 })
    })
    expect(toast.error).toHaveBeenCalledTimes(3)
  })

  it("lets a later tap go through after an earlier one failed", async () => {
    const { endpoints, view, tweets } = setup("c")

    act(() => {
      view.result.current.toggle.toggle()
    })
    await waitFor(() => {
      expect(endpoints.pending).toHaveLength(1)
    })
    act(() => {
      endpoints.pending[0].reject()
    })
    await waitFor(() => {
      expect(tweets().c).toMatchObject({ likedByMe: false, likeCount: 4 })
    })

    // Tap again once the failure is over: it is a fresh like, from the restored state.
    act(() => {
      view.result.current.toggle.toggle()
    })
    await waitFor(() => {
      expect(tweets().c).toMatchObject({ likedByMe: true, likeCount: 5 })
    })
    expect(endpoints.calls.map((call) => call.method)).toEqual(["POST", "POST"])
    act(() => {
      endpoints.pending[1].resolve(5)
    })
    await waitFor(() => {
      expect(view.result.current.toggle.isPending).toBe(false)
    })
    expect(tweets().c).toMatchObject({ likedByMe: true, likeCount: 5 })
  })
})
