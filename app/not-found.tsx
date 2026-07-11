import Link from "next/link";
import { Container } from "@/app/_components/container";
import { Feather, ArrowRight } from "@/app/_components/marks";

export default function NotFound() {
  return (
    <div className="relative flex min-h-[70vh] items-center overflow-hidden">
      <div className="stage-glow inset-x-0 top-0 h-[420px]" />
      <Container className="relative py-24 text-center sm:py-32">
        <div className="flex justify-center">
          <span className="grid h-16 w-16 place-items-center rounded-full border border-gold/30 text-gold">
            <Feather className="h-8 w-8" strokeWidth={1.2} />
          </span>
        </div>

        <span className="eyebrow mt-8 block">404 · off the setlist</span>

        <h1 className="mt-5 font-display text-[2.6rem] leading-[1.06] tracking-tight text-ink sm:text-5xl">
          This page isn&rsquo;t in the index.
        </h1>

        <p className="mx-auto mt-5 max-w-sm text-lg leading-relaxed text-muted">
          Maybe the show was cancelled, or this night never made it into the
          record. Either way, the setlist doesn&rsquo;t lie.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="group flex items-center gap-2 rounded-full border border-gold/40 bg-surface px-6 py-3 font-mono text-sm text-gold transition hover:border-gold hover:bg-surface-2"
          >
            Back to the index
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/shows"
            className="flex items-center gap-2 rounded-full border border-line bg-surface px-6 py-3 font-mono text-sm text-muted transition hover:border-gold-soft hover:bg-surface-2 hover:text-ink"
          >
            Browse all shows
          </Link>
        </div>
      </Container>
    </div>
  );
}
