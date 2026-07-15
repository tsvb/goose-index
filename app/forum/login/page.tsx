import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/app/_components/container";
import { Doc, Breadcrumb } from "@/app/_components/doc";
import { getExperience } from "@/lib/experience.server";
import { LoginForm } from "../_components/forms";
import { loginAction } from "../auth-actions";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };

export default async function LoginPage() {
  const experience = await getExperience();
  const body = (
    <>
      <p className="mt-2 text-sm text-muted">Enter your email — we'll send you a magic link, no password needed.</p>
      <div className="mt-6"><LoginForm action={loginAction} /></div>
      <p className="mt-6 text-sm">New here? <Link className="underline" href="/forum/join">Join the forum</Link></p>
    </>
  );
  if (experience === "minimal") {
    return (
      <Container className="py-8">
        <Doc>
          <Breadcrumb trail={[{ href: "/", label: "Goose Index" }, { href: "/forum", label: "Forum" }, { label: "Log in" }]} />
          <h1>Log in</h1>
          {body}
        </Doc>
      </Container>
    );
  }
  return (
    <Container className="py-10">
      <h1 className={experience === "fancy" ? "font-display text-4xl tracking-tight" : "text-2xl font-bold"}>Log in</h1>
      {body}
    </Container>
  );
}
