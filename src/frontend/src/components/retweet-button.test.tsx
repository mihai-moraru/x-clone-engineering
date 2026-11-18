import {
  QueryClient,
  QueryClientProvider,
  useInfiniteQuery,
  type InfiniteData,
} from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { toast } from "sonner"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { LikeButton } from "@/components/like-button"
import { RetweetButton } from "@/components/retweet-button"
import { timelineQueryOptions, type TimelinePage, type Tweet } from "@/queries/tweets"

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

const tweet: Tweet = {
  id: "0b0e7c0e-4f0a-4c57-9d3b-0f6d1f1f2a10",
  authorId: "user-1",
  author: { name: "Ada Lovelace", handle: "@ada" },
  content: "The Analytical Engine weaves algebraic patterns.",
  mediaUrls: [],
  createdAt: new Date(0).toISOString(),
  likeCount: 5,
  retweetCount: 3,
  replyCount: 0,
  likedByMe: false,
  retweetedByMe: false,
}

/** What the page does: reads the tweet from the timeline cache and shows its buttons. */
function Timeline() {
  const { data } = useInfiniteQuery({ ...timelineQueryOptions, staleTime: Infinity })
  const current = data?.pages.flatMap((page) => page.items).find((item) => item.id === tweet.id)
  return current ? (
    <>
      <LikeButton tweet={current} />
      <RetweetButton tweet={current} />
    </>
  ) : null
}

function renderTimeline(initial: Partial<Tweet> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const data: InfiniteData<TimelinePage, string | null> = {
    pages: [{ items: [{ ...tweet, ...initial }], nextCursor: null }],
    pageParams: [null],
  }
  queryClient.setQueryData(timelineQueryOptions.queryKey, data)
  render(
    <QueryClientProvider client={queryClient}>
      <Timeline />
    </QueryClientProvider>
  )
}

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock)
  vi.mocked(toast.error).mockClear()
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

function respondWith(body: unknown, status = 200) {
  fetchMock.mockResolvedValueOnce(Response.json(body, { status }))
}

const retweetButton = () => screen.getByRole("button", { name: "Retweet" })

describe("RetweetButton", () => {
  it("is a button named Retweet, not pressed, with the count in view", () => {
    renderTimeline()

    const button = retweetButton()
    expect(button).toHaveAttribute("type", "button")
    expect(button).toHaveAttribute("aria-pressed", "false")
    expect(button).toHaveTextContent("3")
    // The count is read out with the button.
    expect(button).toHaveAccessibleDescription("3")
  })

  it("is pressed when I already retweeted the tweet, and shows it by more than colour", () => {
    renderTimeline({ retweetedByMe: true, retweetCount: 4 })

    const button = retweetButton()
    expect(button).toHaveAttribute("aria-pressed", "true")
    // A bolder icon and a bolder count, on top of the colour.
    expect(button.querySelector("svg")).toHaveAttribute("stroke-width", "2.5")
    expect(button).toHaveClass("font-semibold")
  })

  it("shows a lighter icon when I have not retweeted the tweet", () => {
    renderTimeline()

    const button = retweetButton()
    expect(button.querySelector("svg")).toHaveAttribute("stroke-width", "1.5")
    expect(button).not.toHaveClass("font-semibold")
  })

  it("retweets with one tap: pressed and +1 at once, POST to the retweet endpoint", async () => {
    // A response that has not arrived yet: the change shown below is the optimistic one.
    fetchMock.mockReturnValueOnce(new Promise(() => undefined))
    renderTimeline()

    fireEvent.click(retweetButton())

    await waitFor(() => {
      expect(retweetButton()).toHaveAttribute("aria-pressed", "true")
    })
    expect(retweetButton()).toHaveTextContent("4")
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`/api/tweets/${tweet.id}/retweet`)
    expect(init).toMatchObject({ method: "POST", credentials: "include" })
  })

  it("undoes with a second tap: DELETE, and the count the server answers with", async () => {
    respondWith({ retweetCount: 4 })
    respondWith({ retweetCount: 3 })
    renderTimeline()

    fireEvent.click(retweetButton())
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })
    await waitFor(() => {
      expect(retweetButton()).toHaveTextContent("4")
    })

    fireEvent.click(retweetButton())
    await waitFor(() => {
      expect(retweetButton()).toHaveAttribute("aria-pressed", "false")
    })
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })
    expect(fetchMock.mock.calls[1][0]).toBe(`/api/tweets/${tweet.id}/retweet`)
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: "DELETE", credentials: "include" })
    await waitFor(() => {
      expect(retweetButton()).toHaveTextContent("3")
    })
  })

  it("undoes a retweet I already made: DELETE first, count down by one", async () => {
    fetchMock.mockReturnValueOnce(new Promise(() => undefined))
    renderTimeline({ retweetedByMe: true, retweetCount: 4 })

    fireEvent.click(retweetButton())

    await waitFor(() => {
      expect(retweetButton()).toHaveAttribute("aria-pressed", "false")
    })
    expect(retweetButton()).toHaveTextContent("3")
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "DELETE" })
  })

  it("goes back to what it was, with its own message, when the server says no", async () => {
    respondWith({ error: "boom" }, 500)
    renderTimeline()

    fireEvent.click(retweetButton())

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledExactlyOnceWith("Couldn't save your retweet. Try again.")
    })
    await waitFor(() => {
      expect(retweetButton()).toHaveAttribute("aria-pressed", "false")
    })
    expect(retweetButton()).toHaveTextContent("3")
  })

  it("keeps the retweet and the like of one tweet apart: neither moves the other's state or count", async () => {
    // The retweet is saved; the like fails and rolls back without touching the retweet.
    respondWith({ retweetCount: 4 })
    respondWith({ error: "boom" }, 500)
    renderTimeline()

    fireEvent.click(retweetButton())
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })
    fireEvent.click(screen.getByRole("button", { name: "Like" }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledExactlyOnceWith("Couldn't save your like. Try again.")
    })
    const like = screen.getByRole("button", { name: "Like" })
    await waitFor(() => {
      expect(like).toHaveAttribute("aria-pressed", "false")
    })
    expect(like).toHaveTextContent("5")
    expect(retweetButton()).toHaveAttribute("aria-pressed", "true")
    expect(retweetButton()).toHaveTextContent("4")
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      `/api/tweets/${tweet.id}/retweet`,
      `/api/tweets/${tweet.id}/like`,
    ])
  })

  it("can be reached and pressed with the keyboard like any button", async () => {
    fetchMock.mockReturnValueOnce(new Promise(() => undefined))
    renderTimeline()

    const button = retweetButton()
    act(() => {
      button.focus()
    })
    expect(button).toHaveFocus()
    fireEvent.click(button)

    await waitFor(() => {
      expect(button).toHaveAttribute("aria-pressed", "true")
    })
  })
})
