# The Forum — old-school boards, modernized

_Date: 2026-07-15 · Status: design (awaiting review) · First feature with user accounts; sets the identity pattern Phase 4 (fan tracking) will reuse._

## Goal

Give Goose Index a classic forum — the XenForo/phpBB shape everyone remembers:
**categories → boards → threads → flat replies**, with member profiles, quoting,
reactions, and unread markers. Modernized in the ways that matter (passwordless
auth, safe rendering, fast server-rendered pages) and deliberately old-school in
the ways that are the point (plain forms, real pagination, works with JS off).

Built **in-repo** (MIT — the open-source requirement), on the existing
Vercel + Neon + Drizzle stack. No new hosting, no second system. XenForo itself
is commercial/closed-source, so we recreate the experience, not the software.

## Decisions locked during brainstorm

| Question | Decision |
|---|---|
| Shape | XenForo-style category boards (not show-threads, not a single lounge) |
| Open source | Build in-repo under the project's MIT license |
| Identity | Email **magic link** — username + email, no passwords |
| Moderation | Standard kit: reports, delete/edit, lock/pin, bans, throttles, honeypot |
| Architecture | **Server-first**: server components + plain HTML forms + server actions; JS "sprinkles" only where they earn it |
| v1 trimmings | Quoting + BBCode, reactions (Like/Honk), unread markers, generated avatars, signatures |

## Routes & pages

| Route | What it is |
|---|---|
| `/forum` | Board index: categories with their boards; per board: description, thread/post counts, last post (thread title, author, time). Footer line: "Members online in the last 15 minutes" (from `last_seen_at`). |
| `/forum/[board]` | Paginated thread list (25/page): pinned first (📌), then by `last_post_at` desc. Row: title, author, reply count, last post by/at, lock marker, bold-when-unread. "Post New Thread" button. |
| `/forum/[board]/new` | New-thread composer: title (3–120 chars) + body. |
| `/forum/threads/[key]` | The thread. `key` is `{id}` or `{id}-{slug}`; non-canonical keys 301 to the canonical `{id}-{slug}`. Flat replies, 20/page, oldest-first. Composer at the bottom (locked threads: notice instead — admins may still post). `?page=unread` jumps to first unread post. |
| `/forum/members/[username]` | Public profile: avatar, join date, post count, signature, 10 most recent posts. Never shows email. |
| `/forum/join` `/forum/login` `/forum/verify` `/forum/logout` `/forum/settings` | Account pages. `verify` is the magic-link landing page. Settings: signature, email change (re-verified via magic link). |
| `/forum/admin` | Admin only: open reports queue, recent members, ban controls. |

**Experience modes.** Every forum page renders in all three modes via the same
per-mode component pattern the rest of the site uses:

- **3.0 (fancy)** — the site's immersive design language.
- **2.0 (functional)** — the glossy dense skin; the most natively-XenForo mode.
- **1.0 (minimal)** — semantic HTML + JSON-LD (`DiscussionForumPosting`). Because
  everything is plain forms, 1.0 is fully *operational*, not just readable.

**Rendering note:** all forum pages are dynamic (they read the session cookie);
no ISR/caching work in v1.

## Data model

New Drizzle tables (integer identity PKs, migrations via `drizzle-kit`).
Identity tables are site-level (no `forum_` prefix) — Phase 4 reuses them.

### Identity (site-level)

- **`users`** — `id`, `username` (display case), `username_lower` (unique),
  `email_lower` (unique), `role` (`member` | `admin`), `signature` (text, raw
  BBCode, ≤200 chars), `post_count` (denormalized), `joined_at`,
  `last_seen_at` (updated on authed requests, throttled to ≥5 min),
  `mark_all_read_at` (for board-wide mark-read), `banned_at`, `banned_reason`.
  Username: 3–20 chars, `[A-Za-z0-9_-]`, unique case-insensitively, immutable in v1.
- **`sessions`** — `token_hash` (PK, sha256 of a 32-byte random token),
  `user_id`, `created_at`, `expires_at` (90 days, slid forward when the
  remaining life drops below 83 days), `last_used_at`. Cookie: `ga_session`,
  httpOnly, secure, `samesite=lax`, path `/`.
- **`login_tokens`** — `token_hash` (PK), `purpose` (`signup` | `login` |
  `email-change`), `email_lower`, `username` (signup only), `user_id` (login /
  email-change), `created_at`, `expires_at` (15 min), `used_at` (single-use).

### Forum

- **`forum_categories`** — `id`, `title`, `position`.
- **`forum_boards`** — `id`, `category_id`, `slug` (unique), `title`,
  `description`, `position`, `thread_count`, `post_count`, `last_post_id`
  (denormalized).
