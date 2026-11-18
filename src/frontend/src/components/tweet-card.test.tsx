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
    render(<TweetCard tweet={tweet} />)

    const card = screen.getByRole("article")
    expect(card).toHaveTextContent("Ada Lovelace")
    expect(card).toHaveTextContent("@ada")
    expect(screen.getByText(tweet.content)).toBeInTheDocument()

    const time = screen.getByText("5m")
    expect(time.tagName).toBe("TIME")
    expect(time).toHaveAttribute("datetime", tweet.createdAt)
  })

  it("shows no image when the tweet has none", () => {
    render(<TweetCard tweet={tweet} />)

    expect(screen.queryByRole("img")).not.toBeInTheDocument()
  })

  it("shows the image when the tweet has one", () => {
    const url = "https://example.com/media/picture.png"
    render(<TweetCard tweet={{ ...tweet, mediaUrls: [url] }} />)

    expect(screen.getByRole("img")).toHaveAttribute("src", url)
  })
})
