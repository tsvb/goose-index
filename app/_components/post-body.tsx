import Link from "next/link";
import type { ReactNode } from "react";
import { showRefLabel, songRefLabel, type Block, type Inline } from "@/lib/blog/markdown";

// AST → React for blog posts. Semantic HTML only — .post-prose in globals.css
// does the typography from theme tokens, so posts reskin with the edition and
// theme like everything else. The [[show:]]/[[song:]] refs become ordinary
// internal links; they are the reason the blog engine is bespoke.

function Inlines({ nodes }: { nodes: Inline[] }): ReactNode {
  return nodes.map((n, i) => {
    switch (n.kind) {
      case "text":
        return n.text;
      case "code":
        return <code key={i}>{n.text}</code>;
      case "strong":
        return (
          <strong key={i}>
            <Inlines nodes={n.children} />
          </strong>
        );
      case "em":
        return (
          <em key={i}>
            <Inlines nodes={n.children} />
          </em>
        );
      case "link":
        return n.href.startsWith("/") || n.href.startsWith("#") ? (
          <Link key={i} href={n.href} className="link">
            <Inlines nodes={n.children} />
          </Link>
        ) : (
          <a key={i} href={n.href} className="link" rel="noopener">
            <Inlines nodes={n.children} />
          </a>
        );
      case "show-ref":
        return (
          <Link key={i} href={`/shows/${n.date}`} className="link">
            {n.label ?? showRefLabel(n.date)}
          </Link>
        );
      case "song-ref":
        return (
          <Link key={i} href={`/songs/${n.slug}`} className="link">
            {n.label ?? songRefLabel(n.slug)}
          </Link>
        );
    }
  });
}

export function PostBody({ blocks }: { blocks: Block[] }) {
  return (
    <div className="post-prose">
      {blocks.map((b, i) => {
        switch (b.kind) {
          case "heading": {
            const H = b.level === 2 ? "h2" : "h3";
            return (
              <H key={i} id={b.id}>
                <Inlines nodes={b.children} />
              </H>
            );
          }
          case "paragraph":
            return (
              <p key={i}>
                <Inlines nodes={b.children} />
              </p>
            );
          case "list": {
            const L = b.ordered ? "ol" : "ul";
            return (
              <L key={i}>
                {b.items.map((item, j) => (
                  <li key={j}>
                    <Inlines nodes={item} />
                  </li>
                ))}
              </L>
            );
          }
          case "quote":
            return (
              <blockquote key={i}>
                {b.paragraphs.map((p, j) => (
                  <p key={j}>
                    <Inlines nodes={p} />
                  </p>
                ))}
              </blockquote>
            );
          case "code":
            return (
              <pre key={i} data-lang={b.lang ?? undefined}>
                <code>{b.text}</code>
              </pre>
            );
          case "image":
            // Plain <img>: post images are static repo assets with no known
            // intrinsic size; next/image would demand dimensions the markdown
            // doesn't carry.
            // eslint-disable-next-line @next/next/no-img-element
            return <img key={i} src={b.src} alt={b.alt} loading="lazy" />;
          case "rule":
            return <hr key={i} />;
        }
      })}
    </div>
  );
}
