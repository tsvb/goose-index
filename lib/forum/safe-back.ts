/** Only same-origin forum paths are valid redirect targets: a leading "/" not
 *  followed by "/" or "\" (which browsers can normalize into a protocol-relative
 *  off-site URL). Everything else falls back to /forum.
 *
 *  Lives in its own module (not app/forum/actions.ts) because that file carries
 *  "use server", where every export must be an async server action — a plain
 *  synchronous export there breaks the whole route at runtime. */
export function safeBack(fd: FormData, fallback = "/forum"): string {
  const back = fd.get("back");
  const value = typeof back === "string" ? back : "";
  return /^\/(?![/\\])/.test(value) ? value : fallback;
}
