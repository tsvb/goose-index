import Link from "next/link";
import { Container } from "@/app/_components/container";
import { PageHead } from "@/app/_components/page-chrome";
import { PenRule } from "@/app/_components/pen";
import { getExperience } from "@/lib/experience.server";
import { Doc, Breadcrumb } from "@/app/_components/doc";

export default async function NotFound() {
  const experience = await getExperience();

  // Minimal mode gets a plain document, not the immersive hero — the fancy
  // stage-glow markup reads as noise in the 1.0 edition.
  if (experience === "minimal") {
    return (
      <Container className="py-8">
        <Doc>
          <Breadcrumb trail={[{ href: "/", label: "Goose Index" }, { label: "Not found" }]} />
          <h1>This page isn&rsquo;t in the index</h1>
          <p>
            Maybe the show was cancelled, or this night never made it into the
            record. Either way, the setlist doesn&rsquo;t lie.
          </p>
          <p>
            Browse <Link href="/shows">all shows</Link>, the{" "}
            <Link href="/songs">song catalog</Link>, or head{" "}
            <Link href="/">back to the index</Link>.
          </p>
        </Doc>
      </Container>
    );
  }

  return (
    <Container className="py-16 text-center sm:py-24">
      <PageHead kicker="404 · off the setlist" title="This page isn’t in the index.">
        <p className="mx-auto mt-5 max-w-sm text-lg leading-relaxed text-muted">
          Maybe the show was cancelled, or this night never made it into the
          record. Either way, the setlist doesn’t lie.
        </p>
        <PenRule seed="404" className="mx-auto mt-8 max-w-xs" />
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href="/" className="lowercase text-spruce underline underline-offset-4 transition hover:text-ink">
            back to the index
          </Link>
          <span className="hidden text-line sm:inline">·</span>
          <Link href="/shows" className="lowercase text-spruce underline underline-offset-4 transition hover:text-ink">
            browse all shows
          </Link>
        </div>
      </PageHead>
    </Container>
  );
}
