import type { Locator, Page } from "@playwright/test"

import { expect, test } from "./fixtures"

// XC-12 · Story 3.3: Reply to a tweet inline.
//
// These tests run on the person's saved sign-in, like every other spec, and write nothing to the
// shared API: no tweets, no replies, no uploads. The app's own calls are answered from here:
//
// - GET /api/timeline serves one page of tweets the test controls (the shape the API sends), so
//   the tweet under test, its reply count and its neighbour are known.
// - GET /api/tweets/<id>/replies serves the existing replies of the tweet under test, oldest
//   first, as `{ items }`. A test can hold that answer back to look at the loading state.
// - POST /api/tweets is a small fake of the "post a tweet" endpoint, used only for replies: it
//   records the JSON body the app sent, and answers 201 with a Tweet built from it. Any other
//   method on that path gets a 405, so a wrong request shows up as a failed test, never as a
//   write. The reply's picture is served from `page.route` too.
//
// Nothing here is confirmed against the real endpoints: their shape comes from the API's OpenAPI
// document (POST /api/tweets takes `{ content, parentTweetId }` and answers 201 with a Tweet;
// GET /api/tweets/{id}/replies answers `{ items }`, oldest first).

const TWEET_ID = "00000000-0000-4000-8000-000000001201"
const OTHER_ID = "00000000-0000-4000-8000-000000001202"
const PICTURE_URL = "https://media.xc12.test/reply.png"
/** A 1 x 1 PNG, enough for an image that really loads. */
const PICTURE = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
  "base64"
)

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

function makeTweet(
  id: string,
  name: string,
  handle: string,
  content: string,
  minutesAgo: number,
  overrides: Partial<Tweet> = {}
): Tweet {
  return {
    id,
    authorId: `xc12-${handle}`,
    author: { name, handle },
    content,
    mediaUrls: [],
    createdAt: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
    likeCount: 0,
    retweetCount: 0,
    replyCount: 0,
    likedByMe: false,
    retweetedByMe: false,
    ...overrides,
  }
}

/**
 * The tweets of one test, built when the test starts so that "12m ago" is still 12 minutes ago
 * when the (much slower) evidence run gets to it.
 */
function scenario() {
  return {
    /** The tweet every test replies to: two replies so far. */
    target: makeTweet(TWEET_ID, "Ada Lovelace", "@ada_xc12", "A tweet to reply to", 30, { replyCount: 2 }),
    /** A neighbour that must stay as it is: no replies, thread closed. */
    neighbour: makeTweet(OTHER_ID, "Grace Hopper", "@grace_xc12", "A tweet I leave alone", 40),
    /** The replies the API already holds for the target, oldest first. */
    existing: [
      makeTweet("00000000-0000-4000-8000-000000001211", "Alan Turing", "@alan_xc12", "First reply, with a picture", 12, {
        mediaUrls: [PICTURE_URL],
      }),
      makeTweet("00000000-0000-4000-8000-000000001212", "Katherine Johnson", "@katherine_xc12", "Second reply, text only", 7),
    ],
  }
}

/** Who the fake API says wrote a reply posted by the signed-in person. */
const WRITER = { id: "xc12-writer", name: "Me Myself", handle: "@me_xc12" }

type ReplyBody = { content: string; parentTweetId: string }

/** Answer the app's GET /api/timeline with one page holding `tweets` (already newest first). */
async function serveTimeline(page: Page, tweets: Tweet[]) {
  await page.route("**/api/timeline*", (route) => route.fulfill({ json: { items: tweets, nextCursor: null } }))
}

/**
 * Fake the reply endpoints for the tweet under test. `hold` keeps the replies GET waiting until it
 * resolves. Returns what the app asked for: the replies GETs (tweet ids) and the POST bodies, in order.
 */
async function serveThread(page: Page, replies: Tweet[], hold?: Promise<void>) {
  const gets: string[] = []
  const posts: unknown[] = []

  await page.route("**/api/tweets/*/replies", async (route) => {
    const request = route.request()
    if (request.method() !== "GET") {
      await route.fulfill({ status: 405, json: {} })
      return
    }
    gets.push(new URL(request.url()).pathname.split("/").at(-2) ?? "")
    if (hold) await hold
    await route.fulfill({ json: { items: replies } })
  })

  await page.route("**/api/tweets", async (route) => {
    const request = route.request()
    if (request.method() !== "POST") {
      await route.fulfill({ status: 405, json: {} })
      return
    }
    const body = request.postDataJSON() as ReplyBody
    posts.push(body)
    const reply = makeTweet(
      `00000000-0000-4000-8000-${(1300 + posts.length).toString().padStart(12, "0")}`,
      WRITER.name,
      WRITER.handle,
      body.content,
      2
    )
    await route.fulfill({ status: 201, json: { ...reply, authorId: WRITER.id } })
  })

  await page.route(PICTURE_URL, (route) => route.fulfill({ contentType: "image/png", body: PICTURE }))

  return { gets, posts }
}

