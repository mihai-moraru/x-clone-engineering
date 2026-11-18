import type { Locator, Page, Response as PlaywrightResponse, Route } from "@playwright/test"

import { expect, test } from "./fixtures"

// XC-11 · Story 3.2: Retweet and undo a retweet.
//
// These tests run on the person's saved sign-in, like every other spec, and write nothing to the
// shared API: no retweets, no tweets, no accounts. The app's own calls are answered from here:
//
// - GET /api/timeline serves a short list of tweets the test controls (one page, the shape the
//   API sends), so the tweet under test, its retweet count and its retweeted state are known.
// - POST and DELETE /api/tweets/<id>/retweet are served by `serveRetweets`, a small fake of the
//   retweet endpoints: it remembers who retweeted what, answers `{ retweetCount }` like the real
//   ones, and lets a test hold an answer back (AC2) or answer 500 (AC3). Any other method on that
//   path gets a 405, so a wrong request shows up as a failed test, never as a write.
//
// Nothing here is confirmed against the real retweet endpoints: their shape comes from the API's
// OpenAPI document (POST and DELETE answer `{ retweetCount }`; both are idempotent).

const TWEET_ID = "00000000-0000-4000-8000-000000001101"
const OTHER_ID = "00000000-0000-4000-8000-000000001102"
const FAILURE_MESSAGE = "Couldn't save your retweet. Try again."

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
    authorId: `xc11-${handle}`,
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

/** The tweet every test taps: not retweeted yet, 3 retweets. */
const target = makeTweet(TWEET_ID, "Ada Lovelace", "@ada_xc11", "A tweet to retweet", 2, { retweetCount: 3 })
/** A neighbour that must not change when the target is retweeted: already retweeted, 9 retweets. */
const neighbour = makeTweet(OTHER_ID, "Grace Hopper", "@grace_xc11", "A tweet I already retweeted", 5, {
  retweetCount: 9,
  retweetedByMe: true,
})

/** Answer the app's GET /api/timeline with one page holding `tweets` (already newest first). */
async function serveTimeline(page: Page, tweets: Tweet[]) {
  await page.route("**/api/timeline*", (route) => route.fulfill({ json: { items: tweets, nextCursor: null } }))
}

type RetweetCall = { method: string; tweetId: string }

/**
 * Fake the retweet endpoints. `answer` decides what each request gets; by default the fake keeps
 * the count of the tweets it was given and answers 200 `{ retweetCount }` for POST and DELETE.
 * Returns the requests the app made, in order.
 */
async function serveRetweets(
  page: Page,
  tweets: Tweet[],
  answer?: (route: Route, call: RetweetCall, proceed: () => Promise<void>) => Promise<void>
) {
  const calls: RetweetCall[] = []
  const state = new Map(tweets.map((tweet) => [tweet.id, { retweeted: tweet.retweetedByMe, count: tweet.retweetCount }]))

  await page.route("**/api/tweets/*/retweet", async (route) => {
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
      if (tweet.retweeted !== wanted) tweet.count += wanted ? 1 : -1
      tweet.retweeted = wanted
      await route.fulfill({ json: { retweetCount: tweet.count } })
    }

    if (answer) await answer(route, call, proceed)
    else await proceed()
  })

  return { calls }
}

/** The card of the tweet with this text, and its retweet button inside it. */
function cardOf(page: Page, tweet: Tweet): Locator {
  return page.getByRole("article").filter({ hasText: tweet.content })
}

function retweetButtonOf(page: Page, tweet: Tweet): Locator {
  return cardOf(page, tweet).getByRole("button", { name: "Retweet", exact: true })
}

async function openTimeline(page: Page) {
  await page.goto("/")
  await expect(cardOf(page, target)).toBeVisible()
}

test("AC1: tapping retweet once retweets the tweet; tapping again undoes it", async ({ page, evidence }) => {
  await serveTimeline(page, [target, neighbour])
  const { calls } = await serveRetweets(page, [target, neighbour])
  const retweet = retweetButtonOf(page, target)

  await evidence.step("Open the home timeline: the tweet has 3 retweets and I have not retweeted it", async () => {
    await openTimeline(page)
    await expect(retweet).toBeVisible()
    await expect(retweet).toHaveAttribute("aria-pressed", "false")
    await expect(retweet).toHaveText("3")
    expect(calls).toEqual([])
  })

  let retweetSaved: Promise<PlaywrightResponse> | undefined

  await evidence.step("Tap retweet once: the tweet is retweeted and has 4 retweets", async () => {
    // Start listening for the answer before the tap, so the next step can wait for it.
    retweetSaved = page.waitForResponse(
      (response) => response.url().includes("/retweet") && response.request().method() === "POST"
    )
    await retweet.click()
    await expect(retweet).toHaveAttribute("aria-pressed", "true")
    await expect(retweet).toHaveText("4")
    await expect.poll(() => calls).toEqual([{ method: "POST", tweetId: TWEET_ID }])
  })

  await evidence.step("It stays retweeted once the answer has come back", async () => {
    await retweetSaved
    await expect(retweet).toHaveAttribute("aria-pressed", "true")
    await expect(retweet).toHaveText("4")
  })

  await evidence.step("Tap again: my retweet is undone and the count is back to 3", async () => {
    await retweet.click()
    await expect(retweet).toHaveAttribute("aria-pressed", "false")
    await expect(retweet).toHaveText("3")
    await expect
      .poll(() => calls)
      .toEqual([
        { method: "POST", tweetId: TWEET_ID },
        { method: "DELETE", tweetId: TWEET_ID },
      ])
  })

  await evidence.step("The other tweet was not touched: still retweeted, still 9", async () => {
    const other = retweetButtonOf(page, neighbour)
    await expect(other).toHaveAttribute("aria-pressed", "true")
    await expect(other).toHaveText("9")
    expect(calls.every((call) => call.tweetId === TWEET_ID)).toBe(true)
  })
})

