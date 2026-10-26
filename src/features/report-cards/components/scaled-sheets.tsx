"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Largeur d'une page A4 en pixels CSS (210 mm). */
const A4_WIDTH = 793.7;

/**
 * Réduit des pages imprimables (bulletin A4, reçu A5 : `pageWidth`) à la largeur de l'écran,
 * téléphone compris, sans changer leur mise en page.
 */
export function ScaledSheets({ children, pageWidth = A4_WIDTH }: { children: ReactNode; pageWidth?: number }) {
  const container = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setScale(Math.min(1, (entry?.contentRect.width ?? pageWidth) / pageWidth)));
    observer.observe(element);
    return () => observer.disconnect();
  }, [pageWidth]);

  return (
    <div ref={container} className="w-full">
      <div
        className="space-y-4 print:space-y-0 [&_.rc-page]:shadow-card print:[&_.rc-page]:shadow-none [&_.rr-page]:shadow-card print:[&_.rr-page]:shadow-none"
        style={{ zoom: scale }}
      >
        {children}
      </div>
    </div>
  );
}
