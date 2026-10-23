"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Largeur d'une page A4 en pixels CSS (210 mm). */
const PAGE_WIDTH = 793.7;

/** Réduit les pages A4 du bulletin à la largeur de l'écran (téléphone compris), sans changer leur mise en page. */
export function ScaledSheets({ children }: { children: ReactNode }) {
  const container = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setScale(Math.min(1, (entry?.contentRect.width ?? PAGE_WIDTH) / PAGE_WIDTH)),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={container} className="w-full">
      <div className="space-y-4 print:space-y-0 [&_.rc-page]:shadow-card print:[&_.rc-page]:shadow-none" style={{ zoom: scale }}>
        {children}
      </div>
    </div>
  );
}