- **`forum_threads`** — `id`, `board_id`, `author_id`, `title`, `slug`
  (from title, reusing the `db/slugs.ts` conventions), `pinned`, `locked`,
  `reply_count`, `last_post_id`, `last_post_at`, `created_at`.
  Index: `(board_id, pinned desc, last_post_at desc)`.
- **`forum_posts`** — `id`, `thread_id`, `author_id`, `body` (raw BBCode
  source, ≤20,000 chars), `created_at`, `edited_at`, `edited_by_id`,
  `deleted_at`, `deleted_by_id`. Soft delete: the row stays; readers see a
  "removed by a moderator" tombstone; admins see the content. Tombstones keep
  their page slot, so `reply_count`/`post_count`/`last_post_*` include them —
  deleting a post never renumbers pages or rewinds counters.
  Index: `(thread_id, id)`.
- **`forum_reactions`** — `post_id`, `user_id`, `kind` (`like` | `honk`),
  `created_at`. PK `(post_id, user_id)` — one reaction per member per post;
  re-reacting with the other kind replaces, same kind removes (toggle).
- **`forum_reports`** — `id`, `post_id`, `reporter_id`, `reason` (≤500 chars),
  `created_at`, `resolved_at`, `resolved_by_id`.
- **`forum_read_markers`** — `user_id`, `thread_id`, `last_read_post_id`,
  `updated_at`. PK `(user_id, thread_id)`. Upserted when a signed-in member
  views a thread page (high-water mark: only moves forward).

**Unread logic** (signed-in only): a thread is unread iff
`last_post_at > user.mark_all_read_at` **and** (no marker **or**
`marker.last_read_post_id < thread.last_post_id`). "Jump to first unread" =
first post with `id > marker.last_read_post_id`. Signed-out visitors get no
unread affordances.

