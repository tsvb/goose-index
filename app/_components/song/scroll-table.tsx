import type { ReactNode } from "react";

export function ScrollTable({ children, swipeHint = "swipe → for more" }: { children: ReactNode; swipeHint?: string }) {
  return (
    <div className="song-scroll">
      <div className="song-scroll-inner">{children}</div>
      <span className="song-scroll-fade" aria-hidden />
      <p className="song-scroll-hint">{swipeHint}</p>
    </div>
  );
}
