# Yeti — the 3.0 edition in the player's look

- **Date:** 2026-11-18
- **Status:** calls made by Tim on the mockups; **awaiting his approval of this spec** before the plan
- **Branch:** `redesign/yeti` (from `origin/main` at `95210b9`)
- **Mockups:** `.superpowers/brainstorm/yeti/` (gitignored). `index.html` is the review page;
  `home.html`, `show.html`, `song.html` and `stats.html` (`#a` / `#b`, `#nunito`) re-skin the
  real 3.0 markup captured from a local build, so every chart keeps its exact form. Published
  privately for review as an Artifact.
- **Source of the look:** the Yeti repo (`tsvb/yeti`, read-only): `Yeti/Theme/Theme.swift` (wins
  where the sheets disagree), `docs/design/yeti-theme/yeti-theme.html`, `yeti-surfaces.html`,
  `yeti-decisions.html`, `Yeti/Theme/Components/`.

## The problem

Pen & Instrument (2026-08-16) made 3.0 an index instead of a dashboard, and that skeleton
works. Its skin is the problem: a fog/slate pair, graphite wobble and three webfaces that belong
to no one else in Tim's world. Yeti, Tim's nugs.net player, now has a finished design language
(night shelves, snow type, sale-yellow stickers, one foil accent kept for time) that grew up
around the same music. The site should wear it.

## The idea

**Keep the index; change the material.** Every content kind keeps the form Pen & Instrument gave
it (ledger, contents, folio, figure, instrument), and every chart keeps its question-shaped form.
What changes is what they're made of:

- **Night, snow and slush** replace fog/slate and graphite. Dark only, like the app.
- **Heavy rounded type** replaces Newsreader + IBM Plex.
- **Yeti's one material** (card stock, the blister bubble, the stickers) appears only where the
  app's own rules put it: where something is on, and where nothing is yet. Lists, figures and
  charts stay flat.
- **Two accents with one job each:** sale yellow is *now and the reading*; foil pink is
  *elapsed time*.

The site stays Goose Index: name, routes, data, and copy voice are unchanged. Import the look,
not the app's copy. No barker lines ("It's on its way") come with it.

## Decisions (with why)

Tim's calls from the handoff are not reopened: Yeti replaces 3.0's look; 3.0 stays the default;
2.0 and 1.0 are untouched; 3.0 is dark only; the charts keep their forms. The calls below were
made on the mockups (2026-11-18), each on the recommended option.

| Decision | Choice | Why |
|---|---|---|
| Foil on the charts | **A: foil = elapsed time.** Gap rings (The Shelf, Most Overdue) and overdue counts are foil. | A ring closing as time passes *is* Yeti's pill ring, and "foil means time" is the app's own rule. It also makes the Shelf stricter: one color for one thing, where today's ring switches from steel to amber. |
| Material placement | **The pack only where something is on; the empty pack where nothing is yet; a flat date tile on every other show.** | Yeti's surfaces sheet: "the pack goes where something is playing", "the empty pack goes where nothing is yet", "Show page: cover flat on the shelf, no bubble". The site has no show imagery, so it never invents art. `MonogramTile` is the app's own no-art answer. |
| Casing | **Keep lowercase chrome.** All-caps eyebrows go. | Pen & Instrument filed lowercase chrome under voice, and voice is unchanged. Yeti's "no eyebrows, no caps" still removes the uppercased labels. |
| Motion | **No FoilSweep.** The live dot keeps its pulse. | The sweep marks a track starting; nothing on the site starts. |
| Site chrome | **Recolor icon, apple-icon, OG card and favicon to Yeti; `theme-color` night on 3.0 only.** | They're still the retired XL II amber-on-brown (`#edab44` on `#15110c`). 3.0 is the default, so the site's face is Yeti's. The feather mark stays. |
| App name | **"Yeti (formerly AppleNugs)"**, exact lines below. | The only public download (v1.5) still installs as AppleNugs and registers only `applenugs://`. Copy must not outrun that. |

## Color

### Palette (Theme.swift, one to one)

Night `#0F1424` (base) · shelf `#18203A` (raised) · frost `#2E3A5C` (hairline) · well `#121830`
(recessed) · card stock `#1B2443` · snow `#E9EEF7` · slush `#9FABCE` · idle `#8590B0` · foil
`#FF8FC4` · sale `#F2E27A` (sticker stock `#FBF1A6` → `#F2E27A` → `#E3D267`, ink `#0F1424`) ·
segment thumb `#2A355A` · bubble plastic: glass `#E1E9FA`, shade `#040710`, glaze `#BED2FF`.