**Denormalized counters** (`post_count`s, `reply_count`, `last_post_*`) are
maintained in the same transaction as the write that changes them, and a
`lib/verify/` check recomputes them against ground truth (matching the
project's existing verify pattern).

### Seed content

Categories/boards are seeded by migration (final wording is Tim's call, easy to edit):

- **The Music** — Tour Talk · Setlists & Stats · Tapes & Media
- **Community** — Introductions · Off Topic · Site Feedback

## Auth — magic links

**Join:** username + email + hidden honeypot field + signed form-issued-at
timestamp. On submit: validate username/email availability, create a `signup`
login token, email the link. Page always says "check your email" (no account
enumeration). Clicking `/forum/verify?token=…`: if valid/unused/unexpired →
create user + session, cookie set, redirect to `/forum`. Race on username
(taken between form and click) → friendly "pick a new username" form that
reuses the verified email.

**Login:** email only. If it matches a user, send a `login` token; the page
response is identical either way. Verify → session.

**Email sending:** Resend HTTP API via plain `fetch` in `lib/auth/email.ts` —
**no new npm dependency**. Env: `RESEND_API_KEY`, `AUTH_EMAIL_FROM`
(e.g. `Goose Index <forum@gooseindex.com>`; domain verified in Resend — gets a
DEPLOY.md runbook entry). Local dev without the key: the magic link is printed
to the server console instead of sent.

**Security properties:** tokens and sessions stored only as sha256 hashes;
tokens single-use, 15-minute expiry; no passwords; PII is one email address;
logout deletes the session row and clears the cookie.

## BBCode

Supported in v1: `[b] [i] [u] [s] [url=…] [quote] [quote=name] [code]`, plus
newlines → paragraphs/breaks and bare URLs auto-linked. No `[img]` (deferred —
hotlink moderation trap).

- Hand-rolled tokenizer/parser in `lib/forum/bbcode.ts` → AST → React elements.
  **Never `dangerouslySetInnerHTML`**; all text is React-escaped by default.
- Unknown/malformed tags render as literal text (never dropped silently).
- `[url]` allows only `http(s)` schemes; rendered links get
  `rel="nofollow ugc"`. `[code]` contents are verbatim (no nested parsing).
  `[quote]` nesting capped at 3 levels; deeper renders literally.
- Signatures allow the inline subset only (`[b] [i] [url]`).
- Tested against an XSS corpus (script/`javascript:`/data: URLs, broken nesting,
  entity tricks — the existing `decodeEntities` lesson applies).

## The trimmings

- **Quoting** — every post has a Quote control. Sprinkle: inserts
  `[quote=name]…[/quote]` into the composer textarea. No JS: the control is a
  link to the thread's last page with `?quote=<postId>`, which the server
  renders into the composer's initial value.
- **Reactions** — Like 👍 and Honk 🪿 under each post with counts. Plain form
  POST to a server action (works JS-off); sprinkle upgrades to no-reload.
  Signed-in only; not on deleted posts; own posts can't be reacted to by
  their author.
- **Unread markers** — bold unread thread rows, "jump to first unread", and a
  "Mark forums read" control (sets `mark_all_read_at = now()`).
- **Avatars** — deterministic goose-flavored SVG identicon from
  `hash(username_lower)` (palette drawn from the site's theme tokens),
  rendered inline. Zero storage, zero upload moderation. Uploads deferred.
- **Signatures** — ≤200 chars, inline BBCode, shown under each post
  (per author, once per page in 1.0 to keep the document clean).
- **Who's online** — "Members online in the last 15 minutes: …" line on
  `/forum` from `last_seen_at`. Cheap, deeply old-school.

## Moderation & spam

**Roles:** `member` and `admin`. Admins are promoted by script
(`npm run make-admin -- <email>`), not by UI. Admin powers: soft-delete and
edit any post (edits show "edited by"), lock/pin threads, ban/unban members,
resolve reports, post in locked threads.

**Reports:** a Report control on every post (signed-in only) → reason form →
`forum_reports` row. `/forum/admin` lists open reports with post context and
one-click resolve/delete-post actions.

**Bans:** banned members can read everything, and see their ban reason on any
write attempt; all writes (posts, threads, reactions, reports) are refused.

**Spam defense (all server-enforced):**

| Control | Rule |
|---|---|
| Signup honeypot | Hidden field must be empty **and** form submitted ≥3s after issue (signed timestamp) |
| Magic-link issuance | ≤3/hour per email, ≤10/hour per IP (`x-forwarded-for` on Vercel) |
| Posting throttle | ≥30s between posts per member |
| New accounts (<24h) | ≥60s between posts, ≤30 posts/day, ≤3 new threads/day, ≤2 links per post |
| Established accounts | ≤10 new threads/day |

Throttles are computed by querying the member's recent rows — no extra tables.

## Error handling

Server actions validate and return structured field errors rendered inline by
the form (no client validation needed). Notable cases: expired/used token →
"link expired, request a new one" with a resend form; username taken at verify
time → re-pick form; posting to a locked/deleted thread → notice; banned →
reason shown; throttled → "slow down" with the wait time; oversize body/title →
inline error preserving the draft text.

## SEO & privacy

- Boards and threads are indexable; `/forum` and board URLs join the sitemap
  (threads stay out in v1 — churn).
- `noindex`: member profiles and join/login/verify/settings/admin. Paginated
  thread pages stay indexable and self-canonical.
- Emails never appear in any HTML, feed, or JSON-LD. Usernames are the only
  public identity.

## Testing

Vitest, same conventions as the repo (pglite via `db/testing.ts` for DB tests;
component tests for rendering):

- **BBCode:** parse/render round-trips, malformed input, nesting caps, the XSS
  corpus, scheme filtering.
- **Auth:** token lifecycle (issue → verify → single-use → expiry), session
  slide, enumeration-safe responses, honeypot/time-trap rejection.
- **Forum queries** (`lib/queries/forum.ts` — pages contain no SQL): pagination
  windows, pinned ordering, unread math, counter maintenance under
  concurrent-ish writes.
- **Throttles:** each rule in the table above, boundary cases.
- **Moderation:** soft-delete tombstones, ban gating, report lifecycle.
- **Components:** post rendering (quotes, signatures, tombstones), thread row
  states (unread/pinned/locked) across the three modes.

## Build order

- **A — Identity:** `users`/`sessions`/`login_tokens`, magic-link flows, email
  sender, settings page, make-admin script. _Land: you can join, log in, log out._
- **B — Core forum:** categories/boards/threads/posts tables + seeds, board
  index, thread list, thread view, composers, BBCode, pagination. _Land: a
  working forum._
- **C — Trimmings:** quoting, reactions, unread markers, avatars, signatures,
  who's-online. _Land: it feels like XenForo._
- **D — Moderation kit:** reports, admin queue, bans, throttles, honeypot.
  _Land: safe to announce._

Each phase merges green (tests + typecheck + build) before the next starts.
D's throttle/honeypot work ships **before** any public announcement of the forum.

## Deferred (explicitly out of v1)

`[img]` and image uploads (needs Vercel Blob + moderation) · avatar uploads ·
watched threads & notifications · private messages · forum search (fold into
site search later) · post edit history · member titles/ranks · thread view
counts · RSS feeds · "show discussion" threads auto-linked from show pages
(natural v2 — the machinery makes this a one-liner board + auto-thread).
