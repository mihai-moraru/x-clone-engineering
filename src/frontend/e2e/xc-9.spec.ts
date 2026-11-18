import type { Page, Route } from "@playwright/test"

import { expect, test } from "./fixtures"

// XC-9 · Story 2.2: Post a tweet.
//
// These tests run on the person's saved sign-in, like every other spec, and write nothing to the
// shared API: no tweets and no uploads. The app's own calls are answered from here by
// `serveApi`:
//   - GET  /api/timeline  a fixed list of tweets, one page, newest first. The list never gains the
//                         tweets the tests post, so a timeline that was fetched again after a post
//                         would lose the new tweet: showing it "straight away" has to come from the
//                         app, not from the server.
//   - POST /api/upload    answers 201 `{ keys }` and records what it was sent (multipart, field
//                         `files`, the file's bytes).
//   - POST /api/tweets    records the JSON body and answers 201 with a Tweet built from it, as the
//                         API does (the signed-in person as author, `mediaKeys` turned into URLs).
//   - the media URLs      a small real PNG, so a posted image really loads.
// A test can make the next upload or tweet fail (400, 413, 500, no network) and can hold a post
// open to look at the "Posting..." state.
//
// The limits are the API's own (the story says they are "Not known yet"): 280 characters after
// trimming, and JPEG, PNG, GIF or WebP up to 5 MB. The last test reads the real API's OpenAPI
// document (read-only) to check that those are still its limits.

/** A real 1x1 PNG. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
)
const MEDIA = "https://media.xc9.test"
const MAX_BYTES = 5 * 1024 * 1024
const IMAGE_MESSAGE = "Images must be JPEG, PNG, GIF or WebP, and under 5 MB."
const TRY_AGAIN = "Couldn't post your tweet. Try again."

type Tweet = {
  id: string
  authorId: string
  author: { name: string; handle: string }
  content: string
  mediaUrls: string[]
  createdAt: string
  likeCount: number
  retweetCount: number
  replyCount: number
  likedByMe: boolean
  retweetedByMe: boolean
}

type Author = { id: string; name: string; handle: string }

/** The signed-in person, as the author of the tweets the stub API creates. */
const ME: Author = { id: "xc9-me", name: "Mia Poster", handle: "@mia_xc9" }
const ADA: Author = { id: "xc9-ada", name: "Ada Lovelace", handle: "@ada_xc9" }
const GRACE: Author = { id: "xc9-grace", name: "Grace Hopper", handle: "@grace_xc9" }

function makeTweet(n: number, author: Author, content: string, minutesAgo: number, mediaUrls: string[] = []): Tweet {
  return {
    id: `00000000-0000-4000-8000-${n.toString().padStart(12, "0")}`,
    authorId: author.id,
    author: { name: author.name, handle: author.handle },
    content,
    mediaUrls,
    createdAt: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
    likeCount: 0,
    retweetCount: 0,
    replyCount: 0,
    likedByMe: false,
    retweetedByMe: false,
  }
}

type Reply = { status: number; json?: unknown } | "network-error"

type Upload = {
  contentType: string
  /** The multipart field names, one per file. */
  fields: string[]
  filenames: string[]
  fileTypes: string[]
  /** The request really carries the file's bytes. */
  carriesTheFile: boolean
}

async function reply(route: Route, response: Reply) {
  if (response === "network-error") return route.abort("failed")
  return route.fulfill({ status: response.status, json: response.json ?? {} })
}