/** The card of a tweet, found by its text. */
function cardOf(page: Page, tweet: Tweet): Locator {
  return page.getByRole("article").filter({ hasText: tweet.content })
}

function replyButtonOf(card: Locator): Locator {
  return card.getByRole("button", { name: "Reply", exact: true })
}

/** The thread inside a card, once it is open. */
function threadOf(card: Locator, author: string): Locator {
  return card.getByRole("region", { name: `Replies to ${author}` })
}

async function openTimeline(page: Page, tweet: Tweet) {
  await page.goto("/")
  await expect(cardOf(page, tweet)).toBeVisible()
}

test("AC1: I can write a reply to a tweet from the timeline", async ({ page, evidence }) => {
  const { target, neighbour, existing } = scenario()
  await serveTimeline(page, [target, neighbour])
  const { gets, posts } = await serveThread(page, existing)
  const card = cardOf(page, target)
  const reply = replyButtonOf(card)
  const thread = threadOf(card, target.author.name)
  const textbox = card.getByRole("textbox", { name: `Reply to ${target.author.name}` })
  const postReply = card.getByRole("button", { name: "Post reply", exact: true })

  await evidence.step("Open the home timeline: the tweet has 2 replies and its thread is closed", async () => {
    await openTimeline(page, target)
    await expect(reply).toBeVisible()
    await expect(reply).toHaveAttribute("aria-expanded", "false")
    await expect(reply).toHaveText("2")
    await expect(textbox).toHaveCount(0)
    expect(gets).toEqual([])
  })

  await evidence.step("Press Reply: the thread opens under the tweet with its 2 replies", async () => {
    await reply.click()
    await expect(reply).toHaveAttribute("aria-expanded", "true")
    await expect(thread).toBeVisible()
    await expect(thread.getByRole("listitem")).toHaveCount(2)
    expect(gets).toEqual([TWEET_ID])
  })

  await evidence.step("Write a reply, with spaces around it: Post reply is enabled", async () => {
    await expect(postReply).toBeDisabled()
    await textbox.fill("  Thanks, that is what I meant!  ")
    await expect(postReply).toBeEnabled()
  })

  await evidence.step("Post the reply: the app sends the trimmed text and the id of this tweet", async () => {
    await postReply.click()
    await expect.poll(() => posts).toEqual([{ content: "Thanks, that is what I meant!", parentTweetId: TWEET_ID }])
  })

  await evidence.step("The reply is listed at the end, the form is clear and the count is 3", async () => {
    const replies = thread.getByRole("listitem")
    await expect(replies).toHaveCount(3)
    await expect(replies.last()).toContainText("Thanks, that is what I meant!")
    await expect(replies.last()).toContainText(WRITER.name)
    await expect(replies.last()).toContainText(WRITER.handle)
    await expect(textbox).toHaveValue("")
    await expect(postReply).toBeDisabled()
    await expect(reply).toHaveText("3")
  })

  await evidence.step("The neighbouring tweet was not touched", async () => {
    const other = cardOf(page, neighbour)
    await expect(replyButtonOf(other)).toHaveAttribute("aria-expanded", "false")
    await expect(replyButtonOf(other)).toHaveText("0")
    expect(posts).toHaveLength(1)
  })
})

