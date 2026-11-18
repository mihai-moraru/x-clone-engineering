---
paths:
  - "src/frontend/src/components/**/*.tsx"
---

# Component conventions

- Always reuse the existing primitives in `src/frontend/src/components/ui/` (button, dialog,
  form, ...) instead of creating new base elements from scratch.
- Match the existing Tailwind utility-class patterns used by neighbouring components rather
  than writing custom CSS.
