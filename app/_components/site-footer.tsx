import type { Experience } from "@/lib/experience";
import Link from "next/link";
import { Container } from "./container";
import { BANDCAMP_HOME } from "@/lib/bandcamp";

// Who made the site, kept quiet: it inherits the surrounding text color and
// shows an underline only on hover, so it reads as part of the copyright line.
const AUTHOR_URL = "https://timvanbenschoten.com";
const AUTHOR_LINK = "underline-offset-4 transition hover:text-ink hover:underline";

export function FooterFancy() {
  // Yeti's recessed surface: the footer sits on the well under one frost
  // rule, so it reads as outside the page without a card. Column heads are
  // the barker's heavy type (snow), links slush until hovered.
  const head = "text-[0.95rem] font-black lowercase text-ink";
  const nav = "lowercase underline-offset-4 transition hover:text-ink hover:underline";
  return (
    <footer className="mt-24 border-t border-line bg-[var(--well)]">
      <h2 className="sr-only">Site footer</h2>
      <Container className="grid gap-8 py-10 text-[0.875rem] sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <span className={head}>goose index</span>
          <p className="mt-2.5 max-w-[34ch] leading-relaxed text-muted">
            A complete index of every Goose show — setlists, segues, jams, venues, and the story of
            each night.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-col gap-1.5 text-muted">
          <span className={`${head} mb-1`}>browse</span>
          <Link href="/shows" className={nav}>all shows</Link>
          <Link href="/songs" className={nav}>songs</Link>
          <Link href="/stats" className={nav}>stats</Link>
          <Link href="/on-this-day" className={nav}>on this day</Link>
          <Link href="/venues" className={nav}>venues</Link>
          <Link href="/tours" className={nav}>tours</Link>
        </nav>
        <div className="flex flex-col gap-1.5 text-muted">
          <span className={`${head} mb-1`}>source</span>
          <p className="leading-relaxed">
            Setlist data courtesy of{" "}
            <a href="https://elgoose.net" className="link" target="_blank" rel="noreferrer">
              elgoose.net
            </a>
            . A non-commercial fan project.
          </p>
          {/* We take the band's music and their words and make a site out of them.
              The least we can do is point at the shop where buying it pays them. */}
          <p className="leading-relaxed">
            Support the band directly on{" "}
            <a href={BANDCAMP_HOME} className="link" target="_blank" rel="noreferrer">
              Bandcamp
            </a>
            .
          </p>
          <p className="leading-relaxed">
            <Link href="/listen-links" className="link">How the listen links work</Link>.
          </p>
        </div>
      </Container>
      <div className="border-t border-line">
        <Container className="py-4 text-center text-[0.8rem] lowercase text-muted">
          you&rsquo;re reading the <span className="font-bold text-ink">3.0</span> edition — the gear in the header
          switches to 2.0 (glossy) or 1.0 (plain).
        </Container>
      </div>
      <div className="border-t border-line">
        <Container className="flex flex-col items-center justify-between gap-2 py-5 text-[0.8rem] text-faint sm:flex-row">
          <span>
            © {new Date().getFullYear()} Goose Index ·{" "}
            <a href={AUTHOR_URL} rel="author" className={AUTHOR_LINK}>tim vanbenschoten</a>
          </span>
          <span>Not affiliated with Goose. Built by fans.</span>
        </Container>
      </div>
    </footer>
  );
}

export function FooterFunctional() {
  return (
    <footer className="mt-16 w2-appbar">
      <div style={{ textShadow: "0 -1px 0 rgba(0,0,0,.2)" }}>
        <Container className="flex flex-col items-center justify-between gap-2 py-4 text-xs text-white sm:flex-row">
          <span>© {new Date().getFullYear()} Goose Index · <a href={AUTHOR_URL} rel="author" className="hover:underline">tim vanbenschoten</a> · data from elgoose.net · <a href={BANDCAMP_HOME} target="_blank" rel="noreferrer" className="underline">support Goose on Bandcamp</a> · <Link href="/listen-links" className="underline">how the listen links work</Link></span>
          <span>You&rsquo;re on the 2.0 edition — the gear up top switches to 3.0 (themed) or 1.0 (plain).</span>
          <span>Not affiliated with Goose. Built by fans.</span>
        </Container>
      </div>
    </footer>
  );
}

export function FooterMinimal() {
  return (
    <footer className="mt-16 border-t border-line">
      <Container className="py-6 text-sm text-muted">
        <p>
          Goose Index — setlist data from{" "}
          <a href="https://elgoose.net" target="_blank" rel="noreferrer">elgoose.net</a>. A
          non-commercial fan project, not affiliated with Goose. Support the band directly on{" "}
          <a href={BANDCAMP_HOME} target="_blank" rel="noreferrer">Bandcamp</a>.
          {" "}<Link href="/listen-links">How the listen links work</Link>.
        </p>
        <p className="mt-2">
          This is the 1.0 (plain) edition — the Settings link in the header switches to the
          3.0 (themed) or 2.0 (glossy) editions. Made by{" "}
          <a href={AUTHOR_URL} rel="author">Tim VanBenschoten</a>.
        </p>
      </Container>
    </footer>
  );
}

export function SiteFooter({ experience }: { experience: Experience }) {
  if (experience === "minimal") return <FooterMinimal />;
  if (experience === "functional") return <FooterFunctional />;
  return <FooterFancy />;
}
