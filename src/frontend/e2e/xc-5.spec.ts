import { randomUUID } from "node:crypto"
import type { Page, PlaywrightWorkerArgs, Request } from "@playwright/test"

import { expect, test } from "./fixtures"

// XC-5 · Story 1.1: Sign up.
//
// Signing up is only possible signed out, so these tests start without the saved sign-in. Each
// test that creates an account uses a fresh throwaway address and a random password: nothing
// here touches the person's own account, and nothing clicks Sign out.
test.use({ storageState: { cookies: [], origins: [] } })

const SIGN_UP_API = "/api/auth/sign-up/email"
const SIGN_IN_API = "/api/auth/sign-in/email"

function newAccount() {
  const id = randomUUID()
  return { email: `xc5-e2e-${id}@example.com`, password: `Pw-${id}` }
}

async function fillSignUpForm(
  page: Page,
  values: { email: string; password: string; confirmPassword?: string }
) {
  await page.getByLabel("Email").fill(values.email)
  await page.getByLabel("Password", { exact: true }).fill(values.password)
  await page.getByLabel("Confirm password").fill(values.confirmPassword ?? values.password)
}

function submitButton(page: Page) {
  return page.getByRole("button", { name: "Sign up" })
}

/**
 * Ask the API directly, as a client with no cookies, whether an email and password sign in.
 * A fresh context each time: once a context holds a session cookie, better-auth refuses its
 * cookie-carrying requests that have no Origin header (403), which would hide the real answer.
 */
async function signInStatus(
  playwright: PlaywrightWorkerArgs["playwright"],
  baseURL: string | undefined,
  credentials: { email: string; password: string }
) {
  const api = await playwright.request.newContext({ baseURL })
  try {
    const response = await api.post(SIGN_IN_API, { data: credentials })
    return response.status()
  } finally {
    await api.dispose()
  }
}

/** Every sign-up request the page sends from now on. */
function recordSignUpRequests(page: Page) {
  const requests: Request[] = []
  page.on("request", (request) => {
    if (request.url().includes(SIGN_UP_API)) requests.push(request)
  })
  return requests
}

test("AC1: I can create an account with an email and a password", async ({
  page,
  playwright,
  baseURL,
  evidence,
}) => {
  const account = newAccount()

  await evidence.step("Open the sign-up page", async () => {
    await page.goto("/sign-up")
    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible()
  })

  await evidence.step("Enter only an email and a password", async () => {
    await fillSignUpForm(page, account)
  })

  await evidence.step("Sign up: the API creates the account", async () => {
    const response = page.waitForResponse(
      (r) => r.url().includes(SIGN_UP_API) && r.request().method() === "POST"
    )
    await submitButton(page).click()
    expect((await response).status()).toBe(200)
    await expect(page.getByRole("alert")).toHaveCount(0)
  })

  await evidence.step("The account exists: the same email and password sign in", async () => {
    expect(await signInStatus(playwright, baseURL, account)).toBe(200)
  })
})

test("AC2: after signing up I am signed in and taken into the app", async ({ page, evidence }) => {
  const account = newAccount()

  await evidence.step("Open the sign-up page", async () => {
    await page.goto("/sign-up")
  })

  await evidence.step("Enter an email and a password, then sign up", async () => {
    await fillSignUpForm(page, account)
    await submitButton(page).click()
  })

  await evidence.step("I land on the home page, signed in", async () => {
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole("button", { name: /^Sign out/ })).toBeVisible()
  })

  await evidence.step("The session is real: the account it belongs to is the new one", async () => {
    const session = await page.request.get("/api/auth/get-session")
    expect((await session.json()).user.email).toBe(account.email)
  })

  await evidence.step("Reloading keeps me in the app", async () => {
    await page.reload()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole("button", { name: /^Sign out/ })).toBeVisible()
  })
})

test("AC3: a used email or invalid details show a clear message and create no account", async ({
  page,
  playwright,
  baseURL,
  evidence,
}) => {
  const existing = newAccount()

  /** No account answers to this email and password. */
  const expectNoAccount = async (credentials: { email: string; password: string }) => {
    expect(await signInStatus(playwright, baseURL, credentials)).toBe(401)
  }

  await evidence.step("Given an account that already uses an email", async () => {
    const api = await playwright.request.newContext({ baseURL })
    const created = await api.post(SIGN_UP_API, { data: { ...existing, name: "XC-5 existing" } })
    expect(created.status()).toBe(200)
    await api.dispose()
  })

  await evidence.step("Open the sign-up page", async () => {
    await page.goto("/sign-up")
  })

  const otherPassword = `Other-${randomUUID()}`
  await evidence.step("Sign up with that email again", async () => {
    await fillSignUpForm(page, { email: existing.email, password: otherPassword })
    await submitButton(page).click()
  })

  await evidence.step("A clear message says the email is taken, and I stay signed out", async () => {
    await expect(page.getByRole("alert")).toHaveText(
      "An account with this email already exists. Try signing in instead."
    )
    await expect(page).toHaveURL(/\/sign-up$/)
    const session = await page.request.get("/api/auth/get-session")
    expect(await session.json()).toBeNull()
  })

  await evidence.step("No second account: the new password doesn't sign in, the old one does", async () => {
    await expectNoAccount({ email: existing.email, password: otherPassword })
    expect(await signInStatus(playwright, baseURL, existing)).toBe(200)
  })

  // Invalid details never reach the API: watch for sign-up requests from here on.
  const signUpRequests = recordSignUpRequests(page)
  const invalid = newAccount()

  await evidence.step("An email that isn't an email is refused with a message", async () => {
    await page.reload()
    await fillSignUpForm(page, { email: "not-an-email", password: invalid.password })
    await submitButton(page).click()
    await expect(page.getByText("Enter a valid email")).toBeVisible()
    await expect(page).toHaveURL(/\/sign-up$/)
  })

  await evidence.step("A password that is too short is refused with a message", async () => {
    await page.reload()
    await fillSignUpForm(page, { email: invalid.email, password: "short" })
    await submitButton(page).click()
    await expect(page.getByText("Password must be at least 8 characters")).toBeVisible()
    await expect(page).toHaveURL(/\/sign-up$/)
  })

  await evidence.step("Passwords that don't match are refused with a message", async () => {
    await page.reload()
    await fillSignUpForm(page, {
      email: invalid.email,
      password: invalid.password,
      confirmPassword: `${invalid.password}-typo`,
    })
    await submitButton(page).click()
    await expect(page.getByText("Passwords do not match")).toBeVisible()
    await expect(page).toHaveURL(/\/sign-up$/)
  })

  await evidence.step("Empty details are refused with a message", async () => {
    await page.reload()
    await submitButton(page).click()
    await expect(page.getByText("Email is required")).toBeVisible()
    await expect(page).toHaveURL(/\/sign-up$/)
  })

  await evidence.step("None of the invalid attempts created an account", async () => {
    expect(signUpRequests).toHaveLength(0)
    await expectNoAccount(invalid)
    await expectNoAccount({ email: invalid.email, password: "short" })
  })
})
