import type { ReactNode } from "react";
export function FactRibbon({ facts }: { facts: { k: string; v: ReactNode }[] }) {
  return (
    <div className="song-ribbon">
      {facts.map((f, i) => (
        <div className="song-fact" key={i}>
          <div className="song-fact-v">{f.v}</div>
          <div className="song-fact-k">{f.k}</div>
        </div>
      ))}
    </div>
  );
}
