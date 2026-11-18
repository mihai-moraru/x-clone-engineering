import type { ReactElement } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen } from "@testing-library/react"
import { vi } from "vitest"

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

  it("puts the retweet button next to the like button in the action row, with its count", () => {
    renderWithQuery(<TweetCard tweet={{ ...tweet, retweetCount: 2, retweetedByMe: true }} />)

    const actions = screen.getByRole("article").querySelector("footer")
    const like = screen.getByRole("button", { name: "Like" })
    const retweet = screen.getByRole("button", { name: "Retweet" })
    expect(actions).toContainElement(retweet)
    expect(like.nextElementSibling).toBe(retweet)
    expect(retweet).toHaveAttribute("aria-pressed", "true")
    expect(retweet).toHaveTextContent("2")
  })

  it("puts a Reply button after the retweet button, with the reply count beside it", () => {
    renderWithQuery(<TweetCard tweet={{ ...tweet, replyCount: 4 }} />)

    const actions = screen.getByRole("article").querySelector("footer")
    const retweet = screen.getByRole("button", { name: "Retweet" })
    const reply = screen.getByRole("button", { name: "Reply" })
    expect(actions).toContainElement(reply)
    expect(retweet.nextElementSibling).toBe(reply)
    expect(reply).toHaveTextContent("4")
  })

  it("keeps the thread closed until Reply is pressed, and closes it when pressed again", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => undefined)))
    renderWithQuery(<TweetCard tweet={tweet} />)
    const reply = screen.getByRole("button", { name: "Reply" })

    expect(reply).toHaveAttribute("aria-expanded", "false")
    expect(fetch).not.toHaveBeenCalled()
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument()

    fireEvent.click(reply)
    expect(reply).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByRole("textbox", { name: "Reply to Ada Lovelace" })).toBeInTheDocument()
    expect(screen.getByRole("article")).toContainElement(screen.getByRole("textbox"))
    expect(fetch).toHaveBeenCalledTimes(1)

    fireEvent.click(reply)
    expect(reply).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it("shows the thread inside the tweet's own article, under its action row", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => undefined)))
    renderWithQuery(<TweetCard tweet={tweet} />)

    fireEvent.click(screen.getByRole("button", { name: "Reply" }))

    const article = screen.getByRole("article")
    const thread = screen.getByRole("region", { name: "Replies to Ada Lovelace" })
    expect(article).toContainElement(thread)
    expect(article.querySelector("footer")?.nextElementSibling).toBe(thread)
    expect(screen.getByRole("button", { name: "Reply" })).toHaveAttribute("aria-controls", thread.id)
    vi.unstubAllGlobals()
  })

  it("names no button or link with next, more, load or older", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => undefined)))
    renderWithQuery(<TweetCard tweet={tweet} />)
    fireEvent.click(screen.getByRole("button", { name: "Reply" }))

    for (const element of [...screen.getAllByRole("button"), ...screen.queryAllByRole("link")]) {
      expect(element).not.toHaveAccessibleName(/next|more|load|older/i)
    }
    vi.unstubAllGlobals()
  })
})
