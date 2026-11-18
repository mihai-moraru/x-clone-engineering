import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, vi } from "vitest"

import { ReplyThread } from "@/components/reply-thread"
import { MAX_TWEET_LENGTH, validateTweetText } from "@/lib/compose"
import { timelineQueryOptions, type TimelinePage, type Tweet } from "@/queries/tweets"

const PARENT = { id: "parent-1", author: { name: "Ada Lovelace", handle: "@ada" } }
const TRY_AGAIN = "Couldn't post your reply. Try again."

function makeReply(id: string, content: string, overrides: Partial<Tweet> = {}): Tweet {
  return {
    id,
    authorId: "user-2",
    author: { name: "Grace Hopper", handle: "@grace" },
    content,
    mediaUrls: [],
    createdAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    likeCount: 0,
    retweetCount: 0,
    replyCount: 0,
    likedByMe: false,
    retweetedByMe: false,
    ...overrides,
  }
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
}

let fetchMock: ReturnType<typeof vi.fn>
let queryClient: QueryClient

function renderThread() {
  return render(
    <QueryClientProvider client={queryClient}>
      <ReplyThread id="thread" tweet={PARENT} />
    </QueryClientProvider>
  )
}

const textbox = () => screen.getByRole("textbox", { name: "Reply to Ada Lovelace" })
const postButton = () => screen.getByRole("button", { name: "Post reply" })

function type(text: string) {
  fireEvent.change(textbox(), { target: { value: text } })
}

/** The requests made to `url` with `method`, as parsed JSON bodies. */
function bodiesOf(method: string, url: string): unknown[] {
  return fetchMock.mock.calls
    .filter(([called, init]) => called === url && ((init as RequestInit | undefined)?.method ?? "GET") === method)
    .map(([, init]) => JSON.parse(String((init as RequestInit).body)) as unknown)
}

function callsTo(url: string, method: string) {
  return fetchMock.mock.calls.filter(
    ([called, init]) => called === url && ((init as RequestInit | undefined)?.method ?? "GET") === method
  )
}

/** Serve the replies GET with `replies` (or a status), and the POST with whatever `post` returns. */
function serve(options: { replies?: Tweet[] | number; post?: () => Response | Promise<Response> }) {
  fetchMock.mockImplementation((url: string, init?: RequestInit) => {
    if (url === `/api/tweets/${PARENT.id}/replies`) {
      const { replies = [] } = options
      return Promise.resolve(typeof replies === "number" ? json(replies, {}) : json(200, { items: replies }))
    }
    if (url === "/api/tweets" && init?.method === "POST") {
      return Promise.resolve(options.post?.() ?? json(500, {}))
    }
    return Promise.reject(new Error(`unexpected request: ${url}`))
  })
}

function cachedTimeline(...items: Tweet[]) {
  const page: TimelinePage = { items, nextCursor: null }
  queryClient.setQueryData(timelineQueryOptions.queryKey, { pages: [page], pageParams: [null] })
}

function cachedReplyCount(tweetId: string) {
  return queryClient
    .getQueryData(timelineQueryOptions.queryKey)
    ?.pages.flatMap((page) => page.items)
    .find((tweet) => tweet.id === tweetId)?.replyCount
}

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  fetchMock = vi.fn()
  vi.stubGlobal("fetch", fetchMock)
  return () => {
    vi.unstubAllGlobals()
  }
})

