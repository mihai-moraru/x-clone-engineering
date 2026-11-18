import type { Page } from "@playwright/test"

import { expect, test } from "./fixtures"

// XC-8 · Story 2.1: Scroll the home timeline.
//
// These tests run on the person's saved sign-in, like every other spec, and write nothing to the
// shared API: no accounts, no follows, no tweets. The timeline's contents come from
// `serveTimeline`, which answers the app's own GET /api/timeline calls from a list the test
// controls, paging the way the API does (`limit` and `cursor` in, `items` and `nextCursor` out).
// That is what lets a test show three pages of tweets, or none at all, whatever the person's
// real timeline holds today. The last test reads the real endpoint (read-only) to check that the
// shape these answers use is the shape the API really sends.
//
// AC1 is read as the product owner decided on the ticket (2026-11-18): the timeline shows my
// tweets and those of people I follow, which is what GET /api/timeline returns. The app shows
// whatever that endpoint returns, in the order it returns it.

const PAGE_SIZE = 20

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

const ADA: Author = { id: "xc8-ada", name: "Ada Lovelace", handle: "@ada_xc8" }
const GRACE: Author = { id: "xc8-grace", name: "Grace Hopper", handle: "@grace_xc8" }
const ALAN: Author = { id: "xc8-alan", name: "Alan Turing", handle: "@alan_xc8" }

/** A tweet as the API sends it, posted `minutesAgo` minutes before now. */
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

/**
 * Answer the app's GET /api/timeline calls from `tweets` (already newest first), one page per
 * call, as the API does. Returns the timeline requests the app made, in order.
 */
async function serveTimeline(page: Page, tweets: Tweet[]) {
  const requests: URL[] = []
  await page.route("**/api/timeline*", async (route) => {
    const url = new URL(route.request().url())
    requests.push(url)
    const limit = Number(url.searchParams.get("limit") ?? PAGE_SIZE)
    const cursor = url.searchParams.get("cursor")
    const start = cursor ? Number(cursor.replace("after-", "")) : 0
    const end = start + limit
    await route.fulfill({
      json: { items: tweets.slice(start, end), nextCursor: end < tweets.length ? `after-${end}` : null },
    })
  })
  return requests
}

/** The signed-in person, as an author of tweets. */
async function me(page: Page): Promise<Author> {
  const session = await (await page.request.get("/api/auth/get-session")).json()
  expect(session?.user, "the saved sign-in is still valid").toBeTruthy()
  return { id: session.user.id, name: session.user.name, handle: `@${String(session.user.handle).replace(/^@/, "")}` }
}

test("AC1: the home timeline shows tweets from all users, newest first", async ({ page, evidence }) => {
  const myself = await me(page)
  // What the timeline endpoint returns: my own tweet and those of three people, newest first.
  const timeline = [
    makeTweet(5, ADA, "Fifth tweet: the newest, from Ada again", 1),
    makeTweet(4, myself, "Fourth tweet: my own", 2),
    makeTweet(3, ALAN, "Third tweet, from Alan", 3),
    makeTweet(2, GRACE, "Second tweet, from Grace", 4),
    makeTweet(1, ADA, "First tweet: the oldest, from Ada", 5),
  ]
  await serveTimeline(page, timeline)

  await evidence.step("Open the home timeline", async () => {
    await page.goto("/")
    await expect(page.getByRole("article").first()).toBeVisible()
  })

  await evidence.step("Tweets from different users are there: Ada, Grace, Alan and me", async () => {
    for (const author of [ADA, GRACE, ALAN, myself]) {
      await expect(page.getByRole("article").filter({ hasText: author.handle }).first()).toBeVisible()
    }
    await expect(page.getByRole("article")).toHaveCount(timeline.length)
  })

  await evidence.step("They are in order, newest first", async () => {
    await expect(page.getByRole("article").locator("p")).toHaveText(timeline.map((tweet) => tweet.content))
    const shownTimes = await page
      .getByRole("article")
      .locator("time")
      .evaluateAll((times) => times.map((time) => time.getAttribute("datetime")))
    expect(shownTimes).toEqual(timeline.map((tweet) => tweet.createdAt))
    expect([...shownTimes].sort().reverse()).toEqual(shownTimes)
  })
})

