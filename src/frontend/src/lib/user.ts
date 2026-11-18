type DisplayNameUser = { name?: string | null; email: string }

export function getDisplayName(user: DisplayNameUser): string {
  return user.name?.trim() || user.email.split("@")[0]
}

/** The API sends handles "@"-prefixed; tolerate either form and show exactly one "@". */
export function formatHandle(handle: string): string {
  return `@${handle.replace(/^@+/, "")}`
}
