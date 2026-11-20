# Yeti — the 3.0 edition in the player's look

- **Date:** 2026-11-18
- **Status:** approved by Tim 2026-11-19 (with the font call below); implemented on `redesign/yeti`.
  Where the build diverged from the first draft, this file was updated to match what shipped.
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
works. Its skin is the problem: a fog/slate pair, graphite wobble and two webfaces that belong
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
2.0 and 1.0 are untouched; 3.0 is dark only. The handoff's fourth call, "the charts keep their
forms", was reopened by Tim on 2026-11-19: see [Round 2](#round-2-the-charts-out-of-the-tape-deck).
The calls below were made on the mockups (2026-11-18), each on the recommended option.

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
| `--foil` *(new; 2.0/1.0 alias it to their `--ember`, see Scoping)* | foil | **Elapsed time**: gap rings, overdue counts (`.overdue`). Plus Yeti's chrome uses: keyboard focus and the search caret. Never a fill. | 8.7 |
| `--spruce` | snow | Links, told apart by a slush underline (snow on hover), as Yeti draws them. Footnote marks pair with them. | 15.7 |
| `--line` | frost | Dividers, row rules, ring tracks. 1.6:1, so it never draws something you must read. | 1.6 |
| `--line-soft` | shelf | Bar fields, empty tape. | 1.2 |

**Where `--ember` went:** it used to bundle heat with overdue. Overdue is time, so in 3.0 it
moves to foil; heat stays `--ember`. The surfaces that used ember for elapsed time are the Shelf's
ring, days and halo (`the-shelf.tsx`), Most Overdue's rings and counts (`stats/page.tsx`), the
song page's gap sparkline marks (`song/charts.tsx`) and `.overdue` in the song tables. They read
`--foil` instead. Every heat use (tape, flame, dial, meters, career peak, busiest tour) stays.

**Graphite in charts** (the Shelf's tape and spool hubs) was `--line`, ink at 28%. On night,
frost is too dim to read a value from, so chart graphite gets its own token, `--graphite`: idle
in 3.0. Charts never draw a value in frost.

**nugs tokens.** Listen is the page's one snow primary with night ink (Yeti's "Buy on nugs.net"
button; its label stays "▷ Listen on nugs", since that text is shared with 2.0); Watch and Open on nugs.net are frost rings with
snow text; the per-track ▷ is a slush glyph that turns snow on hover. Bandcamp is a frost ring.
`--nugs-link`/`-strong`, `--nugs-watch`/`-strong` → snow; `--nugs-track` → slush; the
`--nugs-*-line` tokens → frost, slush on hover. The cool blue/violet "player" palette retires in 3.0.

### Scoping (2.0 and 1.0 must not move)

