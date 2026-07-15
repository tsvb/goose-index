import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/app/_components/container";
import { getExperience } from "@/lib/experience.server";
import { VerifyForm } from "../_components/forms";
import { verifyAction } from "../auth-actions";

export const metadata: Metadata = { title: "Complete sign-in", robots: { index: false } };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  await getExperience(); // keeps rendering dynamic like the rest of the site
  return (
    <Container className="py-10">
      <h1 className="text-2xl font-bold">Almost there</h1>
      {token ? (
        <div className="mt-6"><VerifyForm action={verifyAction} token={token} /></div>
      ) : (
        <p className="mt-4 text-sm">This link is missing its token. <Link className="underline" href="/forum/login">Request a new one.</Link></p>
      )}
    </Container>
  );
}
