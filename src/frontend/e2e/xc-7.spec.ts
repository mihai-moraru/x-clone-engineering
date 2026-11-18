import type { Page, Request } from "@playwright/test"

import { expect, test } from "./fixtures"

// XC-7 · Story 1.3: Keep the app behind sign-in.
//
// Every test here is signed out, so it starts without the saved sign-in. Nothing signs in, signs
// up or writes to the shared API, and nothing clicks Sign out.
test.use({ storageState: { cookies: [], origins: [] } })

/** Every request the page sends to the API (the app's own data, not the sign-in session check). */
function recordDataRequests(page: Page) {
  const requests: Request[] = []
  page.on("request", (request) => {
    const { pathname } = new URL(request.url())
    if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth/")) requests.push(request)
  })
  return requests
}

/** What a signed-in person sees in the app: the Sign out button, the Home heading, tweets. */
async function expectNoAppContent(page: Page) {
  await expect(page.getByRole("button", { name: /^Sign out/ })).toHaveCount(0)
  await expect(page.getByRole("heading", { name: "Home", exact: true })).toHaveCount(0)
  await expect(page.getByRole("article")).toHaveCount(0)
  await expect(page.getByText("No tweets yet.")).toHaveCount(0)
}

async function expectSessionIsNull(page: Page) {
  const session = await page.request.get("/api/auth/get-session")
  expect(await session.json()).toBeNull()
}

test("AC1: when I am not signed in, I can only see the sign-in and sign-up screens", async ({
  page,
  evidence,
}) => {
  const dataRequests = recordDataRequests(page)

  await evidence.step("I am signed out", async () => {
    await page.goto("/sign-in")
    await expectSessionIsNull(page)
  })

  await evidence.step("The sign-in screen is shown, with a way to the sign-up screen", async () => {
    await expect(page).toHaveURL(/\/sign-in$/)
    await expect(page.getByRole("heading", { name: "Sign in to X Clone" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible()
    await expectNoAppContent(page)
  })

  await evidence.step("From there I can reach the sign-up screen", async () => {
    await page.getByRole("link", { name: "Sign up" }).click()
    await expect(page).toHaveURL(/\/sign-up$/)
    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible()
    await expectNoAppContent(page)
  })

  await evidence.step("The sign-up screen leads back to the sign-in screen", async () => {
    await page.getByRole("link", { name: "Sign in" }).click()
    await expect(page).toHaveURL(/\/sign-in$/)
    await expect(page.getByRole("heading", { name: "Sign in to X Clone" })).toBeVisible()
  })

  await evidence.step("Opening either screen directly works too, and still shows only that screen", async () => {
    await page.goto("/sign-up")
    await expect(page).toHaveURL(/\/sign-up$/)
    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible()
    await page.goto("/sign-in")
    await expect(page).toHaveURL(/\/sign-in$/)
    await expect(page.getByRole("heading", { name: "Sign in to X Clone" })).toBeVisible()
  })

  await evidence.step("Nothing private was asked for: no timeline or other data request, and I am still signed out", async () => {
    expect(dataRequests.map((request) => request.url())).toEqual([])
    await expectSessionIsNull(page)
  })
})

test("AC2: if I open any other page while signed out, I am sent to the sign-in screen", async ({
  page,
  evidence,
}) => {
  const dataRequests = recordDataRequests(page)

  // The home page, the home page with a query, and addresses deeper in the app. Whatever the
  // address, a signed-out visitor must land on the sign-in screen and see nothing else.
  const addresses = ["/", "/?tab=latest", "/profile/someone", "/tweets/123", "/settings"]

  for (const address of addresses) {
    await evidence.step(`Open ${address} while signed out: I am sent to the sign-in screen`, async () => {
      await page.goto(address)
      await expect(page).toHaveURL(/\/sign-in$/)
      await expect(page.getByRole("heading", { name: "Sign in to X Clone" })).toBeVisible()
      await expectNoAppContent(page)
    })
  }

  await evidence.step("Going back to the home page from inside the app does the same", async () => {
    await page.goto("/sign-up")
    await page.evaluate(() => window.history.pushState({}, "", "/"))
    await page.reload()
    await expect(page).toHaveURL(/\/sign-in$/)
    await expect(page.getByRole("heading", { name: "Sign in to X Clone" })).toBeVisible()
  })

  await evidence.step("Nothing private was asked for: no timeline or other data request, and I am still signed out", async () => {
    expect(dataRequests.map((request) => request.url())).toEqual([])
    await expectSessionIsNull(page)
  })
})

// Not a criterion: the fix for AC2 changed what an unknown address shows, so check the other
// side of it. A signed-in person (the saved sign-in, never signed out here) who opens an address
// that matches no page still gets "Not Found", and is not sent to the sign-in screen.
test.describe("signed in", () => {
  test.use({ storageState: "e2e/.auth/user.json" })

  test("regression: a signed-in person who opens an unknown address still sees Not Found", async ({
    page,
    evidence,
  }) => {
    await evidence.step("Open an address no page matches, signed in", async () => {
      await page.goto("/profile/someone")
    })

    await evidence.step("I see Not Found and stay where I am, not on the sign-in screen", async () => {
      await expect(page.getByText("Not Found", { exact: true })).toBeVisible()
      await expect(page).toHaveURL(/\/profile\/someone$/)
      await expect(page.getByRole("heading", { name: "Sign in to X Clone" })).toHaveCount(0)
    })
  })
})
