"use client";

import type { ReactNode } from "react";
import { SerwistProvider } from "@serwist/turbopack/react";

/** Enregistre le service worker (désactivé en développement pour éviter les caches trompeurs). */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SerwistProvider swUrl="/sw.js" disable={process.env.NODE_ENV === "development"} reloadOnOnline={false}>
      {children}
    </SerwistProvider>
  );
}
