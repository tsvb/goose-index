import Link from "next/link";
import { Container } from "./container";
import { PenRule } from "./pen";
import { getExperience } from "@/lib/experience.server";
import { BANDCAMP_HOME } from "@/lib/bandcamp";

export function FooterFancy() {
  return (
    <footer className="mt-24">
      <Container>
        <PenRule seed="footer" />
      </Container>
      <Container className="grid gap-10 py-10 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <span className="text-[0.95rem] font-semibold lowercase text-ink">goose index</span>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
            A complete index of every Goose show — setlists, segues, jams, venues, and the story of
            each night.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-col gap-2 text-sm text-muted">
          <span className="text-[0.68rem] font-semibold lowercase text-faint">browse</span>
          <Link href="/shows" className="lowercase underline-offset-4 transition hover:text-ink hover:underline">all shows</Link>
          <Link href="/songs" className="lowercase underline-offset-4 transition hover:text-ink hover:underline">songs</Link>
          <Link href="/stats" className="lowercase underline-offset-4 transition hover:text-ink hover:underline">stats</Link>
          <Link href="/on-this-day" className="lowercase underline-offset-4 transition hover:text-ink hover:underline">on this day</Link>
          <Link href="/venues" className="lowercase underline-offset-4 transition hover:text-ink hover:underline">venues</Link>
          <Link href="/tours" className="lowercase underline-offset-4 transition hover:text-ink hover:underline">tours</Link>
        </nav>
        <div className="flex flex-col gap-2 text-sm text-muted">
          <span className="text-[0.68rem] font-semibold lowercase text-faint">source</span>
          <p className="leading-relaxed">
            Setlist data courtesy of{" "}
            <a href="https://elgoose.net" className="link" target="_blank" rel="noreferrer">
              elgoose.net
            </a>
            . A non-commercial fan project.
          </p>
          {/* We take the band's music and their words and make a site out of them.
              The least we can do is point at the shop where buying it pays them. */}
          <p className="mt-2 leading-relaxed">
            Support the band directly on{" "}
            <a href={BANDCAMP_HOME} className="link" target="_blank" rel="noreferrer">
              Bandcamp
            </a>
            .
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
          <span>© {new Date().getFullYear()} Goose Index · data from elgoose.net · <a href={BANDCAMP_HOME} target="_blank" rel="noreferrer" className="underline">support Goose on Bandcamp</a></span>
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
