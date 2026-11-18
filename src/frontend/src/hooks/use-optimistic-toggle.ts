import { useRef } from "react"
import {
  useMutation,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query"
import { toast } from "sonner"

import {
  timelineQueryOptions,
  type TimelinePage,
  type Tweet,
} from "@/queries/tweets"

/** The `Tweet` fields that hold a true/false flag ("likedByMe") and a count ("likeCount"). */
type FlagField = {
  [K in keyof Tweet]: Tweet[K] extends boolean ? K : never
}[keyof Tweet]
type CountField = {
  [K in keyof Tweet]: Tweet[K] extends number ? K : never
}[keyof Tweet]

type Values = { active: boolean; count: number }

export type OptimisticToggleOptions<F extends FlagField, C extends CountField> = {
  tweetId: string
  /** Whether the toggle is on right now, as the screen shows it. */
  active: boolean
  /** The tweet's flag field, e.g. "likedByMe". */
  flagField: F
  /** The tweet's count field, e.g. "likeCount". */
  countField: C
  /** Turns it on (POST). Answers with the new count under `countField`. */
  activate: (tweetId: string) => Promise<Record<C, number>>
  /** Turns it off (DELETE). Answers with the new count under `countField`. */
  deactivate: (tweetId: string) => Promise<Record<C, number>>
  /** The toast shown when saving fails. */
  errorMessage: string
}

const timelineKey = timelineQueryOptions.queryKey

function findTweet(data: InfiniteData<TimelinePage> | undefined, tweetId: string) {
  for (const page of data?.pages ?? []) {
    const tweet = page.items.find((item) => item.id === tweetId)
    if (tweet) return tweet
  }
  return undefined
}

/** Change one tweet wherever it sits in the timeline's pages; every other tweet is left as is. */
function updateTweet(queryClient: QueryClient, tweetId: string, change: (tweet: Tweet) => Tweet) {
  queryClient.setQueryData<InfiniteData<TimelinePage>>(timelineKey, (data) =>
    data
      ? {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.map((tweet) => (tweet.id === tweetId ? change(tweet) : tweet)),
          })),
        }
      : data
  )
}

/**
 * A one-tap toggle on a tweet (like, retweet) that updates the timeline cache at once, saves in
 * the background and puts things back, with a toast, if saving fails.
 *
 * - On tap, before any answer: the flag flips and the count moves by one, for that tweet, on
 *   every page of the cached timeline. The timeline is never refetched (it would reset the
 *   infinite list); the count in the answer replaces the guess instead.
 * - Requests for one tweet and flag run one after the other, in tap order, never overlapping, so
 *   the server ends where the button ends. They are idempotent, so a repeated one is harmless.
 * - A failed save puts back the last state the server confirmed, and only once no later tap is
 *   still waiting: a tap that is still queued will decide the final state itself.
 *
 * Nothing here knows about likes: the fields, endpoints and message come in as options.
 */
export function useOptimisticToggle<F extends FlagField, C extends CountField>({
  tweetId,
  active,
  flagField,
  countField,
  activate,
  deactivate,
  errorMessage,
}: OptimisticToggleOptions<F, C>) {
  const queryClient = useQueryClient()
  const key = ["optimistic-toggle", flagField, tweetId] as const
  // The last values the server confirmed (or what the screen showed before the first tap of a
  // run of taps). Where a failed save goes back to; cleared when the last request has settled.
  const confirmed = useRef<Values | null>(null)
  // The state the latest tap asked for. The cache (and so `active`) lags a render behind a tap,
  // so two taps in quick succession would both read the old state and send the same request.
  const wanted = useRef<boolean | null>(null)

  const readValues = (): Values | undefined => {
    const tweet = findTweet(queryClient.getQueryData<InfiniteData<TimelinePage>>(timelineKey), tweetId)
    return tweet ? { active: tweet[flagField], count: tweet[countField] } : undefined
  }

  const writeValues = (values: Partial<Values>) => {
    updateTweet(queryClient, tweetId, (tweet) => ({
      ...tweet,
      ...(values.active === undefined ? null : { [flagField]: values.active }),
      ...(values.count === undefined ? null : { [countField]: values.count }),
    }))
  }

  /** Taps of this toggle that are running or waiting their turn, this one included. */
  const unsettled = () => queryClient.isMutating({ mutationKey: key })

  const mutation = useMutation<
    Record<C, number>,
    Error,
    { next: boolean },
    { previous: Values | undefined }
  >({
    mutationKey: key,
    // Same scope id: TanStack Query runs these one at a time, in the order they were made.
    scope: { id: key.join(":") },
    // A tap while offline must fail (and roll back) rather than wait for the network to return.
    networkMode: "always",
    mutationFn: ({ next }) => (next ? activate(tweetId) : deactivate(tweetId)),
    onMutate: async ({ next }) => {
      const previous = readValues()
      confirmed.current ??= previous ?? null

      await queryClient.cancelQueries({ queryKey: timelineKey })

      // Idempotent: a tweet that already shows the wanted state keeps its count.
      const current = readValues()
      if (current) {
        writeValues({
          active: next,
          count: current.active === next ? current.count : current.count + (next ? 1 : -1),
        })
      }
      return { previous }
    },
    onSuccess: (data, { next }) => {
      const count = data[countField]
      const known = typeof count === "number" && Number.isFinite(count)
      const base = confirmed.current
      if (base) confirmed.current = { active: next, count: known ? count : base.count }
      // Later taps still waiting will have their own say; until then keep what is on screen.
      if (unsettled() === 1 && known) writeValues({ active: next, count })
    },
    onError: (_error, _variables, context) => {
      toast.error(errorMessage)
      if (unsettled() > 1) return
      const back = confirmed.current ?? context?.previous
      if (back) writeValues(back)
    },
    onSettled: () => {
      if (unsettled() === 1) {
        confirmed.current = null
        wanted.current = null
      }
    },
  })

  return {
    /** Tap: turn the toggle on if it is off, off if it is on. */
    toggle: () => {
      const next = !(wanted.current ?? active)
      wanted.current = next
      mutation.mutate({ next })
    },
    /** True while a save is running or waiting. The button stays tappable regardless. */
    isPending: mutation.isPending,
  }
}
