// Front matter for blog posts: a `---`-fenced block of `key: value` lines at
// the top of the file. Hand-rolled on purpose — the whole grammar is five keys
// of plain strings, and a YAML dependency would accept far more than we want
// to promise authors (nesting, anchors, type coercion) and then have to
// support it forever.

export type FrontMatter = {
  title: string;
  date: string; // YYYY-MM-DD
  summary: string;
  tags: string[];
};

export type ParsedFile = { meta: FrontMatter; body: string };

const KNOWN_KEYS = new Set(["title", "date", "summary", "tags"]);

/** Split a post file into front matter and markdown body. Throws with the
 *  offending detail on malformed input — the caller decides whether that is
 *  fatal (the content test) or a skip (the request path). */
export function parseFrontMatter(source: string): ParsedFile {
  const lines = source.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") {
    throw new Error("post must start with a `---` front matter fence");
  }
  const close = lines.indexOf("---", 1);
  if (close === -1) {
    throw new Error("front matter fence `---` is never closed");
  }

  const raw = new Map<string, string>();
  for (const line of lines.slice(1, close)) {
    if (line.trim() === "") continue;
    const m = /^([a-z]+):\s*(.*)$/.exec(line);
    if (!m) throw new Error(`front matter line is not \`key: value\`: "${line}"`);
    const [, key, value] = m;
    if (!KNOWN_KEYS.has(key)) throw new Error(`unknown front matter key "${key}"`);
    if (raw.has(key)) throw new Error(`duplicate front matter key "${key}"`);
    raw.set(key, value.trim());
  }

  const title = raw.get("title") ?? "";
  const date = raw.get("date") ?? "";
  const summary = raw.get("summary") ?? "";
  if (!title) throw new Error("front matter is missing `title`");
  if (!summary) throw new Error("front matter is missing `summary`");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`\`date\` must be YYYY-MM-DD, got "${date || "(missing)"}"`);
  }
  const { m: mm, d: dd } = { m: Number(date.slice(5, 7)), d: Number(date.slice(8, 10)) };
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) {
    throw new Error(`\`date\` is not a real calendar date: "${date}"`);
  }

  const tags = (raw.get("tags") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  return { meta: { title, date, summary, tags }, body: lines.slice(close + 1).join("\n") };
}
