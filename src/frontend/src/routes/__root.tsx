import { createPortal } from "react-dom"
import {
  createRootRouteWithContext,
  HeadContent,
  Navigate,
  Outlet,
} from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import type { QueryClient } from "@tanstack/react-query"
import { Toaster } from "@/components/ui/sonner"
import { seo } from "@/lib/seo"
import { sessionQueryOptions } from "@/lib/session"

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      ...seo({
        title: "X Clone",
        description: "An X (Twitter) clone built with React and TanStack Router",
      }),
    ],
  }),
  component: RootLayout,
  notFoundComponent: NotFound,
})

// An address no route matches never reaches the guards in `_app` and `_auth`, so without this a
// signed-out visitor would see a bare "Not Found" instead of the sign-in screen (XC-7). A
// signed-in person still gets "Not Found".
function NotFound() {
  const { data: session, isPending } = useQuery(sessionQueryOptions)

  if (isPending) return null
  if (!session) return <Navigate to="/sign-in" replace />

  return <p className="p-6 text-center text-muted-foreground">Not Found</p>
}

function RootLayout() {
  return (
    <>
      {createPortal(<HeadContent />, document.head)}
      <Outlet />
      <Toaster />
    </>
  )
}