/** Answer the app's timeline, upload and tweet calls from here, and record what it sent. */
async function serveApi(page: Page, timeline: Tweet[]) {
  const api = {
    timelineRequests: [] as URL[],
    /** Every upload and tweet call, in order. */
    calls: [] as ("upload" | "tweet")[],
    uploads: [] as Upload[],
    /** The JSON bodies the app sent to POST /api/tweets, as parsed. */
    posts: [] as unknown[],
    /** Fail the next upload / tweet call this way instead of answering. */
    nextUpload: null as Reply | null,
    nextPost: null as Reply | null,
    /** Hold the next tweet calls open until this settles. */
    holdPost: null as Promise<void> | null,
  }
  let keyCount = 0
  let tweetCount = 0

  await page.route("**/api/timeline*", async (route) => {
    api.timelineRequests.push(new URL(route.request().url()))
    await route.fulfill({ json: { items: timeline, nextCursor: null } })
  })

  await page.route("**/api/upload", async (route) => {
    const request = route.request()
    if (request.method() !== "POST") return route.fulfill({ status: 405, json: { error: "Method not allowed" } })
    api.calls.push("upload")

    const body = request.postDataBuffer() ?? Buffer.alloc(0)
    const text = body.toString("latin1")
    api.uploads.push({
      contentType: request.headers()["content-type"] ?? "",
      fields: [...text.matchAll(/Content-Disposition: form-data; name="([^"]*)"/g)].map((match) => match[1]),
      filenames: [...text.matchAll(/filename="([^"]*)"/g)].map((match) => match[1]),
      fileTypes: [...text.matchAll(/\r\nContent-Type: ([^\r\n]+)/g)].map((match) => match[1]),
      carriesTheFile: body.includes(PNG),
    })

    const failure = api.nextUpload
    api.nextUpload = null
    if (failure) return reply(route, failure)

    keyCount += 1
    return route.fulfill({ status: 201, json: { keys: [`uploads/${keyCount.toString()}.png`] } })
  })

  await page.route("**/api/tweets", async (route) => {
    const request = route.request()
    if (request.method() !== "POST") return route.fulfill({ status: 405, json: { error: "Method not allowed" } })
    api.calls.push("tweet")

    const body = JSON.parse(request.postData() ?? "{}") as { content?: string; mediaKeys?: string[] }
    api.posts.push(body)
    if (api.holdPost) await api.holdPost

    const failure = api.nextPost
    api.nextPost = null
    if (failure) return reply(route, failure)

    const content = (body.content ?? "").trim()
    const keys = body.mediaKeys ?? []
    if ((!content && keys.length === 0) || content.length > 280) {
      return route.fulfill({ status: 400, json: { error: "Invalid body" } })
    }

    tweetCount += 1
    return route.fulfill({
      status: 201,
      json: makeTweet(1000 + tweetCount, ME, content, 0, keys.map((key) => `${MEDIA}/${key}`)),
    })
  })

  await page.route(`${MEDIA}/**`, (route) => route.fulfill({ contentType: "image/png", body: PNG }))

  return api
}

/** The composer's parts, found the way a person sees them. */
function composer(page: Page) {
  return {
    text: page.getByRole("textbox", { name: "Tweet text" }),
    post: page.getByRole("button", { name: "Post", exact: true }),
    posting: page.getByRole("button", { name: "Posting...", exact: true }),
    addImage: page.getByRole("button", { name: "Add image", exact: true }),
    removeImage: page.getByRole("button", { name: "Remove image", exact: true }),
    preview: page.getByRole("img", { name: "Image to post", exact: true }),
    fileInput: page.locator('input[type="file"]'),
    // Scoped to the page's own content: nothing outside it is an alert, but this is the same
    // scope xc-8 uses.
    alert: page.getByRole("main").getByRole("alert"),
    left: page.getByText(/^-?\d+ characters left$/),
  }
}

type PickedFile = { name: string; mimeType: string; buffer: Buffer }

const picture = (name: string): PickedFile => ({ name, mimeType: "image/png", buffer: PNG })

/** Press "Add image", with the mouse or the keyboard, and answer the file picker it opens. */
async function chooseImage(page: Page, file: PickedFile, how: "click" | "keyboard" = "click") {
  const { addImage } = composer(page)
  const chooser = page.waitForEvent("filechooser")
  if (how === "keyboard") {
    await addImage.focus()
    await page.keyboard.press("Enter")
  } else {
    await addImage.click()
  }
  const picker = await chooser
  expect(picker.isMultiple(), "the picker takes one image").toBe(false)
  await picker.setFiles(file)
}

