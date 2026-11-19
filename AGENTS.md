# Project Guidelines

These instructions apply to the entire repository. Follow the patterns already
used by nearby files, and keep changes focused on the requested behavior.

## UI and styling

- Use the existing shadcn/ui components from `src/components/ui` before
  creating new primitives.
- Follow the repository's shadcn configuration in `components.json`, including
  the `radix-nova` style and CSS-variable-based theming.
- Use Tailwind CSS utility classes for component styling.
- Do not introduce CSS modules, styled-components, another styling library, or
  one-off global CSS classes when Tailwind utilities can express the design.
- Use the existing `cn()` utility when classes are conditional or need to be
  merged.
- Reuse existing design tokens and CSS variables instead of hardcoded colors.
- Preserve responsive behavior, dark-mode support, keyboard navigation, focus
  states, and appropriate ARIA attributes.

## Icons

- Use `lucide-react` for interface icons.
- Import icons individually, for example:
  `import { ChevronDown, Plus } from "lucide-react"`.
- Do not add another icon library unless the task explicitly requires it or
  Lucide does not provide a suitable icon.
- Keep icon sizing and stroke weight consistent with neighboring components.

## React and TypeScript

- Write React components in TypeScript and avoid `any` when a concrete type can
  be expressed.
- Prefer small, composable components and reuse existing hooks and utilities.
- Follow the current patterns for TanStack Router, TanStack Form, Zustand,
  Zod, React Three Fiber, and Drei rather than adding competing libraries.
- Use the configured `@/` aliases instead of long relative import chains when
  appropriate.

## Interaction patterns

- Use shadcn/Radix primitives for buttons, dialogs, dropdowns, popovers,
  tooltips, tabs, and form controls.
- Interactive elements must have clear hover, focus, disabled, and loading
  states.
- Use semantic HTML. Do not make a `div` behave like a button when a real
  `button` or link is appropriate.
- Match existing motion and transition patterns; respect reduced-motion user
  preferences for nonessential animation.

## Project hygiene

- Inspect neighboring components before implementing a new pattern.
- Do not rewrite unrelated code or discard existing user changes.
- Keep user-facing text and naming consistent with the rest of the product.
- Add or update Vitest tests when behavior changes.
- Before finishing, run the relevant tests and, when practical, `npm run lint`
  and `npm run build`.
