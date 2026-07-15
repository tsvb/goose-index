import type { Metadata } from "next";
import { Container } from "@/app/_components/container";
import { requireUser } from "@/lib/auth/session.server";
import { getExperience } from "@/lib/experience.server";
import { SettingsForm, EmailChangeForm } from "../_components/forms";
import { settingsAction, emailChangeAction } from "../auth-actions";

export const metadata: Metadata = { title: "Forum settings", robots: { index: false } };

export default async function SettingsPage() {
  const user = await requireUser("/forum/settings");
  await getExperience();
  return (
    <Container className="py-10">
      <h1 className="text-2xl font-bold">Settings — {user.username}</h1>
      <section className="mt-8"><SettingsForm action={settingsAction} initialSignature={user.signature ?? ""} /></section>
      <section className="mt-10">
        <h2 className="font-bold">Email</h2>
        <p className="mt-1 text-sm text-muted">Your email is only used for sign-in links and is never shown anywhere.</p>
        <div className="mt-3"><EmailChangeForm action={emailChangeAction} /></div>
      </section>
    </Container>
  );
}
