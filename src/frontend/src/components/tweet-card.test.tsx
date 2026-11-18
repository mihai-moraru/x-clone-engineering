import type { ReactElement } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"

import { TweetCard } from "@/components/tweet-card"
import { formatHandle } from "@/lib/user"
import type { Tweet } from "@/queries/tweets"

const tweet: Tweet = {
  id: "0b0e7c0e-4f0a-4c57-9d3b-0f6d1f1f2a10",
  authorId: "user-1",
  author: { name: "Ada Lovelace", handle: "@ada" },
  content: "The Analytical Engine weaves algebraic patterns.",
  mediaUrls: [],
  createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  likeCount: 0,
  retweetCount: 0,
  replyCount: 0,
  likedByMe: false,
  retweetedByMe: false,
}

/** The card holds a like button, which saves through TanStack Query, so it needs a client. */
function renderWithQuery(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe("formatHandle", () => {
  it("keeps a handle that already has its @", () => {
    expect(formatHandle("@ada")).toBe("@ada")
  })

  it("adds the @ when the handle comes without one", () => {
    expect(formatHandle("ada")).toBe("@ada")
  })
})

describe("TweetCard", () => {
  it("shows the author's name and handle, when it was posted, and the text", () => {
    renderWithQuery(<TweetCard tweet={tweet} />)

    const card = screen.getByRole("article")
    expect(card).toHaveTextContent("Ada Lovelace")
    expect(card).toHaveTextContent("@ada")
    expect(screen.getByText(tweet.content)).toBeInTheDocument()

    const time = screen.getByText("5m")
    expect(time.tagName).toBe("TIME")
    expect(time).toHaveAttribute("datetime", tweet.createdAt)
  })

  it("shows no image when the tweet has none", () => {
    renderWithQuery(<TweetCard tweet={tweet} />)

    expect(screen.queryByRole("img")).not.toBeInTheDocument()
  })

  it("shows the image when the tweet has one", () => {
    const url = "https://example.com/media/picture.png"
    renderWithQuery(<TweetCard tweet={{ ...tweet, mediaUrls: [url] }} />)

    expect(screen.getByRole("img")).toHaveAttribute("src", url)
  })

  it("keeps the action row, with the like button, under the text", () => {
    renderWithQuery(<TweetCard tweet={{ ...tweet, likeCount: 3 }} />)

    const actions = screen.getByRole("article").querySelector("footer")
    expect(actions).not.toBeNull()
    expect(actions).toContainElement(screen.getByRole("button", { name: "Like" }))
  })
})
