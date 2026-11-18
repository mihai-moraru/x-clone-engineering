import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon, ImageAdd01Icon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { MAX_TWEET_LENGTH, ALLOWED_IMAGE_TYPES, validateImage, validateTweetText } from "@/lib/compose"
import { cn } from "@/lib/utils"
import {
  addTweetToTimeline,
  composeErrorMessage,
  createTweet,
  uploadImage,
} from "@/queries/compose"

type Attachment = { file: File; previewUrl: string }

/** Write a tweet with optional text and at most one image, and post it to the top of the timeline. */
export function TweetComposer() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  // The image's preview address is revoked when the image goes away, and on leaving the page.
  const [attachment, setAttachment] = useState<Attachment | null>(null)
  const previewUrlRef = useRef<string | null>(null)
  // The key of an image that is already uploaded, so a retry after a failed post doesn't upload it twice.
  const uploadedRef = useRef<{ file: File; key: string } | null>(null)
  const [text, setText] = useState("")
  const [imageError, setImageError] = useState<string | null>(null)

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    },
    []
  )

  const post = useMutation({
    mutationFn: async ({ content, file }: { content: string; file: File | null }) => {
      let key: string | undefined
      if (file) {
        if (uploadedRef.current?.file !== file) {
          uploadedRef.current = { file, key: await uploadImage(file) }
        }
        key = uploadedRef.current.key
      }

      return createTweet({
        ...(content ? { content } : {}),
        ...(key ? { mediaKeys: [key] } : {}),
      })
    },
    onSuccess: async (tweet) => {
      await addTweetToTimeline(queryClient, tweet)
      setText("")
      replaceAttachment(null)
    },
  })

  const posting = post.isPending
  const trimmed = text.trim()
  const textError = validateTweetText(text)
  const canPost = !posting && !textError && (trimmed.length > 0 || attachment !== null)
  const charactersLeft = MAX_TWEET_LENGTH - trimmed.length

  function replaceAttachment(file: File | null) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = file ? URL.createObjectURL(file) : null
    uploadedRef.current = null
    setAttachment(file && previewUrlRef.current ? { file, previewUrl: previewUrlRef.current } : null)
  }

  function handleTextChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setText(event.target.value)
    if (post.isError) post.reset()
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Clearing the input lets the same file be picked again after it was removed.
    event.target.value = ""
    if (!file) return

    const message = validateImage(file)
    setImageError(message)
    if (message) return

    if (post.isError) post.reset()
    replaceAttachment(file)
  }

  function handleRemoveImage() {
    setImageError(null)
    if (post.isError) post.reset()
    replaceAttachment(null)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // A form can be submitted without the button (the keyboard, a script), so check again here.
    if (!canPost) return

    setImageError(null)
    post.mutate({ content: trimmed, file: attachment?.file ?? null })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3 border-b border-border px-4 py-3">
      <Textarea
        aria-label="Tweet text"
        aria-invalid={textError ? true : undefined}
        placeholder="What's happening?"
        value={text}
        readOnly={posting}
        onChange={handleTextChange}
      />

      {attachment ? (
        <div className="relative">
          <img
            src={attachment.previewUrl}
            alt="Image to post"
            className="max-h-[320px] w-full rounded-lg border border-border object-cover"
          />
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            aria-label="Remove image"
            disabled={posting}
            onClick={handleRemoveImage}
            className="absolute top-2 right-2 rounded-full"
          >
            <HugeiconsIcon icon={Cancel01Icon} />
          </Button>
        </div>
      ) : null}

      {textError ? (
        <p role="alert" className="text-sm text-destructive">
          {textError}
        </p>
      ) : null}
      {imageError ? (
        <p role="alert" className="text-sm text-destructive">
          {imageError}
        </p>
      ) : null}
      {post.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {composeErrorMessage(post.error)}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        {/* The file input is hidden but stays in the tab order; the ring shows where focus is. */}
        <span className="rounded-md has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-ring/50">
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(",")}
            aria-label="Image file"
            className="sr-only"
            disabled={posting}
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="ghost"
            disabled={posting}
            onClick={() => fileInputRef.current?.click()}
          >
            <HugeiconsIcon icon={ImageAdd01Icon} />
            Add image
          </Button>
        </span>

        <div className="flex items-center gap-3">
          <span
            className={cn(
              "text-xs tabular-nums text-muted-foreground",
              charactersLeft < 0 && "text-destructive"
            )}
          >
            {charactersLeft}
            <span className="sr-only"> characters left</span>
          </span>
          <Button type="submit" disabled={!canPost}>
            {posting ? "Posting..." : "Post"}
          </Button>
        </div>
      </div>
    </form>
  )
}