test("AC2: more tweets load automatically as I scroll, with no next page button", async ({ page, evidence }) => {
  const total = PAGE_SIZE * 2 + 5
  // More than two pages of tweets, numbered oldest (1) to newest (45), served newest first.
  const timeline = Array.from({ length: total }, (_, index) => {
    const n = total - index
    return makeTweet(n, [ADA, GRACE, ALAN][n % 3], `Tweet number ${n}.`, index + 1)
  })
  const requests = await serveTimeline(page, timeline)

  const tweets = page.getByRole("article")
  const tweetNumber = (n: number) => page.getByText(`Tweet number ${n}.`, { exact: true })
  const cursors = () => requests.map((url) => url.searchParams.get("cursor"))

  await evidence.step("Open the home timeline: only the newest tweets are loaded", async () => {
    await page.goto("/")
    await expect(tweetNumber(total)).toBeVisible()
    await expect(tweets).toHaveCount(PAGE_SIZE)
    await expect(tweetNumber(1)).toHaveCount(0)
    expect(cursors()).toEqual([null])
  })

  await evidence.step("There is no next page or load more button", async () => {
    await expect(page.getByRole("button", { name: /next|more|load|older/i })).toHaveCount(0)
    await expect(page.getByRole("link", { name: /next|more|load|older/i })).toHaveCount(0)
  })

  // Each scroll goes only as far as the last tweet loaded so far. Scrolling past it would be
  // fine for a reader, but the next page lands under the viewport again and loads too, and the
  // test could no longer tell one automatic load from two.
  await evidence.step("Scroll down to the last tweet: the next tweets load by themselves", async () => {
    await tweets.nth(PAGE_SIZE - 1).scrollIntoViewIfNeeded()
    await expect(tweets).toHaveCount(PAGE_SIZE * 2)
    // The app asked for the next page with the cursor the first page gave it.
    expect(cursors()).toEqual([null, `after-${PAGE_SIZE}`])
  })

  await evidence.step("Scroll down again: the rest load, down to the oldest tweet", async () => {
    await tweets.nth(PAGE_SIZE * 2 - 1).scrollIntoViewIfNeeded()
    await expect(tweets).toHaveCount(total)
    await tweetNumber(1).scrollIntoViewIfNeeded()
    await expect(tweetNumber(1)).toBeVisible()
    expect(cursors()).toEqual([null, `after-${PAGE_SIZE}`, `after-${PAGE_SIZE * 2}`])
  })

  await evidence.step("Still no button, nothing was loaded twice, and the order held", async () => {
    await expect(page.getByRole("button", { name: /next|more|load|older/i })).toHaveCount(0)
    await expect(tweets.locator("p")).toHaveText(timeline.map((tweet) => tweet.content))
  })
})