test("AC2: replies appear directly under that tweet in the timeline, without opening a separate page", async ({
  page,
  evidence,
}) => {
  const { target, neighbour, existing } = scenario()
  await serveTimeline(page, [target, neighbour])
  // A slow connection: the replies are held back until the test lets them go.
  let release: () => void = () => undefined
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  const { posts } = await serveThread(page, existing, held)
  const card = cardOf(page, target)
  const thread = threadOf(card, target.author.name)
  const visited: string[] = []
  let home = ""

  try {
    await evidence.step("Open the home timeline and note where I am", async () => {
      await openTimeline(page, target)
      home = page.url()
      // From here on any navigation, a page load or a route change, is recorded.
      page.on("framenavigated", (frame) => {
        if (frame === page.mainFrame()) visited.push(frame.url())
      })
    })

    await evidence.step("Press Reply: while the replies load there is a status message", async () => {
      await replyButtonOf(card).click()
      await expect(thread.getByRole("status")).toContainText(/loading replies/i)
    })

    await evidence.step("The replies arrive inside this tweet: name, handle, when, text and image", async () => {
      release()
      const [first, second] = [thread.getByRole("listitem").nth(0), thread.getByRole("listitem").nth(1)]
      await expect(thread.getByRole("listitem")).toHaveCount(2)
      await expect(thread.getByRole("status")).toHaveCount(0)

      await expect(first).toContainText(existing[0].author.name)
      await expect(first).toContainText(existing[0].author.handle)
      await expect(first.locator("time")).toHaveAttribute("datetime", existing[0].createdAt)
      // Posted 12 minutes before the test started; the slow evidence run may tick it over to 13.
      await expect(first.locator("time")).toHaveText(/^1[23]m$/)
      await expect(first).toContainText(existing[0].content)
      const image = first.getByRole("img")
      await expect(image).toHaveAttribute("src", PICTURE_URL)
      await expect
        .poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
        .toBe(true)

      await expect(second).toContainText(existing[1].author.name)
      await expect(second).toContainText(existing[1].author.handle)
      await expect(second.locator("time")).toHaveText(/^[78]m$/)
      await expect(second).toContainText(existing[1].content)
      await expect(second.getByRole("img")).toHaveCount(0)
    })

    await evidence.step("Post a reply: it joins the same tweet, after the others", async () => {
      await card.getByRole("textbox", { name: `Reply to ${target.author.name}` }).fill("A third voice")
      await card.getByRole("button", { name: "Post reply", exact: true }).click()
      await expect(thread.getByRole("listitem")).toHaveCount(3)
      await expect(thread.getByRole("listitem").last()).toContainText("A third voice")
      expect(posts).toHaveLength(1)
    })

    await evidence.step("Replies are not tweets of their own: the timeline still has 2 tweets", async () => {
      await expect(page.getByRole("article")).toHaveCount(2)
      await expect(card.getByText(existing[0].content)).toBeVisible()
      await expect(cardOf(page, neighbour).getByRole("listitem")).toHaveCount(0)
    })

    await evidence.step("A reply has no Reply, like or retweet button of its own", async () => {
      await expect(thread.getByRole("listitem").getByRole("button")).toHaveCount(0)
    })

    await evidence.step("Nothing navigated: same address, no page change at all", async () => {
      await expect(page).toHaveURL(home)
      expect(visited).toEqual([])
    })
  } finally {
    // Never leave the held answer pending if a step above failed.
    release()
  }
})

test("AC3: I cannot post an empty reply", async ({ page, evidence }) => {
  const { target, neighbour, existing } = scenario()
  await serveTimeline(page, [target, neighbour])
  const { posts } = await serveThread(page, existing)
  const card = cardOf(page, target)
  const textbox = card.getByRole("textbox", { name: `Reply to ${target.author.name}` })
  const postReply = card.getByRole("button", { name: "Post reply", exact: true })

  await evidence.step("Open the home timeline and the thread under the tweet", async () => {
    await openTimeline(page, target)
    await replyButtonOf(card).click()
    await expect(textbox).toBeVisible()
    await expect(threadOf(card, target.author.name).getByRole("listitem")).toHaveCount(2)
  })

  await evidence.step("With nothing written, Post reply is disabled", async () => {
    await expect(textbox).toHaveValue("")
    await expect(postReply).toBeDisabled()
  })

  await evidence.step("With only spaces and line breaks, Post reply is still disabled", async () => {
    await textbox.fill("   \n  \t  ")
    await expect(postReply).toBeDisabled()
  })

  await evidence.step("Submitting the form some other way sends nothing either", async () => {
    // Enter in a textarea only starts a new line; a script can still submit the form directly.
    await textbox.press("Enter")
    await textbox.evaluate((field) => {
      field.closest("form")?.requestSubmit()
    })
    await expect(postReply).toBeDisabled()
    await expect(card.getByRole("alert")).toHaveCount(0)
  })

  await evidence.step("Then one real reply goes through: it is the only request ever sent", async () => {
    await textbox.fill("A real reply")
    await expect(postReply).toBeEnabled()
    await postReply.click()
    await expect(threadOf(card, target.author.name).getByRole("listitem")).toHaveCount(3)
    // Had an empty submission been sent, it would be in front of this one.
    expect(posts).toEqual([{ content: "A real reply", parentTweetId: TWEET_ID }])
  })
})