/** Let any request the app has just made reach the stub, so "nothing was sent" means something. */
async function settle(page: Page) {
  await page.waitForLoadState("networkidle")
}

test("AC1: I can type a tweet and post it, with or without one image", async ({ page, evidence }) => {
  const earlier = makeTweet(1, ADA, "Ada's tweet from earlier", 30)
  const api = await serveApi(page, [earlier])
  const { text, post, posting, addImage, preview, fileInput, left } = composer(page)
  const articles = page.getByRole("article")

  await evidence.step("Open the home page: a place to write a tweet is above the timeline", async () => {
    await page.goto("/")
    await expect(articles).toHaveCount(1)
    await expect(text).toBeVisible()
    await expect(text).toHaveAttribute("placeholder", "What's happening?")
    await expect(addImage).toBeVisible()
    await expect(post).toBeDisabled()
    await expect(left).toHaveText("280 characters left")
  })

  await evidence.step("The image picker only offers JPEG, PNG, GIF and WebP, one file, and the keyboard reaches it", async () => {
    await expect(fileInput).toHaveAttribute("accept", "image/jpeg,image/png,image/gif,image/webp")
    await expect(fileInput).not.toHaveAttribute("multiple")
    await text.focus()
    await page.keyboard.press("Tab")
    await expect(fileInput).toBeFocused()
  })

  await evidence.step("Type a tweet with no image and post it", async () => {
    await text.fill("  Hello from the composer \n")
    // The count is of the trimmed text, which is what the API counts too.
    await expect(left).toHaveText(`${(280 - "Hello from the composer".length).toString()} characters left`)
    await post.click()
    await expect(text).toHaveValue("")
    await expect(articles.first()).toContainText("Hello from the composer")
  })

  await evidence.step("Only the text was sent, trimmed, with no upload and no media keys", async () => {
    expect(api.uploads).toHaveLength(0)
    expect(api.posts).toEqual([{ content: "Hello from the composer" }])
    await expect(articles).toHaveCount(2)
  })

  await evidence.step("Pick one image with the keyboard and post it with no text", async () => {
    await chooseImage(page, picture("sunset.png"), "keyboard")
    await expect(preview).toBeVisible()
    await expect(post).toBeEnabled()
    await post.click()
    await expect(preview).toHaveCount(0)
    await expect(articles).toHaveCount(3)
  })

  await evidence.step("The image was uploaded first, in the field `files`, and its key was sent without any content", async () => {
    expect(api.uploads).toHaveLength(1)
    expect(api.uploads[0].contentType).toMatch(/^multipart\/form-data/)
    expect(api.uploads[0].fields).toEqual(["files"])
    expect(api.uploads[0].filenames).toEqual(["sunset.png"])
    expect(api.uploads[0].fileTypes).toEqual(["image/png"])
    expect(api.uploads[0].carriesTheFile).toBe(true)
    expect(api.posts[1]).toEqual({ mediaKeys: ["uploads/1.png"] })
    expect(api.calls).toEqual(["tweet", "upload", "tweet"])
  })

  await evidence.step("The image tweet shows its image, and the image really loads", async () => {
    const image = articles.first().getByRole("img")
    await expect(image).toHaveAttribute("src", `${MEDIA}/uploads/1.png`)
    await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
    await expect(articles.first().locator("p")).toHaveCount(0)
  })

  await evidence.step("Type a tweet, add an image, and post both together", async () => {
    await text.fill("Both a sentence and a picture")
    await chooseImage(page, picture("harbour.png"))
    await expect(preview).toBeVisible()
    await post.click()
    await expect(text).toHaveValue("")
    await expect(articles).toHaveCount(4)
    await expect(articles.first()).toContainText("Both a sentence and a picture")
    await expect(articles.first().getByRole("img")).toHaveAttribute("src", `${MEDIA}/uploads/2.png`)
  })

  await evidence.step("Text and the image's key went in one tweet, after one more upload", async () => {
    expect(api.uploads).toHaveLength(2)
    expect(api.uploads[1].filenames).toEqual(["harbour.png"])
    expect(api.posts[2]).toEqual({ content: "Both a sentence and a picture", mediaKeys: ["uploads/2.png"] })
    expect(api.calls).toEqual(["tweet", "upload", "tweet", "upload", "tweet"])
  })

  await evidence.step("While a tweet is being posted the button reads Posting... and cannot be pressed again", async () => {
    let release: () => void = () => {}
    api.holdPost = new Promise<void>((resolve) => {
      release = resolve
    })
    await text.fill("A slow one")
    await post.click()
    await expect(posting).toBeVisible()
    await expect(posting).toBeDisabled()
    release()
    api.holdPost = null
    await expect(text).toHaveValue("")
    await expect(post).toBeDisabled()
    await expect(articles.first()).toContainText("A slow one")
    expect(api.posts.at(-1)).toEqual({ content: "A slow one" })
    expect(api.posts).toHaveLength(4)
  })

  await evidence.step("The composer is clear again after each post", async () => {
    await expect(text).toHaveValue("")
    await expect(preview).toHaveCount(0)
    await expect(left).toHaveText("280 characters left")
    await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0)
  })
})