describe("ReplyThread: the replies", () => {
  it("shows a status message while the replies load", async () => {
    serve({ replies: [makeReply("r1", "First!")] })
    renderThread()

    expect(screen.getByRole("status")).toHaveTextContent("Loading replies...")
    expect(await screen.findByText("First!")).toBeInTheDocument()
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("asks for this tweet's replies, with the sign-in", async () => {
    serve({ replies: [] })
    renderThread()
    await screen.findByText("No replies yet.")

    const calls = callsTo(`/api/tweets/${PARENT.id}/replies`, "GET")
    expect(calls).toHaveLength(1)
    expect((calls[0][1] as RequestInit).credentials).toBe("include")
  })

  it("lists the replies in the order the API sends them, oldest first", async () => {
    serve({ replies: [makeReply("r1", "Oldest"), makeReply("r2", "Middle"), makeReply("r3", "Newest")] })
    renderThread()

    const items = await screen.findAllByRole("listitem")
    expect(items.map((item) => within(item).getByText(/Oldest|Middle|Newest/).textContent)).toEqual([
      "Oldest",
      "Middle",
      "Newest",
    ])
  })

  it("shows each reply's author name and handle, when it was posted and the text", async () => {
    serve({ replies: [makeReply("r1", "Nice one")] })
    renderThread()

    const item = await screen.findByRole("listitem")
    expect(item).toHaveTextContent("Grace Hopper")
    expect(item).toHaveTextContent("@grace")
    expect(item).toHaveTextContent("Nice one")
    const time = within(item).getByText("3m")
    expect(time.tagName).toBe("TIME")
  })

  it("shows the image of a reply that has one, and none for one that has not", async () => {
    const url = "https://example.com/media/reply.png"
    serve({ replies: [makeReply("r1", "With a picture", { mediaUrls: [url] }), makeReply("r2", "Text only")] })
    renderThread()

    const [withImage, plain] = await screen.findAllByRole("listitem")
    expect(within(withImage).getByRole("img")).toHaveAttribute("src", url)
    expect(within(plain).queryByRole("img")).not.toBeInTheDocument()
  })

  it("gives a reply no Reply, like or retweet button: replies are single level", async () => {
    serve({ replies: [makeReply("r1", "A reply")] })
    renderThread()

    const item = await screen.findByRole("listitem")
    expect(within(item).queryByRole("button")).not.toBeInTheDocument()
  })

  it("says so quietly when there are no replies yet", async () => {
    serve({ replies: [] })
    renderThread()

    expect(await screen.findByText("No replies yet.")).toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("shows the quiet message for a 404 and no form to reply with", async () => {
    serve({ replies: 404 })
    renderThread()

    expect(await screen.findByText("Replies aren't available for this tweet.")).toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
  })

  it("offers to try again when the replies fail to load for another reason", async () => {
    serve({ replies: 500 })
    renderThread()

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load the replies.")
    serve({ replies: [makeReply("r1", "Back again")] })
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(await screen.findByText("Back again")).toBeInTheDocument()
  })

  it("has no button or link whose name has next, more, load or older in it", async () => {
    serve({ replies: [makeReply("r1", "A reply")] })
    renderThread()
    await screen.findByText("A reply")

    for (const element of [...screen.getAllByRole("button"), ...screen.queryAllByRole("link")]) {
      expect(element).not.toHaveAccessibleName(/next|more|load|older/i)
    }
  })
})

describe("ReplyThread: the form", () => {
  it("has a textarea named for the author and a Post reply button", async () => {
    serve({ replies: [] })
    renderThread()
    await screen.findByText("No replies yet.")

    expect(textbox().tagName).toBe("TEXTAREA")
    expect(postButton()).toBeInTheDocument()
  })

  it("keeps Post reply disabled while the text is empty or only whitespace", async () => {
    serve({ replies: [] })
    renderThread()
    await screen.findByText("No replies yet.")

    expect(postButton()).toBeDisabled()
    type("   \n\t ")
    expect(postButton()).toBeDisabled()
    type("Hello")
    expect(postButton()).toBeEnabled()
    type("  ")
    expect(postButton()).toBeDisabled()
  })

  it("sends nothing when the form is submitted with no text, however it is submitted", async () => {
    serve({ replies: [] })
    renderThread()
    await screen.findByText("No replies yet.")

    fireEvent.submit(textbox().closest("form")!)
    type("   ")
    fireEvent.submit(textbox().closest("form")!)

    expect(callsTo("/api/tweets", "POST")).toHaveLength(0)
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("allows exactly 280 characters and sends them", async () => {
    serve({ replies: [], post: () => json(201, makeReply("new", "x")) })
    renderThread()
    await screen.findByText("No replies yet.")

    type("a".repeat(MAX_TWEET_LENGTH))
    expect(postButton()).toBeEnabled()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("over 280 characters shows the same message as the composer, as an alert, and disables Post reply", async () => {
    serve({ replies: [] })
    renderThread()
    await screen.findByText("No replies yet.")

    const text = "a".repeat(MAX_TWEET_LENGTH + 3)
    type(text)

    expect(screen.getByRole("alert")).toHaveTextContent(validateTweetText(text)!)
    expect(postButton()).toBeDisabled()
    fireEvent.submit(textbox().closest("form")!)
    expect(callsTo("/api/tweets", "POST")).toHaveLength(0)
  })

  it("counts the trimmed text against the limit", async () => {
    serve({ replies: [] })
    renderThread()
    await screen.findByText("No replies yet.")

    type(`  ${"a".repeat(MAX_TWEET_LENGTH)}  `)
    expect(postButton()).toBeEnabled()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })
})

describe("ReplyThread: posting a reply", () => {
  it("sends { content, parentTweetId } with the content trimmed", async () => {
    serve({ replies: [], post: () => json(201, makeReply("new", "Thanks")) })
    renderThread()
    await screen.findByText("No replies yet.")

    type("  Thanks  \n")
    fireEvent.click(postButton())

    await waitFor(() => {
      expect(bodiesOf("POST", "/api/tweets")).toEqual([{ content: "Thanks", parentTweetId: PARENT.id }])
    })
    const [, init] = callsTo("/api/tweets", "POST")[0]
    expect((init as RequestInit).credentials).toBe("include")
  })

  it("appends the new reply at the end of the list at once and clears the form", async () => {
    serve({ replies: [makeReply("r1", "Already here")], post: () => json(201, makeReply("new", "My reply")) })
    renderThread()
    await screen.findByText("Already here")

    type("My reply")
    fireEvent.click(postButton())

    await screen.findByText("My reply")
    const items = screen.getAllByRole("listitem")
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent("Already here")
    expect(items[1]).toHaveTextContent("My reply")
    expect(textbox()).toHaveValue("")
    expect(postButton()).toBeDisabled()
    // The thread was not fetched again to get there.
    expect(callsTo(`/api/tweets/${PARENT.id}/replies`, "GET")).toHaveLength(1)
  })

  it("adds one to the tweet's replyCount in the cached timeline, and to no other tweet", async () => {
    const parent = makeReply(PARENT.id, "Parent", { replyCount: 4 })
    const other = makeReply("other", "Other", { replyCount: 7 })
    cachedTimeline(parent, other)
    serve({ replies: [], post: () => json(201, makeReply("new", "Hi")) })
    renderThread()
    await screen.findByText("No replies yet.")

    type("Hi")
    fireEvent.click(postButton())
    await screen.findByText("Hi")

    expect(cachedReplyCount(PARENT.id)).toBe(5)
    expect(cachedReplyCount("other")).toBe(7)
  })

  it("does not touch the timeline cache or the count when posting fails", async () => {
    cachedTimeline(makeReply(PARENT.id, "Parent", { replyCount: 4 }))
    serve({ replies: [], post: () => json(500, {}) })
    renderThread()
    await screen.findByText("No replies yet.")

    type("Hi")
    fireEvent.click(postButton())
    await screen.findByText(TRY_AGAIN)

    expect(cachedReplyCount(PARENT.id)).toBe(4)
  })

  it("shows the API's message for a 4xx and keeps the draft", async () => {
    serve({ replies: [], post: () => json(400, { error: "A reply to a reply is not allowed." }) })
    renderThread()
    await screen.findByText("No replies yet.")

    type("My draft")
    fireEvent.click(postButton())

    expect(await screen.findByRole("alert")).toHaveTextContent("A reply to a reply is not allowed.")
    expect(textbox()).toHaveValue("My draft")
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument()
  })

  it("shows a fixed message for a 4xx that sent none, and keeps the draft", async () => {
    serve({ replies: [], post: () => json(404, {}) })
    renderThread()
    await screen.findByText("No replies yet.")

    type("My draft")
    fireEvent.click(postButton())

    expect(await screen.findByRole("alert")).toHaveTextContent("That reply was refused. Check the text and try again.")
    expect(textbox()).toHaveValue("My draft")
  })

  it("shows the try-again message for a 5xx and keeps the draft", async () => {
    serve({ replies: [], post: () => json(503, { error: "upstream exploded" }) })
    renderThread()
    await screen.findByText("No replies yet.")

    type("My draft")
    fireEvent.click(postButton())

    expect(await screen.findByRole("alert")).toHaveTextContent(TRY_AGAIN)
    expect(screen.queryByText("upstream exploded")).not.toBeInTheDocument()
    expect(textbox()).toHaveValue("My draft")
  })

  it("shows the try-again message for a network failure and keeps the draft, which can then be sent again", async () => {
    let attempts = 0
    serve({
      replies: [],
      post: () => {
        attempts += 1
        if (attempts === 1) throw new TypeError("Failed to fetch")
        return json(201, makeReply("new", "My draft"))
      },
    })
    renderThread()
    await screen.findByText("No replies yet.")

    type("My draft")
    fireEvent.click(postButton())
    expect(await screen.findByRole("alert")).toHaveTextContent(TRY_AGAIN)
    expect(textbox()).toHaveValue("My draft")
    expect(postButton()).toBeEnabled()

    fireEvent.click(postButton())
    await waitFor(() => {
      expect(screen.getAllByRole("listitem")).toHaveLength(1)
    })
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(textbox()).toHaveValue("")
  })

  it("still lists the new reply when it is posted before the replies have loaded", async () => {
    const mine = makeReply("new", "Quick one")
    let sent = false
    let releaseFirst: () => void = () => undefined
    let gets = 0
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === `/api/tweets/${PARENT.id}/replies`) {
        gets += 1
        if (gets === 1) await new Promise<void>((resolve) => (releaseFirst = resolve))
        // Once the API has the reply, it is in what it sends back.
        return json(200, { items: sent ? [mine] : [] })
      }
      if (url === "/api/tweets" && init?.method === "POST") {
        sent = true
        return json(201, mine)
      }
      throw new Error(`unexpected request: ${url}`)
    })
    renderThread()
    expect(screen.getByRole("status")).toHaveTextContent("Loading replies...")

    type("Quick one")
    fireEvent.click(postButton())

    expect(await screen.findByText("Quick one")).toBeInTheDocument()
    releaseFirst()
    await waitFor(() => {
      expect(screen.getAllByRole("listitem")).toHaveLength(1)
    })
    expect(textbox()).toHaveValue("")
  })

  it("sends one request when Post reply is pressed twice before the answer", async () => {
    let answer: (response: Response) => void = () => undefined
    serve({
      replies: [],
      post: () => new Promise<Response>((resolve) => (answer = resolve)) as unknown as Response,
    })
    renderThread()
    await screen.findByText("No replies yet.")

    type("Once")
    fireEvent.click(postButton())
    await waitFor(() => {
      expect(postButton()).toBeDisabled()
    })
    fireEvent.click(postButton())
    fireEvent.submit(textbox().closest("form")!)

    expect(callsTo("/api/tweets", "POST")).toHaveLength(1)
    answer(json(201, makeReply("new", "Once")))
    await screen.findByText("Once")
  })
})
