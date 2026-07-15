import type { ReactNode } from "react";
import { parseBBCode, parseBBCodeInline, type BBNode } from "./bbcode";

const SAFE_HREF = /^https?:\/\//i;

function renderNodes(nodes: BBNode[], keyBase: string): ReactNode[] {
  return nodes.map((n, idx) => {
    const key = `${keyBase}.${idx}`;
    switch (n.kind) {
      case "text":
        return n.text;
      case "br":
        return <br key={key} />;
      case "b":
        return <strong key={key}>{renderNodes(n.children, key)}</strong>;
      case "i":
        return <em key={key}>{renderNodes(n.children, key)}</em>;
      case "u":
        return (
          <span key={key} className="underline">
            {renderNodes(n.children, key)}
          </span>
        );
      case "s":
        return <s key={key}>{renderNodes(n.children, key)}</s>;
      case "url":
        if (!SAFE_HREF.test(n.href))
          return <span key={key}>{renderNodes(n.children, key)}</span>;
        return (
          <a key={key} href={n.href} rel="nofollow ugc" className="break-all underline">
            {renderNodes(n.children, key)}
          </a>
        );
      case "code":
        return (
          <pre key={key} className="my-2 overflow-x-auto border border-line p-2 font-mono text-xs">
            <code>{n.text}</code>
          </pre>
        );
      case "quote":
        return (
          <blockquote key={key} className="my-2 border-l-2 border-line pl-3 text-muted">
            {n.author != null && (
              <p className="mb-1 text-xs font-semibold">{n.author} said:</p>
            )}
            {renderNodes(n.children, key)}
          </blockquote>
        );
    }
  });
}

/** Block-level post body. Never uses dangerouslySetInnerHTML — text is React-escaped. */
export function BBCodeBody({ source }: { source: string }) {
  return <div className="break-words">{renderNodes(parseBBCode(source), "n")}</div>;
}

/** Inline subset for signatures. */
export function BBCodeInline({ source }: { source: string }) {
  return <span className="break-words">{renderNodes(parseBBCodeInline(source), "s")}</span>;
}
