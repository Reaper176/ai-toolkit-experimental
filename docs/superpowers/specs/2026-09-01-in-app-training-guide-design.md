# In-App Training Guide Design

Date: 2026-09-01

## Context

The LoRA training book is stored under `docs/book`, but the UI exposes it only through a GitHub link at the bottom of the sidebar. That requires internet access, leaves the application, and makes the book harder to use alongside job configuration. The repository and Docker image already contain the complete book and its ordered `book-manifest.json`.

## Goal

Provide the complete LoRA training book as an offline, readable section of the AI Toolkit UI while keeping `docs/book` as the single source of truth.

## Non-goals

- Full-book search in the first release.
- Editing Markdown through the UI.
- Synchronizing content from GitHub or another external service.
- Rendering files outside the manifest-listed training book.
- Replacing the existing book generation and validation pipeline.

## Navigation and routes

The primary sidebar gains a `Training Guide` item directly below `Datasets` and above `Settings`. It replaces the separate external `TrainingGuideLink` rendered near the bottom of the sidebar.

The reader uses these routes:

- `/book` displays `docs/book/README.md`.
- `/book/[...slug]` displays the matching manifest-listed Markdown page, omitting the `.md` suffix from the public URL.

The active sidebar item and active chapter use `aria-current="page"`. Relative links between book pages are rewritten to the corresponding `/book/...` route, retaining fragments. Same-page fragments remain local anchors. External HTTP(S) links open in a new tab with safe relationship attributes.

## Server-side content boundary

A server-only book loader owns all filesystem access. It reads `docs/book/book-manifest.json`, validates the fields required by the reader, and builds an ordered allowlist of page paths. Requests resolve only through that allowlist; user-controlled path segments are never passed directly to an unconstrained filesystem read.

The loader returns one page model containing:

- normalized manifest path and public slug;
- Markdown source;
- page title;
- ordered headings used by the page outline;
- previous and next page summaries;
- grouped chapter navigation derived from the complete ordered manifest.

Only the requested Markdown page is read and rendered. The complete 6 MB book is not shipped to the browser. The repository checkout and production Docker image both contain `docs/book`, so the reader remains offline without duplicating generated book content inside `ui`.

## Rendering

The server-rendered page uses `react-markdown` and `remark-gfm` for the Markdown constructs used by the book, including tables, fenced code, lists, and links. A small rendering adapter supplies:

- deterministic heading IDs shared with the extracted outline;
- internal-link rewriting;
- horizontally scrollable code blocks and tables;
- UI-consistent typography and dark-theme styling;
- safe handling of Markdown as content rather than raw HTML.

The route does not enable arbitrary embedded HTML. Book content remains readable even when a chapter contains large reference tables or long code examples.

## Reader layout

Desktop uses the approved book-reader layout:

1. A left chapter column grouped by the first manifest path segment.
2. A centered article column with a bounded readable width.
3. A right `On this page` outline linked to the article headings.

Previous and next chapter controls appear after the article. The existing application sidebar remains outside the reader and continues to provide global navigation.

At smaller breakpoints, the chapter column becomes a keyboard-accessible drawer and the page outline is hidden. The article uses the available width. Opening and closing the drawer does not navigate; it closes through its button, outside interaction, Escape, or a successful chapter navigation.

## Failure handling

- An unknown, malformed, encoded traversal, or non-manifest slug returns the normal Next.js 404 response.
- A missing or unreadable manifest-listed file renders a concise `Training Guide unavailable` state without exposing absolute paths or filesystem diagnostics.
- An invalid manifest fails closed. The route does not fall back to scanning or serving arbitrary files.
- Broken external links remain ordinary links; the UI does not require network access to render the page.

## Accessibility

- The reader uses semantic navigation, main, article, heading, and list structures.
- Chapter navigation and the page outline have distinct accessible labels.
- Active navigation exposes `aria-current` in addition to visual styling.
- The mobile drawer has a labelled toggle, correct expanded state, focusable contents, and Escape dismissal.
- Keyboard users can reach every internal link, previous/next control, and code/table overflow region.
- Heading anchors provide stable deep links without changing the visible heading text.

## Testing and acceptance

Automated tests cover:

- manifest order and chapter grouping;
- `/book` and nested slug mapping;
- rejection of unknown and traversal-style paths;
- internal, fragment, and external link rewriting;
- deterministic heading extraction and IDs;
- previous and next navigation;
- unavailable-file behavior without path disclosure;
- `Training Guide` placement between `Datasets` and `Settings` and removal of the duplicate external link;
- reader semantics, active states, mobile drawer dismissal, and overflow classes.

Acceptance gates are the focused training-guide tests, `npm run test:training-presets`, `npm run build`, generated-book checks, `git diff --check`, and a clean feature worktree. The long `npm run test:training-book` gate is optional for this UI-only addition unless explicitly requested.

## Dependencies and packaging

Add `react-markdown` and `remark-gfm` as locked UI dependencies. No external service or runtime download is required. The existing Docker source clone already includes `docs/book`; the loader resolves the repository root explicitly rather than relying on the process working directory.
