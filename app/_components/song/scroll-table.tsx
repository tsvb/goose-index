"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Pin+scroll wrapper for dense tables. The hint and edge fade only render once
// the client measures real overflow — no "swipe →" promise on tables that fit —
// and the hint sits above the table so it's read before the columns clip.
export function ScrollTable({ children, swipeHint = "swipe → for more" }: { children: ReactNode; swipeHint?: string }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);
  const [coarse, setCoarse] = useState(true);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    setCoarse(window.matchMedia("(any-pointer: coarse)").matches);
    const measure = () => setOverflows(el.scrollWidth > el.clientWidth + 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <>
      {overflows && <p className="song-scroll-hint">{coarse ? swipeHint : swipeHint.replace("swipe", "scroll")}</p>}
      <div className="song-scroll">
        <div className="song-scroll-inner" ref={innerRef}>{children}</div>
        {overflows && <span className="song-scroll-fade" aria-hidden />}
      </div>
    </>
  );
}
