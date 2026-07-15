// Matches only the innermost [quote] blocks — content must not itself contain
// another [quote...] or [/quote] — so a naive lazy match can't bridge an outer
// opening tag to an inner block's closing tag on nested/stacked input.
const INNERMOST_QUOTE = /\[quote(?:=[^\]]*)?\](?:(?!\[quote(?:=[^\]]*)?\]|\[\/quote\])[\s\S])*\[\/quote\]/gi;

/** Build a [quote] block for a reply, dropping any quotes nested in the source. */
export function quoteBBCode(author: string, body: string): string {
  let s = body;
  let prev = "";
  while (prev !== s) {
    prev = s;
    s = s.replace(INNERMOST_QUOTE, "");
  }
  return `[quote=${author}]${s.trim()}[/quote]\n`;
}
