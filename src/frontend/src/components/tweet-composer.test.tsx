import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, beforeEach, vi } from "vitest"

import { TweetComposer } from "@/components/tweet-composer"
import { MAX_IMAGE_BYTES } from "@/lib/compose"
import { timelineQueryOptions, type TimelinePage, type Tweet } from "@/queries/tweets"

const IMAGE_MESSAGE = "Images must be JPEG, PNG, GIF or WebP, and under 5 MB."
const TRY_AGAIN = "Couldn't post your tweet. Try again."

function makeTweet(id: string, content: string, mediaUrls: string[] = []): Tweet {
  return {
    id,
    authorId: "me",
    author: { name: "Me", handle: "@me" },
    content,
    mediaUrls,
    createdAt: new Date().toISOString(),
    likeCount: 0,
    retweetCount: 0,
    replyCount: 0,
    likedByMe: false,
    retweetedByMe: false,
  }
}

type Cached = { pages: TimelinePage[]; pageParams: (string | null)[] }

function cachedTimeline(...pages: Tweet[][]): Cached {
  return {
    pages: pages.map((items, index) => ({ items, nextCursor: index < pages.length - 1 ? `c${index.toString()}` : null })),
    pageParams: pages.map((_, index) => (index === 0 ? null : `c${(index - 1).toString()}`)),
  }
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
}

let fetchMock: ReturnType<typeof vi.fn>
let queryClient: QueryClient

function renderComposer() {
  return render(
    <QueryClientProvider client={queryClient}>
      <TweetComposer />
    </QueryClientProvider>
  )
}

const textbox = () => screen.getByRole("textbox", { name: "Tweet text" })
const postButton = () => screen.getByRole("button", { name: /^(Post|Posting\.\.\.)$/ })
const fileInput = () => document.querySelector<HTMLInputElement>('input[type="file"]')!

function pick(file: File) {
  fireEvent.change(fileInput(), { target: { files: [file] } })
}

function png(name = "pic.png", size = 10) {
  return new File([new Uint8Array(size)], name, { type: "image/png" })
}

function type(text: string) {
  fireEvent.change(textbox(), { target: { value: text } })
}

