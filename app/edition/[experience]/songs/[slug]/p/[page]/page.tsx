// Page 2+ of a song's performance table: public `/songs/<slug>?page=2`,
// rewritten here by proxy.ts so it caches like page 1.
export { default, generateMetadata } from "../../page";

// No paths at build (a build opens no database connection). Each one renders
// on its first visit and is then cached; see the edition layout's revalidate.
export function generateStaticParams() {
  return [];
}
