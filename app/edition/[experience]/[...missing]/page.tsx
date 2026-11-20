import { notFound } from "next/navigation";

// No paths at build (a build opens no database connection). Each one renders
// on its first visit and is then cached; see the edition layout's revalidate.
export function generateStaticParams() {
  return [];
}

// middleware.ts sends every page URL under /edition/<experience>/, so a path
// no route matches lands here; app/not-found.tsx renders it in that edition.
export default function Missing(): never {
  notFound();
}