test("AC2: the retweet count and the button state update immediately, even on a slow connection", async ({
  page,
  evidence,
}) => {
  await serveTimeline(page, [target, neighbour])
  // A slow connection: the answer to the retweet is held back until the test lets it go.
  let release: () => void = () => undefined
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  const { calls } = await serveRetweets(page, [target, neighbour], async (_route, _call, proceed) => {
    await held
    await proceed()
  })
  const retweet = retweetButtonOf(page, target)

  try {
    await evidence.step("Open the home timeline: the tweet has 3 retweets and I have not retweeted it", async () => {
      await openTimeline(page)
      await expect(retweet).toHaveAttribute("aria-pressed", "false")
      await expect(retweet).toHaveText("3")
    })

    await evidence.step("Tap retweet on a slow connection: the button and count change before any answer", async () => {
      await retweet.click()
      // The request is on its way and has not been answered: it is held in this test.
      await expect.poll(() => calls).toEqual([{ method: "POST", tweetId: TWEET_ID }])
      await expect(retweet).toHaveAttribute("aria-pressed", "true")
      await expect(retweet).toHaveText("4")
    })

    await evidence.step("The screen still shows the new state while the answer is held back", async () => {
      await expect(retweet).toHaveAttribute("aria-pressed", "true")
      await expect(retweet).toHaveText("4")
      expect(calls).toHaveLength(1)
    })

    await evidence.step("The answer arrives: nothing jumps, the retweet is saved", async () => {
      release()
      await expect(retweet).toHaveAttribute("aria-pressed", "true")
      await expect(retweet).toHaveText("4")
      expect(calls).toHaveLength(1)
    })
  } finally {
    // Never leave the held answer pending, even when a step above failed.
    release()
  }
})

test("AC3: if saving my retweet fails, the count goes back and I see a message", async ({ page, evidence }) => {
  await serveTimeline(page, [target, neighbour])
  // Saving fails: the server answers 500, but the failing answer is held back until the test lets it go.
  let release: () => void = () => undefined
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  const { calls } = await serveRetweets(page, [target, neighbour], async (route) => {
    await held
    await route.fulfill({ status: 500, json: { error: "Internal Server Error" } })
  })
  const retweet = retweetButtonOf(page, target)

  try {
    await evidence.step("Open the home timeline: the tweet has 3 retweets and I have not retweeted it", async () => {
      await openTimeline(page)
      await expect(retweet).toHaveAttribute("aria-pressed", "false")
      await expect(retweet).toHaveText("3")
    })

    await evidence.step("Tap retweet while the server is failing: it shows as retweeted with 4 before the answer", async () => {
      await retweet.click()
      // The request has been sent and its failing answer is held in this test.
      await expect.poll(() => calls).toEqual([{ method: "POST", tweetId: TWEET_ID }])
      await expect(retweet).toHaveAttribute("aria-pressed", "true")
      await expect(retweet).toHaveText("4")
      await expect(page.getByText(FAILURE_MESSAGE, { exact: true })).not.toBeVisible()
    })

    await evidence.step("The server answers with a failure: a message says the retweet was not saved", async () => {
      release()
      await expect(page.getByText(FAILURE_MESSAGE, { exact: true })).toBeVisible()
    })

    await evidence.step("The count is back to 3 and the button is not pressed", async () => {
      await expect(retweet).toHaveAttribute("aria-pressed", "false")
      await expect(retweet).toHaveText("3")
    })

    await evidence.step("The other tweet was not touched: still retweeted, still 9", async () => {
      const other = retweetButtonOf(page, neighbour)
      await expect(other).toHaveAttribute("aria-pressed", "true")
      await expect(other).toHaveText("9")
    })
  } finally {
    // Never leave the held answer pending, even when a step above failed.
    release()
  }
})