test("AC2: my new tweet appears at the top of my timeline straight away", async ({ page, evidence }) => {
  const timeline = [
    makeTweet(3, ADA, "Third: Ada, the newest", 2),
    makeTweet(2, GRACE, "Second: Grace", 5),
    makeTweet(1, ADA, "First: Ada, the oldest", 9),
  ]
  const api = await serveApi(page, timeline)
  const { text, post } = composer(page)
  const articles = page.getByRole("article")

  await evidence.step("Open the home timeline", async () => {
    await page.goto("/")
    await expect(articles).toHaveCount(3)
    await expect(articles.locator("p")).toHaveText(timeline.map((tweet) => tweet.content))
    expect(api.timelineRequests).toHaveLength(1)
  })

  await evidence.step("Post a tweet: it is the first one on the timeline at once", async () => {
    await text.fill("My brand new tweet")
    await post.click()
    await expect(articles).toHaveCount(4)
    await expect(articles.locator("p")).toHaveText(["My brand new tweet", ...timeline.map((tweet) => tweet.content)])
  })

  await evidence.step("It is shown as mine, and as just posted", async () => {
    const mine = articles.first()
    await expect(mine.getByText(ME.name, { exact: true })).toBeVisible()
    await expect(mine.getByText(ME.handle, { exact: true })).toBeVisible()
    await expect(mine.locator("time")).toHaveText(/^\d+s$/)
  })

  await evidence.step("It appeared without loading the timeline again", async () => {
    expect(api.timelineRequests).toHaveLength(1)
    await expect(page.getByRole("main").getByText(/loading/i)).toHaveCount(0)
  })

  await evidence.step("Post another one, with an image: it goes above the first", async () => {
    await text.fill("And another, with a picture")
    await chooseImage(page, picture("second.png"))
    await post.click()
    await expect(articles).toHaveCount(5)
    await expect(articles.locator("p")).toHaveText([
      "And another, with a picture",
      "My brand new tweet",
      ...timeline.map((tweet) => tweet.content),
    ])
    await expect(articles.first().getByRole("img")).toHaveAttribute("src", `${MEDIA}/uploads/1.png`)
    expect(api.timelineRequests).toHaveLength(1)
  })
})