### The role table

The role names stay (the suite greps `--hand` on running text, and every component already
speaks them). Several roles now share a value, which slate already did (`--hand` = `--ember`).
A role is a job, not a hue.

| Role | Value | Carries | On night |
|---|---|---|---|
| `--paper` / `--bg` / `--surface` | night | The page. | — |
| `--surface-2` | shelf | Soft fields (song-group rows, code). | — |
| `--ink` | snow | Content. | 15.7 |
| `--steel` | slush | The record's structure: dates, section leads, a chart's subject bar. | 8.0 |
| `--muted` | slush | Secondary text. | 8.0 |
| `--pencil` | slush | The caveat channel: captions, footnotes, thin-sample warnings. Upright now (Yeti has no italics). | 8.0 |
| `--faint` | idle | Tertiary text, small numerals; chart ticks and scales that must be read. | 5.8 (4.8 on card) |
| `--hand` | sale | **The reading, now**, marks only: the live dot, needles, the half-plays line, a chart's answer. It is Yeti's play state, so "now" maps exactly. Never running text, as today. | 13.9 |
| `--ember` | sale | **Heat**, as text-safe yellow: jam tape, the meters' red zone, the hottest night, "live"/"tonight" words. | 13.9 |
| `--foil` *(new)* | foil | **Elapsed time**: gap rings, overdue counts (`.overdue`). Plus Yeti's chrome uses: keyboard focus and the search caret. Never a fill. | 8.7 |
| `--spruce` | snow | Links, told apart by a slush underline (snow on hover), as Yeti draws them. Footnote marks pair with them. | 15.7 |
| `--line` | frost | Dividers, row rules, ring tracks. 1.6:1, so it never draws something you must read. | 1.6 |
| `--line-soft` | shelf | Bar fields, empty tape. | 1.2 |

**Where `--ember` went:** it used to bundle heat with overdue. Overdue is time, so it moves to
foil; heat stays `--ember`. Each surface that used ember for overdue (the Shelf ring, Most Overdue,
`.overdue` in the song tables) moves to `--foil`; each that used it for heat stays.

**Graphite in charts** (the Shelf's tape, spool hubs) was `--line` at ink 28%. On night, frost is
too dim for a reading, so chart graphite takes idle. Charts never draw a value in frost.

**nugs tokens.** Listen is the page's one snow primary with night ink (Yeti's "Buy on nugs.net"
button, outbound arrow because it leaves the site); Watch and Open on nugs.net are frost rings with
snow text; the per-track ▷ is a slush glyph that turns snow on hover. Bandcamp is a frost ring.
`--nugs-link`/`-strong`, `--nugs-watch`/`-strong` → snow; `--nugs-track` → slush; the
`--nugs-*-line` tokens → frost, slush on hover. The cool blue/violet "player" palette retires in 3.0.

### Scoping (2.0 and 1.0 must not move)

- Yeti's values live on `:root[data-experience="fancy"]`, not bare `:root`. Today bare `:root`
  is fog, and 2.0/1.0 inherit any token they don't redeclare from it, plus, on a dark OS, the slate
  media block's `--nugs-*` values (2.0's hover states read them). Implementation pins exactly
  what each of 2.0 and 1.0 resolves today, in both OS schemes, and keeps it: the fog values stay
  on bare `:root`, and the slate leftovers 2.0/1.0 actually read move into a
  `prefers-color-scheme: dark` block scoped to `:not([data-experience="fancy"])`.
- The global base layer (`::selection`, `:focus-visible`, heading weight) reads tokens, so it
  re-skins per edition by itself; the foil focus ring is declared under the fancy selector only.
- Verified against baselines of `main` taken in both OS schemes (see Verification).

### Contrast

Every text token clears AA on night, shelf and card stock (computed with the gate's own WCAG
function): snow 15.7/13.8/13.1, slush 8.0/7.0/6.7, idle 5.8/5.1/4.8, foil 8.7/7.6/7.2, sale
13.9/12.2/11.6; night ink on sale stock 13.9. `--hand` keeps its 3:1 floor as a mark; it happens
to clear text contrast now, but the mark-only rule stays (it's about the role, and the suite
greps it).

## Type

