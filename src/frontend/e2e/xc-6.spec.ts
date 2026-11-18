import { randomUUID } from "node:crypto"
import type { Page, PlaywrightWorkerArgs } from "@playwright/test"

import { expect, test } from "./fixtures"

// XC-6 · Story 1.2: Sign in.
//
// Signing in is only possible signed out, so these tests start without the saved sign-in, and
// they cannot use it: what they prove is the sign-in itself. They sign in as a throwaway account
// that the spec creates through the API (one per run, shared by the three tests), with a random
// password. Nothing here touches the person's own account, and nothing clicks Sign out.
test.use({ storageState: { cookies: [], origins: [] } })

const SIGN_UP_API = "/api/auth/sign-up/email"
const SIGN_IN_API = "/api/auth/sign-in/email"

type Credentials = { email: string; password: string }

let account: Promise<Credentials> | undefined

/** The throwaway account every test signs in as, created the first time a test asks for it. */
function ensureAccount(
  playwright: PlaywrightWorkerArgs["playwright"],
  baseURL: string | undefined
) {
  account ??= (async () => {
    const id = randomUUID()
    const credentials = { email: `xc6-e2e-${id}@example.com`, password: `Pw-${id}` }
    const api = await playwright.request.newContext({ baseURL })
    try {
      const created = await api.post(SIGN_UP_API, {
        data: { ...credentials, name: "XC-6 e2e" },
      })
      expect(created.status()).toBe(200)
    } finally {
      await api.dispose()
    }
    return credentials
  })()
  return account
}

async function fillSignInForm(page: Page, values: Credentials) {
  await page.getByLabel("Email").fill(values.email)
  await page.getByLabel("Password").fill(values.password)
}

function submitButton(page: Page) {
  return page.getByRole("button", { name: "Sign in", exact: true })
}

/**
 * Ask the API directly, as a client with no cookies, whether an email and password sign in.
 * A fresh context each time: once a context holds a session cookie, better-auth refuses its
 * cookie-carrying requests that have no Origin header (403), which would hide the real answer.
 */
async function signInStatus(
  playwright: PlaywrightWorkerArgs["playwright"],
  baseURL: string | undefined,
  credentials: Credentials
) {
  const api = await playwright.request.newContext({ baseURL })
  try {
    const response = await api.post(SIGN_IN_API, { data: credentials })
    return response.status()
  } finally {
    await api.dispose()
  }
}

test("AC1: I can sign in by entering my email and password", async ({
  page,
  playwright,
  baseURL,
  evidence,
}) => {
  const credentials = await evidence.step("Given an account that exists", () =>
    ensureAccount(playwright, baseURL)
  )

  await evidence.step("Open the sign-in page, signed out", async () => {
    await page.goto("/sign-in")
    await expect(page.getByRole("heading", { name: "Sign in to X Clone" })).toBeVisible()
    const session = await page.request.get("/api/auth/get-session")
    expect(await session.json()).toBeNull()
  })

  await evidence.step("Enter only my email and my password", async () => {
    await fillSignInForm(page, credentials)
  })

  await evidence.step("Sign in: the API accepts them", async () => {
    const response = page.waitForResponse(
      (r) => r.url().includes(SIGN_IN_API) && r.request().method() === "POST"
    )
    await submitButton(page).click()
    expect((await response).status()).toBe(200)
    await expect(page.getByRole("alert")).toHaveCount(0)
  })

  await evidence.step("I am signed in as that account", async () => {
    await expect(page.getByRole("button", { name: /^Sign out/ })).toBeVisible()
    const session = await page.request.get("/api/auth/get-session")
    expect((await session.json()).user.email).toBe(credentials.email)
  })
})

test("AC2: after signing in I am taken to the home timeline", async ({
  page,
  playwright,
  baseURL,
  evidence,
}) => {
  const credentials = await evidence.step("Given an account that exists", () =>
    ensureAccount(playwright, baseURL)
  )

  await evidence.step("Open the sign-in page", async () => {
    await page.goto("/sign-in")
    await expect(page).toHaveURL(/\/sign-in$/)
  })

  const timeline = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/timeline" && r.request().method() === "GET"
  )

  await evidence.step("Enter my email and my password, then sign in", async () => {
    await fillSignInForm(page, credentials)
    await submitButton(page).click()
  })

  await evidence.step("I land on the home page, not on the sign-in page", async () => {
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole("heading", { name: "Sign in to X Clone" })).toHaveCount(0)
  })

  await evidence.step("It is the home timeline: it asks the API for the timeline and shows it", async () => {
    expect((await timeline).status()).toBe(200)
    await expect(page.getByRole("heading", { name: "Home" })).toBeVisible()
    // A timeline with tweets, or its empty message: a new account follows nobody.
    await expect(page.getByRole("article").or(page.getByText("No tweets yet."))).not.toHaveCount(0)
    await expect(page.getByRole("alert")).toHaveCount(0)
  })

  await evidence.step("Reloading keeps me on the home timeline", async () => {
    await page.reload()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole("heading", { name: "Home" })).toBeVisible()
  })
})

test("AC3: a wrong email or password shows a clear message and I stay signed out", async ({
  page,
  playwright,
  baseURL,
  evidence,
}) => {
  const credentials = await evidence.step("Given an account that exists", () =>
    ensureAccount(playwright, baseURL)
  )
  const message = "Incorrect email or password."

  /** Submit the form and check the refusal: the API says 401, a clear message shows, nothing else changes. */
  const expectRefused = async (attempt: Credentials) => {
    await page.goto("/sign-in")
    await fillSignInForm(page, attempt)
    const response = page.waitForResponse(
      (r) => r.url().includes(SIGN_IN_API) && r.request().method() === "POST"
    )
    await submitButton(page).click()
    expect((await response).status()).toBe(401)
    await expect(page.getByRole("alert")).toHaveText(message)
    await expect(page).toHaveURL(/\/sign-in$/)
    await expect(page.getByRole("button", { name: /^Sign out/ })).toHaveCount(0)
    const session = await page.request.get("/api/auth/get-session")
    expect(await session.json()).toBeNull()
  }

  await evidence.step("Right email, wrong password: a clear message, still signed out", async () => {
    await expectRefused({ email: credentials.email, password: `Wrong-${randomUUID()}` })
  })

  await evidence.step("Wrong email, any password: the same clear message, still signed out", async () => {
    await expectRefused({ email: `xc6-e2e-nobody-${randomUUID()}@example.com`, password: credentials.password })
  })

  await evidence.step("The form is still there to try again", async () => {
    await expect(page.getByLabel("Email")).toBeVisible()
    await expect(submitButton(page)).toBeEnabled()
  })

  await evidence.step("The refusal was about the details: the right ones still sign in", async () => {
    expect(await signInStatus(playwright, baseURL, credentials)).toBe(200)
  })
})