test("AC3: I cannot post an empty tweet", async ({ page, evidence }) => {
  const api = await serveApi(page, [makeTweet(1, ADA, "Ada's tweet", 4)])
  const { text, post, preview, removeImage } = composer(page)

  await evidence.step("Open the home page: Post is disabled with nothing written", async () => {
    await page.goto("/")
    await expect(page.getByRole("article")).toHaveCount(1)
    await expect(post).toBeVisible()
    await expect(post).toBeDisabled()
  })

  await evidence.step("Spaces and blank lines are still an empty tweet", async () => {
    await text.fill("     ")
    await expect(post).toBeDisabled()
    await text.fill("\n\n  \t \n")
    await expect(post).toBeDisabled()
  })

  await evidence.step("Submitting some other way, such as the keyboard, sends nothing", async () => {
    await text.fill("   ")
    await text.press("Enter")
    await text.press("Control+Enter")
    await text.press("Meta+Enter")
    await text.evaluate((field: HTMLTextAreaElement) => field.form?.requestSubmit())
    await settle(page)
    expect(api.calls).toEqual([])
    await expect(page.getByRole("article")).toHaveCount(1)
    await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0)
  })

  await evidence.step("Real text makes Post available, and clearing it makes it unavailable again", async () => {
    await text.fill("Something to say")
    await expect(post).toBeEnabled()
    await text.fill("")
    await expect(post).toBeDisabled()
  })

  await evidence.step("A picture alone is enough, and removing it makes the tweet empty again", async () => {
    await chooseImage(page, picture("only-a-picture.png"))
    await expect(preview).toBeVisible()
    await expect(post).toBeEnabled()
    await removeImage.click()
    await expect(preview).toHaveCount(0)
    await expect(post).toBeDisabled()
  })

  await evidence.step("Still nothing was sent", async () => {
    await settle(page)
    expect(api.calls).toEqual([])
    expect(api.timelineRequests).toHaveLength(1)
  })
})

test("AC4: if the tweet is too long or the image is not allowed, I see a clear message", async ({ page, evidence }) => {
  const api = await serveApi(page, [makeTweet(1, ADA, "Ada's tweet", 4)])
  const { text, post, preview, removeImage, alert, left } = composer(page)
  const articles = page.getByRole("article")

  await evidence.step("Open the home page: there is no message before anything is wrong", async () => {
    await page.goto("/")
    await expect(articles).toHaveCount(1)
    await expect(alert).toHaveCount(0)
  })

  await evidence.step("Type 3 characters too many: a message says by how much, and Post is disabled", async () => {
    await text.fill("a".repeat(283))
    await expect(alert).toHaveText("Your tweet is 3 characters over the 280 limit.")
    await expect(left).toHaveText("-3 characters left")
    await expect(post).toBeDisabled()
  })

  await evidence.step("Exactly 280 is fine, and spaces around the text do not count towards the limit", async () => {
    await text.fill("a".repeat(280))
    await expect(alert).toHaveCount(0)
    await expect(post).toBeEnabled()
    await text.fill(`  ${"a".repeat(280)}   `)
    await expect(alert).toHaveCount(0)
    await expect(post).toBeEnabled()
    await text.fill(`  ${"a".repeat(281)}   `)
    await expect(alert).toHaveText("Your tweet is 1 characters over the 280 limit.")
    await expect(post).toBeDisabled()
    await text.fill("")
    await expect(alert).toHaveCount(0)
  })

  const refused: [string, PickedFile][] = [
    ["a text file", { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("not an image") }],
    ["an SVG drawing", { name: "drawing.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg/>") }],
    ["a PNG over 5 MB", { name: "huge.png", mimeType: "image/png", buffer: Buffer.alloc(MAX_BYTES + 1) }],
  ]
  for (const [what, file] of refused) {
    await evidence.step(`Pick ${what}: it is refused with a clear message and is not attached`, async () => {
      await chooseImage(page, file)
      await expect(alert).toHaveText(IMAGE_MESSAGE)
      await expect(preview).toHaveCount(0)
      await expect(post).toBeDisabled()
    })
  }

  await evidence.step("Pick an allowed image: the message goes and the image is attached", async () => {
    await chooseImage(page, { name: "fine.gif", mimeType: "image/gif", buffer: PNG })
    await expect(alert).toHaveCount(0)
    await expect(preview).toBeVisible()
    await removeImage.click()
    await expect(preview).toHaveCount(0)
    // Nothing that was refused on the page was sent to the API.
    await settle(page)
    expect(api.calls).toEqual([])
  })

  await evidence.step("If the API refuses the tweet (400), its message shows and the draft stays", async () => {
    api.nextPost = { status: 400, json: { error: "Content too long for this server" } }
    await text.fill("A draft the API refuses")
    await post.click()
    await expect(alert).toHaveText("Content too long for this server")
    await expect(text).toHaveValue("A draft the API refuses")
    await expect(post).toBeEnabled()
    await expect(articles).toHaveCount(1)
  })

  await evidence.step("If the API refuses the upload (413), its message shows, and the text and the image stay", async () => {
    api.nextUpload = { status: 413, json: { error: "Upload too large" } }
    await chooseImage(page, picture("refused-by-api.png"))
    await post.click()
    await expect(alert).toHaveText("Upload too large")
    await expect(text).toHaveValue("A draft the API refuses")
    await expect(preview).toBeVisible()
    await expect(articles).toHaveCount(1)
    expect(api.calls).toEqual(["tweet", "upload"])
  })

  await evidence.step("A server error says to try again, and keeps the draft", async () => {
    api.nextPost = { status: 500, json: { error: "boom" } }
    await post.click()
    await expect(alert).toHaveText(TRY_AGAIN)
    await expect(text).toHaveValue("A draft the API refuses")
    await expect(preview).toBeVisible()
    await expect(articles).toHaveCount(1)
  })

  await evidence.step("A network failure says the same, and keeps the draft", async () => {
    api.nextPost = "network-error"
    await post.click()
    await expect(alert).toHaveText(TRY_AGAIN)
    await expect(text).toHaveValue("A draft the API refuses")
    await expect(preview).toBeVisible()
    await expect(articles).toHaveCount(1)
  })

  await evidence.step("Try again: the same draft posts, and the image that was already uploaded is not uploaded again", async () => {
    await post.click()
    await expect(text).toHaveValue("")
    await expect(preview).toHaveCount(0)
    await expect(alert).toHaveCount(0)
    await expect(articles.first()).toContainText("A draft the API refuses")
    await expect(articles).toHaveCount(2)
    expect(api.uploads).toHaveLength(2)
    expect(api.posts.at(-1)).toEqual({ content: "A draft the API refuses", mediaKeys: ["uploads/1.png"] })
  })
})

