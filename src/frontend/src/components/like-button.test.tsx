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
import { timelineQueryOptions, type TimelinePage, type Tweet } from "@/queries/tweets"

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

const tweet: Tweet = {
  id: "0b0e7c0e-4f0a-4c57-9d3b-0f6d1f1f2a10",
  authorId: "user-1",
  author: { name: "Ada Lovelace", handle: "@ada" },
  content: "The Analytical Engine weaves algebraic patterns.",
  mediaUrls: [],
  createdAt: new Date(0).toISOString(),
  likeCount: 3,
  retweetCount: 0,
  replyCount: 0,
  likedByMe: false,
  retweetedByMe: false,
}

/** What the page does: reads the tweet from the timeline cache and shows its like button. */
function Timeline() {
  const { data } = useInfiniteQuery({ ...timelineQueryOptions, staleTime: Infinity })
  const current = data?.pages.flatMap((page) => page.items).find((item) => item.id === tweet.id)
  return current ? <LikeButton tweet={current} /> : null
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

describe("LikeButton", () => {
  it("is a button named Like, not pressed, with the count in view", () => {
    renderTimeline()

    const button = screen.getByRole("button", { name: "Like" })
    expect(button).toHaveAttribute("type", "button")
    expect(button).toHaveAttribute("aria-pressed", "false")
    expect(button).toHaveTextContent("3")
    // The count is read out with the button.
    expect(button).toHaveAccessibleDescription("3")
  })

  it("is pressed when I already like the tweet, and shows it with a filled heart", () => {
    renderTimeline({ likedByMe: true, likeCount: 4 })

    const button = screen.getByRole("button", { name: "Like" })
    expect(button).toHaveAttribute("aria-pressed", "true")
    expect(button.querySelector("svg")).toHaveAttribute("fill", "currentColor")
  })

  it("shows an outline heart when I do not like the tweet", () => {
    renderTimeline()

    expect(screen.getByRole("button", { name: "Like" }).querySelector("svg")).toHaveAttribute(
      "fill",
      "none"
    )
  })

  it("likes with one tap: pressed and +1 at once, POST to the like endpoint", async () => {
    // A response that has not arrived yet: the change shown below is the optimistic one.
    fetchMock.mockReturnValueOnce(new Promise(() => undefined))
    renderTimeline()

    fireEvent.click(screen.getByRole("button", { name: "Like" }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Like" })).toHaveAttribute("aria-pressed", "true")
    })
    expect(screen.getByRole("button", { name: "Like" })).toHaveTextContent("4")
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`/api/tweets/${tweet.id}/like`)
    expect(init).toMatchObject({ method: "POST", credentials: "include" })
  })

  it("unlikes with a second tap: DELETE, and the count the server answers with", async () => {
    respondWith({ likeCount: 4 })
    respondWith({ likeCount: 3 })
    renderTimeline()

    fireEvent.click(screen.getByRole("button", { name: "Like" }))
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Like" })).toHaveTextContent("4")
    })

    fireEvent.click(screen.getByRole("button", { name: "Like" }))
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Like" })).toHaveAttribute("aria-pressed", "false")
    })
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: "DELETE", credentials: "include" })
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Like" })).toHaveTextContent("3")
    })
  })

  it("goes back to what it was, with a message, when the server says no", async () => {
    respondWith({ error: "boom" }, 500)
    renderTimeline()

    fireEvent.click(screen.getByRole("button", { name: "Like" }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledExactlyOnceWith("Couldn't save your like. Try again.")
    })
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Like" })).toHaveAttribute("aria-pressed", "false")
    })
    expect(screen.getByRole("button", { name: "Like" })).toHaveTextContent("3")
  })

  it("can be reached and pressed with the keyboard like any button", async () => {
    fetchMock.mockReturnValueOnce(new Promise(() => undefined))
    renderTimeline()

    const button = screen.getByRole("button", { name: "Like" })
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
