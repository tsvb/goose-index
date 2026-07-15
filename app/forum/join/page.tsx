import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/app/_components/container";
import { Doc, Breadcrumb } from "@/app/_components/doc";
import { getExperience } from "@/lib/experience.server";
import { JoinForm } from "../_components/forms";
import { joinAction } from "../auth-actions";
import { issueFormStamp } from "@/lib/auth/formstamp";

export const metadata: Metadata = { title: "Join the forum", robots: { index: false } };

export default async function JoinPage() {
  const experience = await getExperience();
  const body = (
    <>
      <p className="mt-2 text-sm text-muted">Pick a username, get a magic link — no password, ever.</p>
      <div className="mt-6"><JoinForm action={joinAction} stamp={issueFormStamp()} /></div>
      <p className="mt-6 text-sm">Already a member? <Link className="underline" href="/forum/login">Log in</Link></p>
    </>
  );
  if (experience === "minimal") {
    return (
      <Container className="py-8">
        <Doc>
          <Breadcrumb trail={[{ href: "/", label: "Goose Index" }, { href: "/forum", label: "Forum" }, { label: "Join" }]} />
          <h1>Join the forum</h1>
          {body}
        </Doc>
      </Container>
    );
  }
  return (
    <Container className="py-10">
      <h1 className={experience === "fancy" ? "font-display text-4xl tracking-tight" : "text-2xl font-bold"}>Join the forum</h1>
      {body}
    </Container>
  );
}