- **The charts are shared.** Only 1.0 branches to tables; 2.0 renders the same chart components
  and copy as 3.0 and re-skins them through the same role tokens. So **every change to a shared
  component is either scoped to fancy or goes through a token whose 2.0/1.0 value is pinned to
  what that surface resolves to today.** The new tokens are aliased on the bare `:root` floor
  (which 2.0 and 1.0 inherit; a custom property referencing another resolves on the element, so
  each edition's own `--ember`/`--steel`/`--line` flow through) and overridden in 3.0's block:

  | Token | 3.0 | 2.0 and 1.0 (today's value, unchanged) |
  |---|---|---|
  | `--foil` | `#FF8FC4` | `var(--ember)`: what the overdue surfaces draw today |
  | `--gap-near` (the Shelf ring under a year) | `var(--foil)` | `var(--steel)` |
  | `--graphite` (chart tape and hubs) | idle `#8590B0` | `var(--line)` |

  So the Shelf's `signal = red ? ember : steel` becomes `red ? --foil : --gap-near`: one color in
  3.0, today's two in 2.0.
- **Captions that name a color are branched per edition**, not reworded for everyone: the pages
  already read the edition (`getExperience()`), and they pass the caption variant down. 2.0 keeps
  today's words exactly; 3.0 gets words that describe what it draws (see "Copy that changes").
- Yeti's values live on `:root[data-experience="fancy"]`, not bare `:root`. Bare `:root` keeps
  today's fog values, which 2.0 and 1.0 inherit for the tokens they don't redeclare.
- The 3.0 `prefers-color-scheme: dark` block and both `[data-theme]` blocks are deleted
  outright. Checked on `95210b9`: every 2.0 and 1.0 baseline is byte-identical between a light
  and a dark OS, and the hovered `.nugs-show` / `.nugs-track` colors match, because each edition's
  own later rules win. Nothing in 2.0 or 1.0 reads the slate values.
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

- **Stack:** `ui-rounded, "SF Pro Rounded", system-ui, -apple-system, "Segoe UI", Roboto,
  "Helvetica Neue", Arial, sans-serif` for display, body and data alike. **No webfont** (Tim,
  2026-11-19: "a fairly standard font that will be reliable"). Safari on Mac and iPhone gets SF
  Rounded; everywhere else gets the platform's own UI face (San Francisco in Mac Chrome, Segoe UI
  on Windows, Roboto on Android). Nothing is downloaded, so nothing can fail to load or fail a
  build, and every one of those faces has tabular figures. SF Pro Rounded is never embedded
  (Apple's license). Nunito, considered in the mockups, is dropped.
- **Who sees what:** only Safari supports `ui-rounded`; the mockups' "Nunito only" switch no
  longer describes anyone.
- **Weights:** headings and names heavy (900 for page titles and section heads, 800 for
  ledger names and figures); body regular; meta 600. `letter-spacing: -.01em` on display.
- **Data** sets in the same face with tabular numerals, as Yeti's `numeric` role does
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
  `app/fonts/` (only 3.0 used them). 2.0 (Helvetica Neue) and 1.0 (Georgia) are unaffected.

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
| Section heads | Heavy rounded, lowercase, over one straight frost rule (the pen's rule, straightened). |
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
  city · tour in slush, then "the setlist will appear live", today's copy, unchanged; the show
  number only on a multi-show night). Before songs land, the bubble is **empty** (never
  animated, never a glyph); once the setlist has entries it holds the date tile. The sticker
  always reads **Tonight**: the live window is a date, so the site can't claim "Live". On the
  show page, while that window is open, the newest logged song carries the row sticker (labeled
  "newest song logged") and a faint sale wash. Shown in the leading column when Home is wide (≥ 900px), first under the masthead on
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
- **/songs/[slug]:** title heavy (its "original"/"cover" label stays small slush type: the song
  header is shared with 2.0); the figures row; the
  charts re-tinted (plays per year slush; gaps & returns slush with the longest gap in sale);
  the performance table with jam marks in ember.
- **/stats:** catalog profile (slush shape, sale half-line, idle scale); the cut previews
  (Most Overdue's rings and counts in foil); section heads heavy.
- **/stats/oracle:** redrawn in round 2 (see [Round 2](#round-2-the-charts-out-of-the-tape-deck)):
  round spokes, segue bars, the Shelf's ring and disc, level tracks, the coach's card.
- **/venues, /tours, /years, /on-this-day, /search:** ledgers and contents; the venue map and
  tour timeline re-tinted (tour-name label colors re-derived and kept AA, see Verification).
- **/listen-links:** restyled prose; the grammar table on frost rules; the app-name lines below.
- **/blog:** contents list; prose in the rounded face, links snow-underlined, code on shelf.
- **404 / loading / error:** nil sentences and pulse lines.

### Copy that changes because the colors did

Rule 6 applies to chart captions that name a color. In 3.0 each says what the chart now
draws; 2.0 keeps today's words (see Scoping):
- The Shelf: "Past a year the ring runs into the red" → in 3.0, the ring is foil throughout and
  gains its halo past a year (exact words in the plan, Tim to read).
- Song page (`songs/[slug]/page.tsx`): "The ember bar(s) mark…" → in 3.0, the pink bar(s).
- The tape: "jams burn" stays true (the jam color is heat); its span keeps `--ember`.
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
  the rules in frost instead of amber, in the image renderer's built-in sans (Satori can't use
  `ui-rounded`, and the card makes no network request).
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
- `app/layout.tsx`: the `localFont` faces go (no webfont); `themeScript` goes;
  `generateViewport`. `app/fonts/` is deleted.
- **The pen stays in the code, because 2.0 draws it.** Most page components (`forms.tsx`'s
  ledgers and section rules, the home page, stats, songs, venues, the charts) are shared by 3.0
  and 2.0; only the header, footer, show header, setlist and settings branch per edition. So
  3.0's changes to shared components are made in CSS scoped to `[data-experience="fancy"]`
  through stable class hooks (adding a class 2.0 has no rule for changes nothing in 2.0), or in
  a fancy-only branch where the layout itself differs (Home, the show header). In 3.0,
  `PenRule` draws a straight frost hairline and `PenNote` sets upright slush; `PenCircle` and
  `PenArrow` are hidden. 2.0 keeps its wobble, untouched.
- New `app/_components/yeti.tsx`: `Pack` (card + bubble, empty unless given art), `DateTile`,
  `LabelSticker`, `PlainTag`, `RowSticker`; all server components. The segmented edition picker
  is drawn inline in `settings-panel.tsx`'s 3.0 branch (the popover is already a client
  component). `tonight-pack.tsx` composes the pack for Home.
- The header's glass is a `::before` layer (`.yeti-bar`), not a `backdrop-filter` on the
  header: a filter there makes the header the containing block for the mobile sheet's fixed
  scrim.
- `show-header.tsx`: date tile + nameplate + actions; the empty pack when there's no setlist.
- Home (`app/page.tsx`): the two-column layout and tonight's pack.
- Charts: re-point the elapsed-time uses of `--ember` to `--foil` and `--gap-near`
  (`the-shelf.tsx`, `stats/page.tsx`'s Most Overdue, `song/charts.tsx`, `.overdue`), chart
  graphite from `--line` to `--graphite`, and branch the color-naming captions per edition.
  2.0 resolves every one of these to today's color.
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
  replaced by one asserting that `--foil`, `--gap-near` and `--graphite` alias
  `--ember`/`--steel`/`--line` on the bare `:root` and that neither the functional nor the
  minimal block redeclares them (so 2.0 can't silently pick up 3.0's pink).
- `tour-timeline-label-contrast.test.ts`: re-derived for night.
- `pen.test.tsx`, `instrument.test.tsx` and `page-chrome.test.tsx` are unchanged: those
  components' markup is shared with 2.0 and still renders as before, and 3.0's look for them is
  CSS. `app/yeti-hooks.test.ts` pins that CSS to the markup instead: every class a
  `[data-experience="fancy"]` rule selects must be emitted by some component.
  `settings-panel.test.tsx`, `show-header.test.tsx`, `site-header.test.tsx`,
  `site-footer.test.tsx`, `setlist/fancy.test.tsx` and `page.test.tsx` pin the new 3.0 markup.
- `lib/theme.test.ts` is deleted with `lib/theme.ts` (the module no longer exists; its job, the
  pin allowlist, is gone). The contrast gate asserts no `[data-theme]` selector or
  `prefers-color-scheme` block survives, so a stale `data-theme` or `ga-theme` changes nothing.
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

## Round 2: the charts out of the tape deck

Approved by Tim 2026-11-19 on the round-2 mockups (published to the review artifact, every
option as recommended). His note: the special UI (stats, tours, set analysis) "was tuned to a
tapes type of theme, yeti is new".

**What changes.** Round 1 kept every chart's *object*: cassette spools, VU meters, a rotary dial
with a tick bezel, tape splices, a J-card, a tape strip with a minute ruler, ticked tour bars,
hatched year bars. Those are the tape theme the charts were first drawn for. In 3.0 each chart
keeps what it **measures** and is redrawn in Yeti's own forms. 2.0 and 1.0 keep today's drawings
(byte-compared as before).

**What doesn't.** README's three chart rules still bind: the form follows the number (a length
stays a length, a cycle stays round, a level stays a level, time since stays a closing ring);
color means one thing per section; nothing claims more than its evidence. No blister packs on
charts (the pack stays on tonight's show), no motion, foil is elapsed time and never a fill.

**Where the forms come from (the app).** Time is the foil ring around a circle, as on the pill.
A level is the volume track ("volume isn't time, so it isn't foil"). Heat is sale yellow. A
record is printed on card stock, and its facts are a "says so on the box" list.

| Chart | 3.0 draws it as | 3.0 caption (2.0 keeps its own) |
|---|---|---|
| The Shelf (`the-shelf.tsx`) | The pill's ring: a frost track with the foil arc closing over it, a thin foil halo past a year. The spool and hub become a plain card-stock disc whose radius is total plays (same log scale), with a night center hole. | "Originals gathering dust. The ring closes as the gap grows, and the disc inside is how big a song is. Past a year the ring gets a halo. A big disc inside a closed ring is the one to worry about: a staple the band has stopped playing." |
| Deepest venues (`venue-depth.tsx`) | **A, the level track.** One row per room: name and percentage, a 6px frost track filled slush to the reading and sale yellow past the zone, a snow notch at the zone; counts below. Two columns from `md`, one on a phone. | "Each track runs to {full}% jam-tagged and turns yellow past the notch at {zone}%. The counts underneath keep a hot three-show room honest." (Fixes today's "red past 30%", which 3.0 draws yellow.) |
| The week (`dow-dial.tsx`) | **A, round spokes.** The rose on shelf with a frost edge; the mean a plain frost circle; spokes round-capped, thickness = shows (same log scale); hottest night sale, others slush; labels lowercase rounded type, no letterspacing; no tick bezel. | "Spokes read against the week's mean: outward is a jammier night than usual, inward a leaner one. A spoke's thickness is how many shows stand behind it. {Day} runs loosest (…), but on {n} shows, against {m} on a {day}." |
| Segue lines (`transitions-list.tsx`) | A round-capped slush bar between the two names, thickness = count; no arrowhead (a setlist reads left to right). | Section blurb "…pairs the band runs together most often…"; caption "The bar thickens with how often the band plays the segue." |
| Coach's desk (`coachs-notes.tsx`) | A card-stock card (22px radius, frost keyline). The show's date tile, upright, replaces the rotated spine. The notes are laid out, not changed: a `Label: value` line becomes a spec row (label slush, value snow, frost hairline between rows); `[n] text` lines are footnotes with the mark in idle; a bare `Label:` line is a small head; blank lines drop; a leading `YYYY/MM/DD venue` line becomes the card's subhead. Listen is a snow outline pill. | — |
| Set strip (`setlist/tape.tsx`, 3.0 only) | Rounded pieces in a well, as wide as they are long; a 3px gap between songs played separately, a segued run fused into one piece; jams sale; no minute ruler, only the two ends. | "Each song is as wide as it is long. Segued songs run together as one piece, and jams are yellow." |
| Touring year (`tour-timeline.tsx`) | No boxed rows: faint frost month lines on night. Legs are rounded bars (slush wash and keyline) with a dot per show; dotted joins stay; busiest run sale-outlined; future legs dashed frost. Names print beside the bars, never inside (Tim, 2026-11-19, after inside labels clipped to stubs): each tour's name takes the larger free gap beside it in its lane, one name per gap so neighbors can't collide, and prints only when the lane renders wide enough for that gap to hold it (the lane is a CSS size container; ~7.8px a character plus margins). Below `sm` no names print. The name is always inside the link for screen readers. | "…one dot per show… The busiest run, {name} at {n} shows, is outlined in yellow." |
| The shape of it (`career-chart.tsx`) | No hatching: the documented part is solid slush, the undocumented part is the empty box above it (frost keyline). Rounded tops; the busiest year sale; the running year dashed. The label reserve grows so values clear the prose above. | "The empty part of a bar is shows elgoose has logged but has no setlist for…" |
| Catalog profile (`catalog-profile.tsx`) | The rank ruler's ticks go (labels stay); the cut brackets get round ends. The reading stays. | — |

**Smaller fixes in the same pass (3.0 only):** every page title (`PageHead`) takes the heavy
rounded head that the section pages use; the Oracle's section heads match 3.0's section heads;
bars and columns (most played, set placement, plays per year, debuts) get round ends. The cut
tables' activity sparklines stay square: their 4px bars are one shared path across 600 rows, and
round ends there would need a 2.0 branch for a change too small to see.

**Unchanged:** the venue map, Most Overdue's rings, On This Day, the debuts columns' layout.

**How 2.0 stays put.** These components are shared. Each takes the edition and keeps 2.0's JSX
verbatim on its own branch, or is reached through a class hook only 3.0's CSS reads.

## Round 3: tours, as Yeti would shelve them

Approved by Tim 2026-11-19 on the round-3 mockups (the review artifact's `tours.html`), every
option as recommended. His note: "the tours page needs a net new design theory true to the yeti
overhaul".

**The theory.** `/tours` is Yeti's Videos tab for the band's runs: shelves named by *when*, not a
chart. What's on the road leads; what's coming up is next on the shelf; every past run is a flat
tile in the crate. Each tile's face is its **year ring**, the pill's own form: January at the top,
clockwise, the tour's legs lit as arcs, the show count in the middle. An eleven-week summer is a
long arc and a two-week leg a short one, all on one scale, so README's rule (an interval keeps its
length) holds without a calendar chart. A run in progress is the page's one foil mark: its ring is
foil up to today, because that's time moving. A tour's own page reads like Yeti's artist page.

**`/tours` (3.0 only):**
- **On the road**, when today falls between a running tour's first and last show: the tile (its
  ring foil to today, the center "13 / of 15 · tonight", or "N / of M played" on a night off), the
  name, route (first city → last city) and dates; beside it (below on a phone) *Tonight* (the
  row with sale wash and the Tonight sticker), *Coming up next* (the rest of the run, up to 3) and
  *Just played* (the last 3, with song counts). In a break between legs: "home until {date}". The
  site knows dates, not stage time: *Tonight*, never *Live*.
- **Coming up**: every tour that hasn't started (its ring's arcs outlined, not lit), and *Not on a
  tour*: upcoming shows filed under no run, as rows with a plain "one-off" tag.
- **Just back**, when nothing is running: the latest run, with shows/cities, weeks out and route
  as a "says so on the box" list.
- **The crate**: every other past run, newest first, under heavy year heads. Tile: ring face on card
  stock (flat, frost keyline — no blister pack; the pack stays on tonight's show), name, "dates ·
  N wk", route. Phone: each year is a shelf that scrolls sideways; desktop: a six-column grid.
  Last, "Not on a tour": the placeholder run (one-offs, festivals, sit-ins) as one plain tile.
- **The calendar chart is removed from 3.0** (the rings carry duration and season); 2.0 keeps it.
  Round 2's 3.0 drawing of the timeline (rounded legs, names beside the bars) is deleted with it.

**`/tours/[id]` (3.0 only):** the ring tile beside a heavy title, then counts as plain type
("15 shows · 9 cities · nov 3 – 21, 2026 · 2 legs"); for a running tour, "12 of 15 played · show
13 is tonight in Pittsburgh". The shows in order as queue rows (number, date, venue and city, song
count), tonight's row stickered and sale-washed, upcoming rows in slush. A multi-leg tour gets a
heavy head per leg ("Leg 2 · aug 13 – sep 2 · 15 shows · after 40 days home"); two legs sit side by
side on desktop.

**Data:** one new read-only query, `tourRuns()` (the timeline's spans plus each show's city, for
routes and city counts). Upcoming one-offs come from the existing `getUpcomingShows`. Nothing under
`db/` or `drizzle/`.

## Round 4: the coach's desk, as Yeti would print it

Approved by Tim 2026-11-19 on the round-4 mockup (the review artifact's `coach.html`), as shown.
His note: the coach's notes cards "need the same treatment" as tours.

**The theory.** The coach's notes are the band's margin notes on a night. Round 2's card printed
the set lines with numbered marks and the notes below them, so the reader matched *[2]* to
*Kylie Minogue*. Yeti prints a fact as a plain tag on the thing it describes, so each note moves
to where its mark is: *Can't Get You Out Of My Head* `Kylie Minogue`. Every word the band wrote
stays; only the numbers go. Each release is filed like a show in the crate.

**The card (3.0 only; 2.0's J-card and 1.0's plain text unchanged):**
- Header: the show's date tile (small, on shelf) beside the venue (heavy) and its city; *listen on
  bandcamp ↗* as the one snow button; *the show →* to the show page.
- Set lines (`Set 1:`, `One Set:`, `Encore:`, `Soundcheck:` …) are typeset, not rewritten: the
  band's `>` and `->` (and `→`) draw as › and →, commas stay, song names as the band spelled them.
  Songs aren't linked (the notes don't always use the catalog's names).
- A note on a song is a plain tag after it (stickers are states; a note is a fact). A note marked
  on several songs appears on each. A note that's a sentence rather than a phrase (over 28
  characters, or two sentences) prints as a line under its set, starting with the song it's about.
  A note whose mark appears nowhere, or a mark with no note, prints as written: nothing is dropped.
- Other rows (*Show Notes*) stay prose under the sets; *Soundcheck* is the quietest line.
- Two columns of cards from `lg`, one below. A legend under the cards: › and → are the band's own
  `>` and `->`; a tag is the coach's note on the song before it.

## Round 5: a song, as Yeti would read a track

Approved by Tim 2026-11-19 on the round-5 mockup (the review artifact's `song5.html`): "land it".

**The theory.** A song page is Yeti's dashboard for a track. It first answers *how long since it
was played*, drawn as the pill's foil ring (the Shelf's object) read against the song's own longest
gap, with the Shelf's halo once the current gap passes every finished one ("Gone 61 shows, longer
than ever" + a `longest it's been gone` tag). The numbers sit in a "says so on the box" list instead
of eight tiles. Every chart becomes a form the app already draws:

- **The whole run** replaces the gap sparkline: debut to today laid out in shows (a play sits
  `gap + 1` after the last; a reprise is one night), a mark per night played (Dusted Off returns
  taller, in sale), empty track for gaps, the gap still running in foil, the longest finished gap
  underlined in slush.
- **Its years**: per year, a level track of the distinct shows it was played at out of that year's
  shows with a setlist (`careerYears().documented`), the count printed beside it.
- **Where it lands**: set 1 / set 2 / encore as one segmented capsule; *opens* and *jammed* overlap
  them, so they're plain tags.
- **Longest versions** with length tracks; **where it's played most**; **every performance** as
  queue rows (a Dusted Off return tagged, jam-chart picks marked), paged as before.

3.0 only; 2.0 and 1.0 keep their song page. No new query (distinct shows per year come from the
performances the page already loads).

## Round 6: the stats hub, as Yeti's Home for the catalog

Approved by Tim 2026-11-19 on the round-6 mockup (the review artifact's `hub.html`): "land it".

**The theory.** The hub is Yeti's Home for the catalog: it opens with an answer, not a chart, then
shelves each cut with its first entries drawn the way the app draws that kind of thing.

- **The answer** replaces the catalog profile in 3.0: "N songs are half of everything the band has
  played", over two aligned segmented capsules, one of the songs and one of the plays, split into
  the staples (`halfPoint`), the rest of the rotation, and the rarities' tail (`tailStart` at
  `RARITY_MAX_PLAYS`), so the inversion shows. A segment under 7% keeps its true width and its
  label sits outside. A key under it says each group's share. 2.0 keeps the profile.
- **Most overdue**: the Shelf's ring tiles (foil; a full ring is every show with a setlist), a
  cover tagged. **Most played**: a ledger with level tracks. **Rarities**: the count and split, the
  latest returns with plain tags. **Debuts**: the year columns and the newest as rows. **Set
  stats**: each leader as a line ("opens the show", "opens set 2", "closes it"). **Oracle**: its
  one reading. Each shelf's head links its cut.
- No new query (`catalogProfile().plays`). 3.0 only.

## Out of scope

Data, queries, routes, the sync, analytics; 2.0 and 1.0 styling; blog content;
the Yeti app repo; 1.0's existing `/listen-links` overflow at 390px (579px wide on `main` today,
a separate fix).