- **Stack:** `ui-rounded, "SF Pro Rounded", var(--font-nunito), system-ui, -apple-system, sans-serif`
  for display, body and data alike. SF Pro Rounded is never embedded (Apple's license).
- **Nunito ships from the repo via `next/font/local`** (`app/fonts/`, latin subset, weights 400,
  600, 700, 800, 900, the OFL license beside it). The handoff said `next/font/google`, but
  `origin/main` moved its faces off Google in `75bee9b` because a Google download had failed a
  Vercel build: "a build should not depend on a third party being reachable". Local files keep
  that rule and the handoff's intent (self-hosted, no runtime Google request).
- **Who sees what:** only Safari supports `ui-rounded`, so Mac and iPhone Safari get SF Rounded.
  Chrome everywhere (Mac included), Firefox, Windows and Android get Nunito. Nunito's figures
  are tabular by default (measured in Chrome: `1111` = `0000` = `7777`), and
  `font-variant-numeric: tabular-nums` stays on all data for SF Rounded.
- **Weights:** headings and names heavy (900 for page titles and section heads, 800 for
  ledger names and figures); body regular; meta 600. `letter-spacing: -.01em` on display.
- **Data** sets in the rounded face with tabular numerals, as Yeti's `numeric` role does
  (`206c281` already moved 3.0's labels off Plex Mono onto the body face; `--type-mono` follows
  the body face under fancy). Blog code keeps a real monospace through the existing
  `--type-code` token. 2.0 and 1.0 keep their own `--type-*` values.
- **No italics** in 3.0: pen notes, captions and footnotes go upright slush. Blog prose keeps
  `<em>` (authored emphasis is content).
- **Size floor:** nothing in 3.0 below 12px. Today's 0.58–0.65rem mono captions grow to ~0.74rem.
- **Eyebrows go:** uppercased, letter-spaced labels (song table headers, `.song-fact-k`,
  "READING THE LEDGER", the dial's weekday caps) become lowercase or sentence-case labels in
  slush, per the casing rule.
- Newsreader and IBM Plex Sans leave `app/layout.tsx`, and their files and licenses leave
  `app/fonts/`. 2.0 (Helvetica Neue) and 1.0 (Georgia) never used them, so they're unaffected.

## The vocabulary (content kind → form)

Pen & Instrument's forms survive; their finish changes.

| Content | Form |
|---|---|
| A show | A **ledger entry**: date (snow 800, weekday · year in slush) · venue (snow 800) over city (slush) · tour and count right-aligned (slush). Whole row is the link; hover underlines the venue. |
| A list of shows | A **ledger**: frost rule above each entry and below the last. No wrapper. |
| Browse targets | A **contents** list: name (snow 800) · live count (slush). |
| Prev/next | The **folio line**, slush 700, unchanged in content. |
| A stat | A **figure** in Yeti's totals style: heavy snow numeral, slush label beside or under it. No boxes (the song page's eight boxed facts become figures on frost rules). |
| A chart | An **instrument**, re-tinted: slush subject, sale-yellow reading, foil where time elapses, idle ticks, frost tracks. Captions are slush, upright. |
| Section heads | Heavy rounded, lowercase, no rule underneath (the ledger's first frost rule does that job). |
| Setlist | Rows on frost rules: idle position number, title snow 600, duration slush; the segue rail stays (slush); › stays notation. Tape: rounded 6px strip on shelf, slush songs, sale-yellow jams. |
| Facts on a performance | **Plain tags** (Yeti's `PlainTag`): debut, bust-out, cover, original. Snow type on translucent night, frost-white outline, square. |
| States | **Label stickers** (Yeti's `LabelSticker`): **Tonight**, **Live**. Sale stock, night ink, 4° off true. |
| The jam mark | The flame, in `--ember`, matching the tape. |
| The live show's newest song | The **row sticker** (static four-bar stair, 20px) and a faint sale wash on the row, as Yeti's playing row. |
| Controls (filters, sort, pagination) | Filter states: snow text on a `rgba(233,238,247,.10)` pill when active (the app's selected tab), slush otherwise. Actions: underlined snow text. |
| Inputs (search) | A shelf field with a frost keyline, idle placeholder, foil caret (`caret-color`). |
| Buttons | One snow primary per page (Listen on nugs); everything else is a frost ring. |
| Empty state | A nil sentence, as today; for a show with no setlist, the empty pack. |
| Loading | Pulse lines in shelf, stilled under reduced motion. |
| Notes/prose asides | "From the notes": a slush label over snow text between frost rules. |

### The material

- **Tonight's show (Home):** card stock with the punched hang slot, a bubble, the **Tonight**
  label sticker on the bubble's corner, and the nameplate printed on the card (venue heavy,
  city · tour in slush, then "the setlist will appear live" or the newest song). Before songs
  land, the bubble is **empty** (never animated, never a glyph). Once the show is live, the
  bubble holds the date tile, the sticker reads **Live**, and the newest song carries the row
  sticker. Shown in the leading column when Home is wide (≥ 900px), first under the masthead on
  a phone.
- **A show page with no setlist yet** (upcoming or tonight): the empty pack replaces "No setlist
  has been recorded for this show yet."
- **Every other show page:** no card, no bubble. A **flat date tile** (card stock, frost keyline,
  radius 16, slush print: month, day heavy, year) beside the nameplate. 132px on a phone, 168px
  wide. "Shows are squares."
- **The edition picker:** the gear opens a popover (shelf, frost keyline, radius 14) holding
  Yeti's **segmented control** (3.0 · 2.0 · 1.0; shelf track, `#2A355A` thumb) with each
  edition's blurb under it. The appearance row is gone.
- **Never:** a card on a list, a figure, a chart, the header, the footer, or a search result.
  No play sticker or price sticker (the site plays nothing). Wide canvases gain columns, not
  bigger boxes.
- Material CSS is lifted from `yeti-theme.html` verbatim: `.card` (+ `::before` slot), `.bubble`
  (+ `::before` highlight, `::after` glints, the seven-layer shadow), `.stock`, `.tag`,
  `.tag.plain`, `.rs`.

### Snow, focus, motion

- **Snow** is a cool radial glow from the top edge of the page (`rgba(233,238,247,.08)`),
  never a pictured flake.
- **Keyboard focus** is a 2px foil outline, 3px out, radius 8. Never the system blue.
- **Motion:** the live dot pulses; nothing else moves. No FoilSweep. `prefers-reduced-motion`
  stills the dot and the loading pulse, as today. No hover-lift, no rise-in.

## Page by page

- **Chrome:** sticky header on night glass (`rgba(15,20,36,.82)` + blur, frost bottom rule):
  wordmark "goose index" heavy, nav in slush 700 with the current section on the active pill,
  the shelf search field, the gear as a frost-ringed circle. Mobile keeps the text "menu"
  trigger and sheet, restyled. Footer on well with a frost top rule; columns head in snow 900.
- **Home:** masthead ("Goose Index" heavy 52px, lede in slush), the search field, figures as
  totals, then two columns when wide: tonight's pack | on-this-day + latest-shows ledgers;
  upcoming ledger and the contents list below. The year-ruler instrument, where present, keeps
  its sale-yellow hand at now.
- **/shows:** filters as pills/underlines per the controls rule; the ledger; folio pagination.
- **/shows/[date]:** folio bar; the date tile + nameplate (tour · weekday, date heavy, venue
  link, city, the facts line, the actions row with the one primary); notes aside; sets with tape
  and rows; footnotes; the legend in lowercase (no caps); folio footer. Live: the newest song gets
  the row sticker.
- **/songs:** the sortable table on frost rules, lowercase headers, `.overdue` in foil.
- **/songs/[slug]:** title heavy with a plain "original"/"cover" tag; the figures row; the
  charts re-tinted (plays per year slush; gaps & returns slush with the longest gap in sale);
  the performance table with jam marks in ember.
- **/stats:** catalog profile (slush shape, sale half-line, idle scale); the cut previews
  (Most Overdue's rings and counts in foil); section heads heavy.
- **/stats/oracle:** the dial (slush polygon, sale reading); the segue lines (slush splices,
  thickness unchanged); the Shelf (foil rings, idle tape, halo past a year); the meters (slush
  arc, sale red zone and needle in the zone, idle ticks).
- **/venues, /tours, /years, /on-this-day, /search:** ledgers and contents; the venue map and
  tour timeline re-tinted (tour-name label colors re-derived and kept AA, see Verification).
- **/listen-links:** restyled prose; the grammar table on frost rules; the app-name lines below.
- **/blog:** contents list; prose in the rounded face, links snow-underlined, code on shelf.
- **404 / loading / error:** nil sentences and pulse lines.

### Copy that changes because the colors did

Rule 6 applies to chart captions that name a color. Each is recomputed or reworded to say what
the chart now does, never left naming a color that's gone:
- The Shelf: "Past a year the ring runs into the red" → the ring is foil and gains its halo past
  a year (exact words in the plan, Tim to read).
- The tape: "jams burn" stays true (the jam color is heat); the `<span class="text-ember">`
  keeps pointing at the jam color.
- Song page: "The ember bar marks the longest gap" → names the yellow bar.
- The edition blurb "Charts, hand-drawn, light and dark" (`lib/experience.ts`) stops being true
  twice. Proposed: "Charts, dark, rounded type". It must also say only what 3.0 alone has.
- README: "Three editions", the role table and the screenshot note (see Docs).

### The app's name (own commit)

Keep emitting `applenugs://`. Never mention `yeti://` until a Yeti release ships.

| Where (`app/_components/listen-links.tsx`) | Today | Becomes |
|---|---|---|
| Listen/Watch bullet | hand the show to AppleNugs, a Mac app for nugs.net, at that night. | hand the show to Yeti (formerly AppleNugs), a Mac app for nugs.net, at that night. |
| How it works | If AppleNugs is installed, it opens and finds the show… | If Yeti is installed (the current download still carries its old name, AppleNugs), it opens and finds the show… |
| Download | AppleNugs for macOS → `github.com/tsvb/applenugs/releases/latest` | Yeti for macOS → `github.com/tsvb/yeti/releases/latest`. The current release, v1.5, installs as AppleNugs. |
| iPhone | On iPhone, AppleNugs is personal-install only… | On iPhone, Yeti is personal-install only… (rest unchanged) |
| Grammar table | The scheme AppleNugs registers. | The scheme the app registers, under either name. |
| Source link | `github.com/tsvb/applenugs` | `github.com/tsvb/yeti` |

Also: `docs/integrations/applenugs-deeplink.md` prose (its file name and the scheme stay),
the `listen-links.test.tsx` assertions, and the comment in `lib/nugs-catalog/match.ts`. Dated
plans and specs under `docs/superpowers/` stay as written (history).

## Editions

- **3.0** becomes Yeti, wholesale, dark only. The fog/slate/auto switch is removed:
  `lib/theme.ts` and its test, `themeScript` in `app/layout.tsx`, `allowsTheme()` in
  `lib/experience.ts`, the appearance row in `settings-panel.tsx`/`settings-menu.tsx`, the
  `ga-theme` key, the `[data-theme]` blocks and the 3.0 `prefers-color-scheme` blocks. **A stale
  `ga-theme` value is ignored**: nothing reads it any more, and no CSS selects on `data-theme`, so
  a visitor who pinned fog gets night. The plan adds a test that a `data-theme="fog"` attribute
  changes no resolved token.
- **2.0 and 1.0 are untouched,** pixel for pixel against the baselines, in both OS schemes.
- The edition switcher, cookie and keys survive; the settings popover holds only the picker.

## Site chrome (site-wide)

- `app/icon.svg`, `app/apple-icon.tsx`: the feather mark in snow on a night tile (the same
  `rx` and stroke as today).
- `app/opengraph-image.tsx`: night ground, the top-edge snow glow, the wordmark in heavy snow,
  the rules in frost instead of amber. Nunito is read from `app/fonts/` into the image renderer
  (Satori can't use `ui-rounded`), so the OG route makes no network request either.
- `app/favicon.ico`: regenerated from the new `icon.svg`.
- `theme-color`: `#0F1424` on 3.0 only, via `generateViewport` reading the edition cookie. 2.0
  and 1.0 set none, as today.

## Code plan (shape, not sequence)

Commits, in order: tokens and type → dark-only plumbing → chrome (header, footer, nav,
settings) → page forms → charts' colors → icons/OG → app name → docs.

- `app/globals.css`: the fancy token block (Yeti palette + roles + `--foil`), fog values kept
  on bare `:root` for 2.0/1.0, the slate leftovers scoped as above; the material utilities
  (`.y-card`, `.y-bubble`, `.y-stock`, `.y-label`, `.y-tag`, `.y-rs`); `.song-bust`/`.song-cover`
  as plain tags; the setlist row rules; the 2.0 and 1.0 blocks untouched.
- `app/layout.tsx`: `localFont` Nunito replaces Newsreader + Plex Sans; `themeScript` goes;
  `generateViewport`. `app/fonts/`: Nunito files + OFL in, the old faces out.
- `app/_components/pen.tsx` retires: `PenRule` → a straight frost rule (`SectionRule`/`Rule`),
  `PenNote` → `Caption` (upright slush). `PenCircle`/`PenArrow` go where they're used for
  emphasis; the caveat channel stays typographic. Callers: `forms.tsx`, `setlist/fancy.tsx`,
  `site-header.tsx`, `site-footer.tsx`, `not-found.tsx`, `shows/[date]/page.tsx`,
  `shows/page.tsx`, `songs/page.tsx`, `stats/catalog-profile.tsx`, `stats/page.tsx`,
  `venues/page.tsx`.
- New `app/_components/yeti.tsx`: `Pack` (card + bubble, `empty`), `DateTile`, `LabelSticker`,
  `PlainTag`, `RowSticker`, `Segmented`. Server components, no client JS except `Segmented`
  inside the existing settings popover.
- `show-header.tsx`: date tile + nameplate + actions; the empty pack when there's no setlist.
- Home (`app/page.tsx`): the two-column layout and tonight's pack.
- Charts: re-point overdue/gap uses of `--ember` to `--foil` (`the-shelf.tsx`, the Most
  Overdue cut, `.overdue`), chart graphite to `--faint`, and drop the color words from captions.
- `lib/theme.ts` (+ test) deleted; `lib/experience.ts` loses `allowsTheme`; `settings-panel.tsx`
  and `settings-menu.tsx` lose the appearance row.
- Untouched: `lib/queries/`, `lib/sync/`, `db/`, `drizzle/`, JSON-LD, sitemaps, RSS, the blog
  engine, the 1.0 `Doc` components, every 2.0 rule.

## Tests

Rewritten to pin the new design, never deleted to get green (any deletion is listed with its
reason in the PR):
- `globals-contrast.test.ts`: reads the fancy block; Yeti thresholds (ink 7.0, muted/faint/
  pencil/steel/spruce/ember/foil 4.5 against night *and* card stock, hand 3.0); the fog and slate
  cases and the "two slate blocks in sync" case go with the switch; the source-order test is
  rewritten for the new scoping (2.0/1.0 blocks must still win their tokens).
- `tour-timeline-label-contrast.test.ts`: re-derived for night.
- `pen.test.tsx` → tests for the rule/caption replacements; `instrument.test.tsx`,
  `page-chrome.test.tsx`, `settings-panel.test.tsx`, `settings-menu.test.tsx`,
  `show-header.test.tsx`, `site-header.test.tsx`: pin the new markup.
- `lib/theme.test.ts` is deleted with `lib/theme.ts` (the module no longer exists; its job, the
  pin allowlist, is gone). A new test asserts a stale `data-theme` changes nothing.
- `lib/experience.test.ts`: `allowsTheme` cases go; the blurb case pins the new wording.
- `listen-links.test.tsx`: the new name lines and `tsvb/yeti` links; `applenugs://` still emitted.
- The `--hand`-on-text greps stay as they are.

## Verification

- `npm run typecheck` and `npm test` green, including the contrast gate.
- Baselines of `main` re-shot **from a worktree at compare time** (Home is date-driven, so
  today's PNGs won't match another day), in light *and* dark OS schemes for 2.0 and 1.0.
  2.0 and 1.0 must match pixel for pixel.
- 3.0 at **390px** and **1280px** (Playwright with the `ga_experience` cookie, Chrome): home, a
  show (with a setlist, and one without), a song, /stats, /stats/oracle, /venues, /listen-links,
  a blog post. No horizontal scroll at 390; foil focus visible on tab; reduced motion stills the
  dot. Safari is checked by hand on Tim's devices (SF Rounded), since headless here is Chrome-only.
- A stale `ga-theme=fog` in localStorage renders night.
- `git grep -i "fog\|slate"` leaves only intentional hits (2.0's comments, dated docs).
- Copy audit on every touched page against the six rules: no caption names a color the chart
  no longer draws.
- No change under `drizzle/` or `db/` (preview deploys run `db:migrate`).
- PR opened with the preview URL; Tim judges on the preview on his own devices. Merging is his.

## Docs (same PR)

README: "Three editions" (3.0's line and the fog/slate paragraph), the role table in "The
charts are the point" (add `--foil`, re-describe `--ember`, the new values), the screenshot
note, and the architecture line "it reskins with the edition and, inside 3.0, with fog/slate".
A doc that still says Pen & Instrument or fog/slate for the current design is a bug.

## Out of scope

Data, queries, routes, the sync, analytics; 2.0 and 1.0 styling; blog content; chart *forms*;
the Yeti app repo; 1.0's existing `/listen-links` overflow at 390px (579px wide on `main` today,
a separate fix).
