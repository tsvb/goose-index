import type { ReactNode } from "react";
import type { Experience } from "@/lib/experience";
import { Doc, Breadcrumb, DocSection } from "./doc";
import { Container } from "./container";
import { NugsLink } from "./nugs-link";
import { nugsShowHref, nugsTrackHref, nugsWebFallback } from "@/lib/nugs";

export type ListenExample = {
  date: string;
  venue: string | null;
  containerId: number | null;
  song: string | null;
};

export type NugsCoverage = { resolved: number; total: number };

/** Every URL on the page comes from the same helpers the buttons call —
 *  documentation that cannot drift from the behaviour it documents. */
function buildUrls(example: ListenExample) {
  return {
    listen: nugsShowHref({ date: example.date, venue: example.venue }),
    watch: nugsShowHref({ date: example.date, venue: example.venue, media: "video" }),
    track: example.song
      ? nugsTrackHref({ date: example.date, venue: example.venue, song: example.song })
      : null,
    fallback: nugsWebFallback({ date: example.date, venue: example.venue, containerId: example.containerId }),
  };
}

function ButtonsBody() {
  return (
    <ul>
      <li><strong>◈ Bandcamp</strong> — buys the night from the band, when they have released it. Buying there pays them, which is why it comes first.</li>
      <li><strong>▷ Listen on nugs</strong> and <strong>▷ Watch</strong> — hand the show to AppleNugs, a Mac app for nugs.net, at that night. Watch opens its video side.</li>
      <li><strong>▷ on a setlist row</strong> — the same handoff, started at that song.</li>
      <li><strong>↗ Open on nugs.net</strong> — the show&rsquo;s own page in the nugs web player. It appears only when we know that exact page.</li>
    </ul>
  );
}

function ClickBody() {
  return (
    <p>
      The Listen, Watch and row buttons hand your browser an <code>applenugs://</code> link.
      If AppleNugs is installed, it opens and finds the show on nugs by artist, date and venue.
      If nothing claims the link after about a second and you are still on the page, you are
      sent to nugs.net instead — straight to the show&rsquo;s page when we know it, or to a
      search for it when we don&rsquo;t. Watch does the same for the video side, when the show
      has one.
    </p>
  );
}

function NeedsBody() {
  return (
    <ul>
      <li>A <a href="https://nugs.net" target="_blank" rel="noopener noreferrer">nugs.net</a> subscription. These buttons open what a subscription already includes, and nugs.net asks you to sign in.</li>
      <li><a href="https://github.com/tsvb/applenugs/releases/latest" target="_blank" rel="noopener noreferrer">AppleNugs for macOS</a> — signed, notarized, updates itself.</li>
      <li>On iPhone, AppleNugs is personal-install only — you build it yourself. There is no App Store version and no TestFlight, so on a phone these buttons land on the nugs website.</li>
    </ul>
  );
}

function LimitsBody({ coverage }: { coverage: NugsCoverage | null }) {
  return (
    <>
      <p>
        This index holds no nugs catalog. A night listed here isn&rsquo;t necessarily on nugs,
        and landing on an empty search means nugs doesn&rsquo;t have that night — not that the
        link broke.
        {coverage && coverage.total > 0 && (
          <> As of today, {coverage.resolved} of {coverage.total} shows here link straight to
          their page on nugs.net; the rest fall back to a search.</>
        )}
      </p>
      <p>
        Two shows on one day are told apart by venue; where that isn&rsquo;t enough, the app
        asks rather than guessing. And a web link reaches a show, never one song — the
        row&rsquo;s ▷ starts the <em>app</em> at the song, but without the app you land on the
        whole show.
      </p>
    </>
  );
}

function TryItBody({ example, urls }: { example: ListenExample; urls: ReturnType<typeof buildUrls> }) {
  return (
    <>
      <p>
        These are the real thing, built for {example.date}
        {example.venue ? <> at {example.venue}</> : null} the same way every show page builds
        its buttons. Clicking tells you whether the handoff works on <em>your</em> machine —
        it doesn&rsquo;t say whether the show is on nugs.
      </p>
      <p>
        <NugsLink href={urls.listen} fallback={urls.fallback} className="nugs-show" title="Play this show on nugs">▷ Listen on nugs</NugsLink>
      </p>
      <p>The link behind that button:</p>
      <p><code>{urls.listen}</code></p>
      {urls.track && (
        <>
          <p>And the same show, started at &ldquo;{example.song}&rdquo;:</p>
          <p><code>{urls.track}</code></p>
        </>
      )}
      <p>And the video side:</p>
      <p><code>{urls.watch}</code></p>
      <p>Where it sends you if the app doesn&rsquo;t open:</p>
      <p><code>{urls.fallback}</code></p>
    </>
  );
}

/** Placeholder seam for Task 3 — the developer reference renders here. */
function DevReference({ minimal }: { minimal: boolean }) {
  void minimal;
  return null;
}

const SECTIONS = (example: ListenExample | null, coverage: NugsCoverage | null) => {
  const urls = example ? buildUrls(example) : null;
  const list: { title: string; body: ReactNode }[] = [
    { title: "The buttons", body: <ButtonsBody /> },
    { title: "What a click does", body: <ClickBody /> },
    { title: "What you need", body: <NeedsBody /> },
    { title: "What this page can't promise", body: <LimitsBody coverage={coverage} /> },
  ];
  if (example && urls) list.push({ title: "Try it", body: <TryItBody example={example} urls={urls} /> });
  return list;
};

export function ListenLinksContent({
  experience, example, coverage,
}: { experience: Experience; example: ListenExample | null; coverage: NugsCoverage | null }) {
  const sections = SECTIONS(example, coverage);

  if (experience === "minimal") {
    return (
      <Container className="py-8">
        <Doc>
          <Breadcrumb trail={[{ href: "/", label: "Goose Index" }, { label: "Listen links" }]} />
          <h1>How the listen links work</h1>
          {sections.map((s) => (
            <DocSection key={s.title} title={s.title}>{s.body}</DocSection>
          ))}
          <DevReference minimal />
        </Doc>
      </Container>
    );
  }

  return (
    <Container className="max-w-3xl py-10 sm:py-14">
      <span className="eyebrow">Listen links</span>
      <h1 className="mt-3 font-display text-4xl tracking-tight text-ink sm:text-5xl">
        How the listen links work
      </h1>
      <div className="mt-8 space-y-10 leading-relaxed text-muted [&_code]:text-[0.85em] [&_code]:break-all [&_strong]:text-ink">
        {sections.map((s) => (
          <section key={s.title}>
            <h2 className="mb-3 font-display text-xl text-ink">{s.title}</h2>
            {s.body}
          </section>
        ))}
        <DevReference minimal={false} />
      </div>
    </Container>
  );
}
