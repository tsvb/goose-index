"use client";

import "@/app/globals.css";
import { useParams } from "next/navigation";
import { EditionShell } from "@/app/_components/edition-shell";
import { NotFoundBody } from "@/app/_components/not-found-body";
import { resolveExperience } from "@/lib/experience";

// Every 404 renders here: unknown URLs (the [...missing] catch-all) and
// notFound() on a page. Next renders it inside the cached page's render, so it
// must not read the cookie (that would throw "static to dynamic" at runtime).
// The proxy (proxy.ts) already put the edition in the URL (/edition/<experience>/…),
// and useParams sees it on the server render too.
export default function NotFound() {
  const experience = resolveExperience(useParams<{ experience?: string }>()?.experience);
  return (
    <EditionShell experience={experience}>
      <NotFoundBody experience={experience} />
    </EditionShell>
  );
}