/** The calls the composer made to `url`, as `[init]` lists. */
function callsTo(url: string): RequestInit[] {
  return fetchMock.mock.calls.filter(([called]) => called === url).map(([, init]) => init as RequestInit)
}

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  fetchMock = vi.fn()
  vi.stubGlobal("fetch", fetchMock)
  let n = 0
  vi.stubGlobal("URL", Object.assign(URL, {
    createObjectURL: vi.fn(() => `blob:preview-${(n++).toString()}`),
    revokeObjectURL: vi.fn(),
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("TweetComposer: what is on screen", () => {
  it("has a labelled text box, an Add image button, a Post button and a count of characters left", () => {
    renderComposer()

    expect(textbox()).toHaveAttribute("placeholder", "What's happening?")
    expect(screen.getByRole("button", { name: "Add image" })).toBeEnabled()
    expect(postButton()).toBeDisabled()
    expect(screen.getByText("280")).toBeInTheDocument()
    expect(screen.getByText(/characters left/)).toBeInTheDocument()
  })

  it("has a hidden file picker that only takes JPEG, PNG, GIF and WebP", () => {
    renderComposer()

    expect(fileInput()).toHaveAttribute("accept", "image/jpeg,image/png,image/gif,image/webp")
    expect(fileInput()).not.toHaveAttribute("multiple")
    expect(fileInput()).toHaveClass("sr-only")
  })

  it("shows no article, no alert and no loading text to begin with", () => {
    renderComposer()

    expect(screen.queryByRole("article")).not.toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
  })

  it("counts the characters left, going negative past the limit", () => {
    renderComposer()

    type("hello")
    expect(screen.getByText("275")).toBeInTheDocument()

    type("a".repeat(285))
    expect(screen.getByText("-5")).toBeInTheDocument()
  })

  it("opens the file picker from the Add image button", () => {
    renderComposer()
    const click = vi.spyOn(fileInput(), "click")

    fireEvent.click(screen.getByRole("button", { name: "Add image" }))

    expect(click).toHaveBeenCalledTimes(1)
  })
})

describe("TweetComposer: an empty tweet", () => {
  it("keeps Post disabled for no text and for whitespace only", () => {
    renderComposer()
    expect(postButton()).toBeDisabled()

    type("   \n\t  ")
    expect(postButton()).toBeDisabled()

    type("hi")
    expect(postButton()).toBeEnabled()
  })

  it("does nothing when the form is submitted another way", () => {
    renderComposer()
    type("   ")

    fireEvent.submit(textbox().closest("form")!)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("allows an image on its own", () => {
    renderComposer()

    pick(png())

    expect(postButton()).toBeEnabled()
  })
})

describe("TweetComposer: too long", () => {
  it("shows how far over the limit it is and keeps Post disabled", () => {
    renderComposer()

    type("a".repeat(283))

    expect(screen.getByRole("alert")).toHaveTextContent("Your tweet is 3 characters over the 280 limit.")
    expect(postButton()).toBeDisabled()
  })

  it("does not post when submitted another way", () => {
    renderComposer()
    type("a".repeat(281))

    fireEvent.submit(textbox().closest("form")!)

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("allows exactly 280 characters, and counts them trimmed", () => {
    renderComposer()

    type(`  ${"a".repeat(280)}  `)

    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(postButton()).toBeEnabled()
  })

  it("clears the message when the text is short enough again", () => {
    renderComposer()
    type("a".repeat(300))
    expect(screen.getByRole("alert")).toBeInTheDocument()

    type("a".repeat(10))

    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })
})

describe("TweetComposer: choosing an image", () => {
  it("shows a preview with a Remove image button", () => {
    renderComposer()

    pick(png())

    expect(screen.getByRole("img", { name: "Image to post" })).toHaveAttribute("src", "blob:preview-0")
    expect(screen.getByRole("button", { name: "Remove image" })).toBeInTheDocument()
  })

  it("removes the image again", () => {
    renderComposer()
    pick(png())

    fireEvent.click(screen.getByRole("button", { name: "Remove image" }))

    expect(screen.queryByRole("img")).not.toBeInTheDocument()
    expect(postButton()).toBeDisabled()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview-0")
  })

  it("replaces the image when another one is chosen, so there is only ever one", () => {
    renderComposer()
    pick(png("one.png"))

    pick(png("two.png"))

    expect(screen.getAllByRole("img")).toHaveLength(1)
    expect(screen.getByRole("img")).toHaveAttribute("src", "blob:preview-1")
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview-0")
  })

  it.each([
    ["a PDF", new File(["x"], "doc.pdf", { type: "application/pdf" })],
    ["an SVG", new File(["x"], "pic.svg", { type: "image/svg+xml" })],
    ["a file over 5 MB", new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], "big.png", { type: "image/png" })],
  ])("refuses %s with a clear message and does not attach it", (_name, file) => {
    renderComposer()

    pick(file)

    expect(screen.getByRole("alert")).toHaveTextContent(IMAGE_MESSAGE)
    expect(screen.queryByRole("img")).not.toBeInTheDocument()
    expect(postButton()).toBeDisabled()
  })

  it("keeps the image already chosen when a refused one is picked, and the message goes with a good pick", () => {
    renderComposer()
    pick(png())

    pick(new File(["x"], "doc.pdf", { type: "application/pdf" }))
    expect(screen.getByRole("alert")).toHaveTextContent(IMAGE_MESSAGE)
    expect(screen.getByRole("img")).toHaveAttribute("src", "blob:preview-0")

    pick(png("again.png"))
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(screen.getByRole("img")).toHaveAttribute("src", "blob:preview-1")
  })
})

describe("TweetComposer: posting", () => {
  it("posts text only: the trimmed content and no mediaKeys, with no upload", async () => {
    const tweet = makeTweet("t1", "Hello there")
    fetchMock.mockResolvedValueOnce(json(201, tweet))
    renderComposer()
    type("  Hello there \n")

    fireEvent.click(postButton())

    await waitFor(() => { expect(textbox()).toHaveValue("") })
    expect(callsTo("/api/upload")).toHaveLength(0)
    const [init] = callsTo("/api/tweets")
    expect(init.method).toBe("POST")
    expect(init.credentials).toBe("include")
    expect(JSON.parse(init.body as string)).toEqual({ content: "Hello there" })
  })

  it("posts an image only: uploads it as `files` first, then sends the key and no content", async () => {
    const tweet = makeTweet("t2", "", ["https://media.test/a.png"])
    fetchMock.mockResolvedValueOnce(json(201, { keys: ["key-1"] })).mockResolvedValueOnce(json(201, tweet))
    renderComposer()
    const file = png("a.png")
    pick(file)

    fireEvent.click(postButton())

    await waitFor(() => { expect(screen.queryByRole("img")).not.toBeInTheDocument() })
    const [upload] = callsTo("/api/upload")
    expect(upload.method).toBe("POST")
    expect(upload.credentials).toBe("include")
    const form = upload.body as FormData
    expect([...form.keys()]).toEqual(["files"])
    expect((form.get("files") as File).name).toBe("a.png")
    const [create] = callsTo("/api/tweets")
    expect(JSON.parse(create.body as string)).toEqual({ mediaKeys: ["key-1"] })
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(["/api/upload", "/api/tweets"])
  })

  it("posts text and an image together", async () => {
    fetchMock
      .mockResolvedValueOnce(json(201, { keys: ["key-2"] }))
      .mockResolvedValueOnce(json(201, makeTweet("t3", "With a picture", ["https://media.test/b.png"])))
    renderComposer()
    type("With a picture")
    pick(png())

    fireEvent.click(postButton())

    await waitFor(() => { expect(textbox()).toHaveValue("") })
    expect(JSON.parse(callsTo("/api/tweets")[0].body as string)).toEqual({
      content: "With a picture",
      mediaKeys: ["key-2"],
    })
  })

  it("disables the button and reads Posting... while it posts", async () => {
    let finish: (response: Response) => void = () => {}
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => { finish = resolve }))
    renderComposer()
    type("Slowly")

    fireEvent.click(postButton())

    await waitFor(() => { expect(screen.getByRole("button", { name: "Posting..." })).toBeDisabled() })
    // A second submit while it is under way posts nothing more.
    fireEvent.submit(textbox().closest("form")!)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    finish(json(201, makeTweet("t4", "Slowly")))
    await waitFor(() => { expect(screen.getByRole("button", { name: "Post" })).toBeDisabled() })
    expect(textbox()).toHaveValue("")
  })

  it("posts when the form is submitted from the keyboard with valid text", async () => {
    fetchMock.mockResolvedValueOnce(json(201, makeTweet("t5", "Enter")))
    renderComposer()
    type("Enter")

    fireEvent.submit(textbox().closest("form")!)

    await waitFor(() => { expect(textbox()).toHaveValue("") })
    expect(callsTo("/api/tweets")).toHaveLength(1)
  })
})

describe("TweetComposer: the new tweet reaches the timeline", () => {
  it("puts the returned tweet at the top of the first page at once, without a refetch", async () => {
    const older = makeTweet("old-1", "An older tweet")
    const onPage2 = makeTweet("old-2", "On page two")
    queryClient.setQueryData(timelineQueryOptions.queryKey, cachedTimeline([older], [onPage2]))
    const created = makeTweet("new-1", "Brand new")
    fetchMock.mockResolvedValueOnce(json(201, created))
    renderComposer()
    type("Brand new")

    fireEvent.click(postButton())

    await waitFor(() => { expect(textbox()).toHaveValue("") })
    const cached = queryClient.getQueryData<Cached>(timelineQueryOptions.queryKey)!
    expect(cached.pages[0].items.map((tweet) => tweet.id)).toEqual(["new-1", "old-1"])
    expect(cached.pages[1].items.map((tweet) => tweet.id)).toEqual(["old-2"])
    expect(cached.pages.map((page) => page.nextCursor)).toEqual(["c0", null])
    expect(queryClient.getQueryState(timelineQueryOptions.queryKey)?.isInvalidated).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("invalidates the timeline when it has no data yet", async () => {
    fetchMock.mockResolvedValueOnce(json(201, makeTweet("new-2", "First ever")))
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")
    renderComposer()
    type("First ever")

    fireEvent.click(postButton())

    await waitFor(() => { expect(textbox()).toHaveValue("") })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: timelineQueryOptions.queryKey })
    expect(queryClient.getQueryData(timelineQueryOptions.queryKey)).toBeUndefined()
  })

  it("does not show the tweet twice if the cache already holds it", async () => {
    const created = makeTweet("dup", "Already here")
    queryClient.setQueryData(timelineQueryOptions.queryKey, cachedTimeline([created, makeTweet("x", "Other")]))
    fetchMock.mockResolvedValueOnce(json(201, created))
    renderComposer()
    type("Already here")

    fireEvent.click(postButton())

    await waitFor(() => { expect(textbox()).toHaveValue("") })
    const cached = queryClient.getQueryData<Cached>(timelineQueryOptions.queryKey)!
    expect(cached.pages[0].items.map((tweet) => tweet.id)).toEqual(["dup", "x"])
  })
})

describe("TweetComposer: when posting fails", () => {
  it("shows the API's message for a refused tweet (400) and keeps the draft", async () => {
    fetchMock.mockResolvedValueOnce(json(400, { error: "Content too long" }))
    renderComposer()
    type("My draft")

    fireEvent.click(postButton())

    expect(await screen.findByRole("alert")).toHaveTextContent("Content too long")
    expect(textbox()).toHaveValue("My draft")
    expect(postButton()).toBeEnabled()
  })

  it("shows a message for a refused upload (413), keeps the text and the image, and posts no tweet", async () => {
    fetchMock.mockResolvedValueOnce(json(413, { error: "Upload too large" }))
    renderComposer()
    type("With a big one")
    pick(png())

    fireEvent.click(postButton())

    expect(await screen.findByRole("alert")).toHaveTextContent("Upload too large")
    expect(textbox()).toHaveValue("With a big one")
    expect(screen.getByRole("img")).toBeInTheDocument()
    expect(callsTo("/api/tweets")).toHaveLength(0)
  })

  it("falls back to a clear message when a refusal has no readable body", async () => {
    fetchMock.mockResolvedValueOnce(new Response("nope", { status: 400 }))
    renderComposer()
    type("My draft")

    fireEvent.click(postButton())

    expect(await screen.findByRole("alert")).toHaveTextContent(/refused/i)
    expect(textbox()).toHaveValue("My draft")
  })

  it.each([
    ["a server error", () => Promise.resolve(json(500, { error: "boom" }))],
    ["a network failure", () => Promise.reject(new TypeError("Failed to fetch"))],
  ])("shows \"Couldn't post your tweet. Try again.\" on %s and keeps the draft", async (_name, respond) => {
    fetchMock.mockImplementationOnce(respond)
    renderComposer()
    type("Keep me")

    fireEvent.click(postButton())

    expect(await screen.findByRole("alert")).toHaveTextContent(TRY_AGAIN)
    expect(textbox()).toHaveValue("Keep me")
    expect(postButton()).toBeEnabled()
  })

  it("keeps the image on a failed post, and a retry does not upload it a second time", async () => {
    fetchMock
      .mockResolvedValueOnce(json(201, { keys: ["key-9"] }))
      .mockResolvedValueOnce(json(500, { error: "boom" }))
      .mockResolvedValueOnce(json(201, makeTweet("t9", "Retry", ["https://media.test/c.png"])))
    renderComposer()
    type("Retry")
    pick(png())

    fireEvent.click(postButton())
    expect(await screen.findByRole("alert")).toHaveTextContent(TRY_AGAIN)
    expect(screen.getByRole("img")).toBeInTheDocument()

    fireEvent.click(postButton())
    await waitFor(() => { expect(textbox()).toHaveValue("") })

    expect(callsTo("/api/upload")).toHaveLength(1)
    expect(callsTo("/api/tweets")).toHaveLength(2)
    expect(JSON.parse(callsTo("/api/tweets")[1].body as string)).toEqual({ content: "Retry", mediaKeys: ["key-9"] })
  })

  it("clears the failure message when the person edits the draft", async () => {
    fetchMock.mockResolvedValueOnce(json(500, {}))
    renderComposer()
    type("Oops")
    fireEvent.click(postButton())
    await screen.findByRole("alert")

    type("Oops, fixed")

    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })
})