test("AC3: each tweet shows the author's name and handle, when it was posted, the text, and the image", async ({
  page,
  browser,
  evidence,
}) => {
  // A real picture for the tweet: a screenshot of a coloured card, drawn in a separate,
  // unrecorded browser context so that the test's only video is the one of the timeline.
  const studio = await browser.newContext({ viewport: { width: 480, height: 270 } })
  const card = await studio.newPage()
  await card.setContent(
    `<body style="margin:0;display:grid;place-items:center;height:100vh;background:#1d9bf0;color:#fff;` +
      `font:700 40px system-ui">XC-8 picture</body>`
  )
  const picture = await card.screenshot({ type: "png" })
  await studio.close()

  const pictureUrl = "https://media.xc8.test/picture.png"
  await page.route(pictureUrl, (route) => route.fulfill({ contentType: "image/png", body: picture }))

  const withImage = makeTweet(2, ADA, "A tweet with a picture", 3, [pictureUrl])
  const plain = makeTweet(1, GRACE, "A tweet with only text", 12)
  await serveTimeline(page, [withImage, plain])

  const imageTweet = page.getByRole("article").filter({ hasText: withImage.content })
  const plainTweet = page.getByRole("article").filter({ hasText: plain.content })

  await evidence.step("Open the home timeline", async () => {
    await page.goto("/")
    await expect(imageTweet).toBeVisible()
    await expect(plainTweet).toBeVisible()
  })

  await evidence.step("The tweet shows its author's name and handle", async () => {
    await expect(imageTweet.getByText(ADA.name, { exact: true })).toBeVisible()
    await expect(imageTweet.getByText(ADA.handle, { exact: true })).toBeVisible()
  })

  await evidence.step("It shows when it was posted: 3 minutes ago", async () => {
    const time = imageTweet.locator("time")
    await expect(time).toBeVisible()
    await expect(time).toHaveAttribute("datetime", withImage.createdAt)
    await expect(time).toHaveText("3m")
  })

  await evidence.step("It shows the text", async () => {
    await expect(imageTweet.getByText(withImage.content, { exact: true })).toBeVisible()
  })

  await evidence.step("It shows the image, and the image really loads", async () => {
    const image = imageTweet.getByRole("img")
    await expect(image).toBeVisible()
    await expect(image).toHaveAttribute("src", pictureUrl)
    await expect
      .poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
      .toBe(true)
  })

  await evidence.step("A tweet without an image shows the same details and no image", async () => {
    await expect(plainTweet.getByText(GRACE.name, { exact: true })).toBeVisible()
    await expect(plainTweet.getByText(GRACE.handle, { exact: true })).toBeVisible()
    await expect(plainTweet.locator("time")).toHaveAttribute("datetime", plain.createdAt)
    await expect(plainTweet.locator("time")).toHaveText("12m")
    await expect(plainTweet.getByText(plain.content, { exact: true })).toBeVisible()
    await expect(plainTweet.getByRole("img")).toHaveCount(0)
  })
})

test("AC4: with no tweets yet I see a simple empty message", async ({ page, evidence }) => {
  // No tweets yet: the timeline endpoint answers with an empty page.
  const requests = await serveTimeline(page, [])

  await evidence.step("Open the home timeline when there are no tweets", async () => {
    await page.goto("/")
    await expect(page.getByRole("button", { name: /^Sign out/ })).toBeVisible()
  })

  await evidence.step("A simple message says there are no tweets yet", async () => {
    await expect(page.getByText("No tweets yet.")).toBeVisible()
    await expect(page.getByRole("article")).toHaveCount(0)
  })

  await evidence.step("Nothing else stands in for it: no error and no endless loading", async () => {
    // Scoped to the page's own content: the evidence caption for this step says "loading" too.
    const content = page.getByRole("main")
    await expect(content.getByRole("alert")).toHaveCount(0)
    await expect(content.getByText(/loading/i)).toHaveCount(0)
    // One request, and no asking for a next page that doesn't exist.
    expect(requests).toHaveLength(1)
  })
})

// Not an acceptance criterion: a read-only check that the real API still answers in the shape
// the tests above serve. If this fails, the API changed and `serveTimeline` must follow it.
test("contract: the real timeline endpoint answers in the shape these tests serve", async ({ page }) => {
  const response = await page.request.get(`/api/timeline?limit=${PAGE_SIZE}`)
  expect(response.status()).toBe(200)

  const body = (await response.json()) as { items: Tweet[]; nextCursor: string | null }
  expect(Array.isArray(body.items)).toBe(true)
  expect(body.items.length).toBeLessThanOrEqual(PAGE_SIZE)
  expect(body.nextCursor === null || typeof body.nextCursor === "string").toBe(true)

  for (const tweet of body.items) {
    expect(typeof tweet.id).toBe("string")
    expect(typeof tweet.author.name).toBe("string")
    expect(typeof tweet.author.handle).toBe("string")
    expect(typeof tweet.content).toBe("string")
    expect(Array.isArray(tweet.mediaUrls)).toBe(true)
    expect(Number.isNaN(Date.parse(tweet.createdAt))).toBe(false)
  }
  const times = body.items.map((tweet) => tweet.createdAt)
  expect([...times].sort().reverse(), "newest first").toEqual(times)
})
