import { randomUUID } from "node:crypto"
import type { APIRequestContext, BrowserContext, PlaywrightWorkerArgs } from "@playwright/test"

import { expect, test } from "./fixtures"

// XC-8 · Story 2.1: Scroll the home timeline.
//
// The API's timeline holds the viewer's own tweets and those of the accounts they follow, so each
// test builds its own small world from throwaway accounts: a viewer, and authors the viewer
// follows. The page is then signed in as that viewer. Nothing here uses the person's saved
// sign-in (no follows or tweets land on their account) and nothing clicks Sign out.
test.use({ storageState: { cookies: [], origins: [] } })

const PAGE_SIZE = 20

type Tweet = {
  id: string
  author: { name: string; handle: string }
  content: string
  mediaUrls: string[]
  createdAt: string
}

type Account = { api: APIRequestContext; id: string; name: string }

/** Sign up a throwaway account and keep an API client that is signed in as it. */
async function createAccount(
  playwright: PlaywrightWorkerArgs["playwright"],
  baseURL: string | undefined,
  label: string
): Promise<Account> {
  const id = randomUUID()
  const name = `XC8 ${label} ${id.slice(0, 8)}`
  // The Origin header is what a browser would send; the API refuses cookie requests without it.
  const api = await playwright.request.newContext({
    baseURL,
    extraHTTPHeaders: baseURL ? { Origin: baseURL } : undefined,
  })
  const response = await api.post("/api/auth/sign-up/email", {
    data: { email: `xc8-e2e-${id}@example.com`, password: `Pw-${id}`, name },
  })
  expect(response.status(), `sign up ${label}`).toBe(200)
  return { api, id: (await response.json()).user.id, name }
}

async function postTweet(author: Account, data: { content: string; mediaKeys?: string[] }) {
  const response = await author.api.post("/api/tweets", { data })
  expect(response.status(), `post "${data.content}"`).toBe(201)
  return (await response.json()) as Tweet
}

async function follow(viewer: Account, author: Account) {
  const response = await viewer.api.post(`/api/follows/${author.id}`)
  expect(response.status(), `follow ${author.name}`).toBe(200)
}

/** Sign the browser in as this account, by handing it the account's session cookie. */
async function signInBrowserAs(context: BrowserContext, account: Account) {
  await context.addCookies((await account.api.storageState()).cookies)
}

async function dispose(...accounts: Account[]) {
  await Promise.all(accounts.map((account) => account.api.dispose()))
}

test("AC1: the home timeline shows tweets from all users, newest first", async ({
  page,
  context,
  playwright,
  baseURL,
  evidence,
}) => {
  const viewer = await createAccount(playwright, baseURL, "viewer")
  const ada = await createAccount(playwright, baseURL, "Ada")
  const grace = await createAccount(playwright, baseURL, "Grace")
  const alan = await createAccount(playwright, baseURL, "Alan")
  const run = randomUUID().slice(0, 8)

  // Posted in this order, by four different people, so newest first is the reverse.
  const posted: Tweet[] = []
  for (const [author, text] of [
    [ada, "first"],
    [grace, "second"],
    [alan, "third"],
    [viewer, "fourth"],
    [ada, "fifth"],
  ] as const) {
    posted.push(await postTweet(author, { content: `${run} ${text} tweet` }))
  }
  for (const author of [ada, grace, alan]) await follow(viewer, author)
  await signInBrowserAs(context, viewer)

  await evidence.step("Open the home timeline", async () => {
    await page.goto("/")
    await expect(page.getByRole("article").first()).toBeVisible()
  })

  await evidence.step("Tweets from every user are there: Ada, Grace, Alan and me", async () => {
    for (const author of [ada, grace, alan, viewer]) {
      await expect(page.getByRole("article").filter({ hasText: author.name }).first()).toBeVisible()
    }
    await expect(page.getByRole("article")).toHaveCount(posted.length)
  })

  await evidence.step("They are in order, newest first", async () => {
    const newestFirst = [...posted].reverse()
    await expect(page.getByRole("article").locator("p")).toHaveText(
      newestFirst.map((tweet) => tweet.content)
    )
    const shownTimes = await page
      .getByRole("article")
      .locator("time")
      .evaluateAll((times) => times.map((time) => time.getAttribute("datetime")))
    expect(shownTimes).toEqual(newestFirst.map((tweet) => tweet.createdAt))
    expect([...shownTimes].sort().reverse()).toEqual(shownTimes)
  })

  await dispose(viewer, ada, grace, alan)
})