// Not an acceptance criterion: the first tweet on a timeline that has none yet.
test("the first tweet replaces the empty timeline message", async ({ page, evidence }) => {
  const api = await serveApi(page, [])
  const { text, post } = composer(page)

  await evidence.step("Open a home timeline with no tweets", async () => {
    await page.goto("/")
    await expect(page.getByText("No tweets yet.")).toBeVisible()
  })

  await evidence.step("Post a tweet: it takes the place of the message", async () => {
    await text.fill("The very first tweet")
    await post.click()
    await expect(page.getByRole("article")).toHaveCount(1)
    await expect(page.getByRole("article").first()).toContainText("The very first tweet")
    await expect(page.getByText("No tweets yet.")).toHaveCount(0)
    expect(api.posts).toEqual([{ content: "The very first tweet" }])
  })
})

// Not an acceptance criterion: a read-only check that the real API still documents the limits and
// the fields the tests above rely on. If this fails, the API changed and the composer (and
// `serveApi`) must follow it.
test("contract: the real API still documents the limits and fields the composer uses", async ({ page }) => {
  const response = await page.request.get("/api/openapi.json")
  expect(response.status()).toBe(200)
  const spec = await response.json()

  const tweetBody = spec.paths["/api/tweets"].post.requestBody.content["application/json"].schema
  expect(tweetBody.properties.content.maxLength).toBe(280)
  expect(Object.keys(tweetBody.properties)).toEqual(expect.arrayContaining(["content", "mediaKeys"]))

  const upload = spec.paths["/api/upload"].post
  expect(upload.requestBody.content["multipart/form-data"].schema.properties.files).toBeTruthy()
  expect(Object.keys(upload.responses)).toEqual(expect.arrayContaining(["201", "400", "413"]))
})
