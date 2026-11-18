import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_TWEET_LENGTH,
  validateImage,
  validateTweetText,
} from "@/lib/compose"

const IMAGE_MESSAGE = "Images must be JPEG, PNG, GIF or WebP, and under 5 MB."

describe("the limits", () => {
  it("are the API's own", () => {
    expect(MAX_TWEET_LENGTH).toBe(280)
    expect(MAX_IMAGE_BYTES).toBe(5 * 1024 * 1024)
    expect([...ALLOWED_IMAGE_TYPES]).toEqual(["image/jpeg", "image/png", "image/gif", "image/webp"])
  })
})

describe("validateTweetText", () => {
  it("accepts any text up to the limit, including none", () => {
    expect(validateTweetText("")).toBeNull()
    expect(validateTweetText("hello")).toBeNull()
    expect(validateTweetText("a".repeat(MAX_TWEET_LENGTH))).toBeNull()
  })

  it("says by how many characters the text is over the limit", () => {
    expect(validateTweetText("a".repeat(MAX_TWEET_LENGTH + 1))).toBe(
      "Your tweet is 1 characters over the 280 limit."
    )
    expect(validateTweetText("a".repeat(MAX_TWEET_LENGTH + 37))).toBe(
      "Your tweet is 37 characters over the 280 limit."
    )
  })

  it("counts the trimmed text, as the API does", () => {
    const text = "a".repeat(MAX_TWEET_LENGTH)
    expect(validateTweetText(`   ${text}\n\n  `)).toBeNull()
    expect(validateTweetText(`  ${text}b  `)).toBe("Your tweet is 1 characters over the 280 limit.")
  })

  it("agrees with a plain length check for every length around the limit", () => {
    for (let length = 0; length <= MAX_TWEET_LENGTH + 20; length++) {
      const message = validateTweetText("x".repeat(length))
      if (length <= MAX_TWEET_LENGTH) expect(message).toBeNull()
      else expect(message).toContain(`${(length - MAX_TWEET_LENGTH).toString()} characters over`)
    }
  })
})

describe("validateImage", () => {
  it("accepts JPEG, PNG, GIF and WebP up to 5 MB", () => {
    for (const type of ["image/jpeg", "image/png", "image/gif", "image/webp"]) {
      expect(validateImage({ type, size: 1 })).toBeNull()
      expect(validateImage({ type, size: MAX_IMAGE_BYTES })).toBeNull()
    }
  })

  it("refuses a file that is not one of those types", () => {
    for (const type of ["image/svg+xml", "image/bmp", "application/pdf", "text/plain", "video/mp4", ""]) {
      expect(validateImage({ type, size: 1000 })).toBe(IMAGE_MESSAGE)
    }
  })

  it("refuses a file over 5 MB", () => {
    expect(validateImage({ type: "image/png", size: MAX_IMAGE_BYTES + 1 })).toBe(IMAGE_MESSAGE)
  })
})
