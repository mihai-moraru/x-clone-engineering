/** The API's own limit on a tweet's text, counted after trimming. */
export const MAX_TWEET_LENGTH = 280

/** The image types the API accepts (it checks the file's content, not just its type). */
export const ALLOWED_IMAGE_TYPES: readonly string[] = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]

/** The API's limit for one uploaded image: 5 MB. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

/**
 * A clear message when the tweet's text is over the limit, otherwise `null`.
 *
 * The API trims the text before it counts, so this does too. Whether an empty text is allowed
 * depends on whether there is an image, so it is not decided here.
 */
export function validateTweetText(text: string): string | null {
  const over = text.trim().length - MAX_TWEET_LENGTH
  if (over <= 0) return null

  return `Your tweet is ${over.toString()} characters over the ${MAX_TWEET_LENGTH.toString()} limit.`
}

/** A clear message when the file is not an allowed image, otherwise `null`. */
export function validateImage(file: { type: string; size: number }): string | null {
  if (ALLOWED_IMAGE_TYPES.includes(file.type) && file.size <= MAX_IMAGE_BYTES) return null

  return "Images must be JPEG, PNG, GIF or WebP, and under 5 MB."
}