test("AC2: more tweets load automatically as I scroll, with no next page button", async ({
  page,
  context,
  playwright,
  baseURL,
  evidence,
}) => {
  const viewer = await createAccount(playwright, baseURL, "viewer")
  const author = await createAccount(playwright, baseURL, "Author")
  const run = randomUUID().slice(0, 8)
  const total = PAGE_SIZE * 2 + 5

  // More than two pages of tweets, numbered oldest (1) to newest (45).
  for (let n = 1; n <= total; n++) await postTweet(author, { content: `${run} tweet number ${n}.` })
  await follow(viewer, author)
  await signInBrowserAs(context, viewer)

  const laterPages: string[] = []
  page.on("request", (request) => {
    const url = new URL(request.url())
    if (url.pathname === "/api/timeline" && url.searchParams.has("cursor")) laterPages.push(request.url())
  })

  const tweets = page.getByRole("article")
  const tweetNumber = (n: number) => page.getByText(`${run} tweet number ${n}.`, { exact: true })

  await evidence.step("Open the home timeline: only the newest tweets are loaded", async () => {
    await page.goto("/")
    await expect(tweetNumber(total)).toBeVisible()
    await expect(tweets).toHaveCount(PAGE_SIZE)
    await expect(tweetNumber(1)).toHaveCount(0)
    expect(laterPages).toHaveLength(0)
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
    expect(laterPages).toHaveLength(1)
  })

  await evidence.step("Scroll down again: the rest load, down to the oldest tweet", async () => {
    await tweets.nth(PAGE_SIZE * 2 - 1).scrollIntoViewIfNeeded()
    await expect(tweets).toHaveCount(total)
    await tweetNumber(1).scrollIntoViewIfNeeded()
    await expect(tweetNumber(1)).toBeVisible()
    expect(laterPages).toHaveLength(2)
  })

  await evidence.step("Still no button, and nothing was loaded twice", async () => {
    await expect(page.getByRole("button", { name: /next|more|load|older/i })).toHaveCount(0)
    const texts = await tweets.locator("p").allTextContents()
    expect(new Set(texts).size).toBe(total)
  })

  await dispose(viewer, author)
})

test("AC3: each tweet shows the author's name and handle, when it was posted, the text, and the image", async ({
  page,
  context,
  browser,
  playwright,
  baseURL,
  evidence,
}) => {
  const viewer = await createAccount(playwright, baseURL, "viewer")
  const author = await createAccount(playwright, baseURL, "Author")
  const run = randomUUID().slice(0, 8)

  // A real picture to attach: a screenshot of a coloured card, drawn in a separate, unrecorded
  // browser context so that the test's only video is the one of the timeline.
  const studio = await browser.newContext({ viewport: { width: 480, height: 270 } })
  const spare = await studio.newPage()
  await spare.setContent(
    `<body style="margin:0;display:grid;place-items:center;height:100vh;background:#1d9bf0;color:#fff;` +
      `font:700 40px system-ui">XC-8 picture</body>`
  )
  const picture = await spare.screenshot({ type: "png" })
  await studio.close()

  const upload = await author.api.post("/api/upload", {
    multipart: { files: { name: "picture.png", mimeType: "image/png", buffer: picture } },
  })
  expect(upload.status(), "upload the picture").toBe(201)
  const { keys } = (await upload.json()) as { keys: string[] }

  const plain = await postTweet(author, { content: `${run} a tweet with only text` })
  const withImage = await postTweet(author, { content: `${run} a tweet with a picture`, mediaKeys: keys })
  expect(withImage.mediaUrls).toHaveLength(1)
  await follow(viewer, author)
  await signInBrowserAs(context, viewer)

  const handle = `@${withImage.author.handle.replace(/^@/, "")}`
  const imageTweet = page.getByRole("article").filter({ hasText: withImage.content })
  const plainTweet = page.getByRole("article").filter({ hasText: plain.content })

  await evidence.step("Open the home timeline", async () => {
    await page.goto("/")
    await expect(imageTweet).toBeVisible()
    await expect(plainTweet).toBeVisible()
  })

  await evidence.step("The tweet shows its author's name and handle", async () => {
    await expect(imageTweet.getByText(author.name, { exact: true })).toBeVisible()
    await expect(imageTweet.getByText(handle, { exact: true })).toBeVisible()
  })

  await evidence.step("It shows when it was posted", async () => {
    const time = imageTweet.locator("time")
    await expect(time).toBeVisible()
    await expect(time).toHaveAttribute("datetime", withImage.createdAt)
    // Posted moments ago, so the visible text is a relative time such as "5s" or "1m".
    await expect(time).toHaveText(/^\d+[sm]$/)
  })

  await evidence.step("It shows the text", async () => {
    await expect(imageTweet.getByText(withImage.content, { exact: true })).toBeVisible()
  })

  await evidence.step("It shows the image, and the image really loads", async () => {
    const image = imageTweet.getByRole("img")
    await expect(image).toBeVisible()
    await expect(image).toHaveAttribute("src", withImage.mediaUrls[0])
    await expect
      .poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
      .toBe(true)
  })

  await evidence.step("A tweet without an image shows the same details and no image", async () => {
    await expect(plainTweet.getByText(author.name, { exact: true })).toBeVisible()
    await expect(plainTweet.getByText(handle, { exact: true })).toBeVisible()
    await expect(plainTweet.locator("time")).toHaveAttribute("datetime", plain.createdAt)
    await expect(plainTweet.getByText(plain.content, { exact: true })).toBeVisible()
    await expect(plainTweet.getByRole("img")).toHaveCount(0)
  })

  await dispose(viewer, author)
})

test("AC4: with no tweets yet I see a simple empty message", async ({
  page,
  context,
  playwright,
  baseURL,
  evidence,
}) => {
  // A brand-new account: it has posted nothing and follows nobody, so its timeline is empty.
  const viewer = await createAccount(playwright, baseURL, "viewer")
  const timeline = await viewer.api.get("/api/timeline")
  expect((await timeline.json()).items).toEqual([])
  await signInBrowserAs(context, viewer)

  await evidence.step("Open the home timeline as someone with no tweets to see", async () => {
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
  })

  await dispose(viewer)
})
