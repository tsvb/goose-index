import Link from "next/link";
import { Container } from "./container";
import { PenRule } from "./pen";
import { getExperience } from "@/lib/experience.server";
import { BANDCAMP_HOME } from "@/lib/bandcamp";

const LABEL = "font-mono text-[0.68rem] font-semibold lowercase tracking-[0.06em] text-faint";

export function FooterFancy() {
  return (
    // The footer is the one region set outside the page's measure. Three
    // signals put it there, none of them a background fill: the pen rule runs
    // full-bleed (the masthead's is container-inset), every column is headed
    // by the same mono micro-label as the two closing strips, and the whole
    // block sits a notch below content type at 0.8rem.
    //
    // A tinted band would say it faster, and can't: fog's palette is tuned to
    // the AA floor against --paper — spruce (links) clears 4.67:1 and faint
    // 4.59:1 — so even a 4% ink tint drops both under 4.5:1. Structure and
    // scale do the separating instead. See globals-contrast.test.ts.
    <footer className="mt-28">
      <h2 className="sr-only">Site footer</h2>
      <PenRule seed="footer" />
      <Container className="grid gap-8 py-9 text-[0.8rem] sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <span className={LABEL}>goose index</span>
          <p className="mt-2.5 max-w-[34ch] leading-relaxed text-muted">
            A complete index of every Goose show — setlists, segues, jams, venues, and the story of
            each night.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-col gap-1.5 text-muted">
          <span className={`${LABEL} mb-1`}>browse</span>
          <Link href="/shows" className="lowercase underline-offset-4 transition hover:text-ink hover:underline">all shows</Link>
          <Link href="/songs" className="lowercase underline-offset-4 transition hover:text-ink hover:underline">songs</Link>
          <Link href="/stats" className="lowercase underline-offset-4 transition hover:text-ink hover:underline">stats</Link>
          <Link href="/on-this-day" className="lowercase underline-offset-4 transition hover:text-ink hover:underline">on this day</Link>
          <Link href="/venues" className="lowercase underline-offset-4 transition hover:text-ink hover:underline">venues</Link>
          <Link href="/tours" className="lowercase underline-offset-4 transition hover:text-ink hover:underline">tours</Link>
        </nav>
        <div className="flex flex-col gap-1.5 text-muted">
          <span className={`${LABEL} mb-1`}>source</span>
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
      <div className="border-t border-line-soft">
        <Container className="py-4 text-center font-mono text-xs lowercase text-faint">
          you&rsquo;re reading the <span className="text-steel">3.0</span> edition — the gear in the header
          switches to 2.0 (glossy) or 1.0 (plain).
        </Container>
      </div>
      <div className="border-t border-line-soft">
        <Container className="flex flex-col items-center justify-between gap-2 py-5 text-xs text-faint sm:flex-row">
          <span className="font-mono">© {new Date().getFullYear()} Goose Index</span>
          <span className="font-mono">Not affiliated with Goose. Built by fans.</span>
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
          <span>© {new Date().getFullYear()} Goose Index · data from elgoose.net · <a href={BANDCAMP_HOME} target="_blank" rel="noreferrer" className="underline">support Goose on Bandcamp</a> · <Link href="/listen-links" className="underline">how the listen links work</Link></span>
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
          3.0 (themed) or 2.0 (glossy) editions.
        </p>
      </Container>
    </footer>
  );
}

export async function SiteFooter() {
  const experience = await getExperience();
  if (experience === "minimal") return <FooterMinimal />;
  if (experience === "functional") return <FooterFunctional />;
  return <FooterFancy />;
}
