import type { Locator, Page, Route } from "@playwright/test"

import { expect, test } from "./fixtures"

// XC-10 · Story 3.1: Like and unlike a tweet.
//
// These tests run on the person's saved sign-in, like every other spec, and write nothing to the
// shared API: no likes, no tweets, no accounts. The app's own calls are answered from here:
//
// - GET /api/timeline serves a short list of tweets the test controls (one page, the shape the
//   API sends), so the tweet under test, its like count and its liked state are known.
// - POST and DELETE /api/tweets/<id>/like are served by `serveLikes`, a small fake of the like
//   endpoints: it remembers who likes what, answers `{ likeCount }` like the real ones, and lets
//   a test hold an answer back (AC2) or answer 500 (AC3). Any other method on that path gets a
//   405, so a wrong request shows up as a failed test, never as a write.
//
// Nothing here is confirmed against the real like endpoints: their shape comes from the API's
// OpenAPI document (POST and DELETE answer `{ likeCount }`; both are idempotent).

const TWEET_ID = "00000000-0000-4000-8000-000000001001"
const OTHER_ID = "00000000-0000-4000-8000-000000001002"
const FAILURE_MESSAGE = "Couldn't save your like. Try again."

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

function makeTweet(id: string, name: string, handle: string, content: string, minutesAgo: number, overrides: Partial<Tweet> = {}): Tweet {
  return {
    id,
    authorId: `xc10-${handle}`,
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

/** The tweet every test taps: not liked yet, 3 likes. */
const target = makeTweet(TWEET_ID, "Ada Lovelace", "@ada_xc10", "A tweet to like", 2, { likeCount: 3 })
/** A neighbour that must not change when the target is liked: already liked, 9 likes. */
const neighbour = makeTweet(OTHER_ID, "Grace Hopper", "@grace_xc10", "A tweet I already like", 5, {
  likeCount: 9,
  likedByMe: true,
})

/** Answer the app's GET /api/timeline with one page holding `tweets` (already newest first). */
async function serveTimeline(page: Page, tweets: Tweet[]) {
  await page.route("**/api/timeline*", (route) => route.fulfill({ json: { items: tweets, nextCursor: null } }))
}

type LikeCall = { method: string; tweetId: string }

/**
 * Fake the like endpoints. `answer` decides what each request gets; by default the fake keeps
 * the count of the tweets it was given and answers 200 `{ likeCount }` for POST and DELETE.
 * Returns the requests the app made, in order, and a way to wait for the n-th one to arrive.
 */
async function serveLikes(
  page: Page,
  tweets: Tweet[],
  answer?: (route: Route, call: LikeCall, proceed: () => Promise<void>) => Promise<void>
) {
  const calls: LikeCall[] = []
  const state = new Map(tweets.map((tweet) => [tweet.id, { liked: tweet.likedByMe, count: tweet.likeCount }]))

  await page.route("**/api/tweets/*/like", async (route) => {
    const request = route.request()
    const tweetId = new URL(request.url()).pathname.split("/").at(-2) ?? ""
    const call = { method: request.method(), tweetId }
    calls.push(call)

    const proceed = async () => {
      if (call.method !== "POST" && call.method !== "DELETE") {
        await route.fulfill({ status: 405, json: {} })
        return
      }
      const tweet = state.get(tweetId)
      if (!tweet) {
        // The real API answers 500 for a tweet that does not exist (a known issue).
        await route.fulfill({ status: 500, json: {} })
        return
      }
      const wanted = call.method === "POST"
      // Idempotent, like the real endpoints: the count only moves when the state does.
      if (tweet.liked !== wanted) tweet.count += wanted ? 1 : -1
      tweet.liked = wanted
      await route.fulfill({ json: { likeCount: tweet.count } })
    }

    if (answer) await answer(route, call, proceed)
    else await proceed()
  })

  return { calls }
}

/** The card of the tweet with this text, and its like button inside it. */
function cardOf(page: Page, tweet: Tweet): Locator {
  return page.getByRole("article").filter({ hasText: tweet.content })
}

function likeButtonOf(page: Page, tweet: Tweet): Locator {
  return cardOf(page, tweet).getByRole("button", { name: "Like", exact: true })
}

async function openTimeline(page: Page) {
  await page.goto("/")
  await expect(cardOf(page, target)).toBeVisible()
}

test("AC1: tapping like once likes the tweet; tapping again removes my like", async ({ page, evidence }) => {
  await serveTimeline(page, [target, neighbour])
  const { calls } = await serveLikes(page, [target, neighbour])
  const like = likeButtonOf(page, target)

  await evidence.step("Open the home timeline: the tweet has 3 likes and I have not liked it", async () => {
    await openTimeline(page)
    await expect(like).toBeVisible()
    await expect(like).toHaveAttribute("aria-pressed", "false")
    await expect(like).toHaveText("3")
    expect(calls).toEqual([])
  })

  await evidence.step("Tap like once: the tweet is liked and has 4 likes", async () => {
    await like.click()
    await expect(like).toHaveAttribute("aria-pressed", "true")
    await expect(like).toHaveText("4")
    await expect.poll(() => calls).toEqual([{ method: "POST", tweetId: TWEET_ID }])
  })

  await evidence.step("It stays liked once the answer has come back", async () => {
    await expect(like).toHaveAttribute("aria-pressed", "true")
    await expect(like).toHaveText("4")
  })

  await evidence.step("Tap again: my like is removed and the count is back to 3", async () => {
    await like.click()
    await expect(like).toHaveAttribute("aria-pressed", "false")
    await expect(like).toHaveText("3")
    await expect
      .poll(() => calls)
      .toEqual([
        { method: "POST", tweetId: TWEET_ID },
        { method: "DELETE", tweetId: TWEET_ID },
      ])
  })

  await evidence.step("The other tweet was not touched: still liked, still 9", async () => {
    const other = likeButtonOf(page, neighbour)
    await expect(other).toHaveAttribute("aria-pressed", "true")
    await expect(other).toHaveText("9")
    expect(calls.every((call) => call.tweetId === TWEET_ID)).toBe(true)
  })
})

test("AC2: the like count and the button state update immediately, even on a slow connection", async ({
  page,
  evidence,
}) => {
  await serveTimeline(page, [target, neighbour])
  // A slow connection: the answer to the like is held back until the test lets it go.
  let release: () => void = () => undefined
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  const { calls } = await serveLikes(page, [target, neighbour], async (_route, _call, proceed) => {
    await held
    await proceed()
  })
  const like = likeButtonOf(page, target)

  try {
    await evidence.step("Open the home timeline: the tweet has 3 likes and I have not liked it", async () => {
      await openTimeline(page)
      await expect(like).toHaveAttribute("aria-pressed", "false")
      await expect(like).toHaveText("3")
    })

    await evidence.step("Tap like on a slow connection: the button and count change before any answer", async () => {
      await like.click()
      // The request is on its way and has not been answered: it is held in this test.
      await expect.poll(() => calls).toEqual([{ method: "POST", tweetId: TWEET_ID }])
      await expect(like).toHaveAttribute("aria-pressed", "true")
      await expect(like).toHaveText("4")
    })

    await evidence.step("The screen still shows the new state while the answer is held back", async () => {
      await expect(like).toHaveAttribute("aria-pressed", "true")
      await expect(like).toHaveText("4")
      expect(calls).toHaveLength(1)
    })

    await evidence.step("The answer arrives: nothing jumps, the like is saved", async () => {
      release()
      await expect(like).toHaveAttribute("aria-pressed", "true")
      await expect(like).toHaveText("4")
      expect(calls).toHaveLength(1)
    })
  } finally {
    // Never leave the held answer pending, even when a step above failed.
    release()
  }
})

test("AC3: if saving my like fails, the count goes back and I see a message", async ({ page, evidence }) => {
  await serveTimeline(page, [target, neighbour])
  // Saving fails: the server answers 500.
  const { calls } = await serveLikes(page, [target, neighbour], async (route) => {
    await route.fulfill({ status: 500, json: { error: "Internal Server Error" } })
  })
  const like = likeButtonOf(page, target)

  await evidence.step("Open the home timeline: the tweet has 3 likes and I have not liked it", async () => {
    await openTimeline(page)
    await expect(like).toHaveAttribute("aria-pressed", "false")
    await expect(like).toHaveText("3")
  })

  await evidence.step("Tap like while the server is failing: a message says it was not saved", async () => {
    await like.click()
    await expect.poll(() => calls).toEqual([{ method: "POST", tweetId: TWEET_ID }])
    await expect(page.getByText(FAILURE_MESSAGE, { exact: true })).toBeVisible()
  })

  await evidence.step("The count is back to 3 and the heart is not pressed", async () => {
    await expect(like).toHaveAttribute("aria-pressed", "false")
    await expect(like).toHaveText("3")
  })

  await evidence.step("The other tweet was not touched: still liked, still 9", async () => {
    const other = likeButtonOf(page, neighbour)
    await expect(other).toHaveAttribute("aria-pressed", "true")
    await expect(other).toHaveText("9")
  })
})
