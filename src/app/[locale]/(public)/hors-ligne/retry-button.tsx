"use client";

import { Button } from "@/components/ui/button";

export function RetryButton({ label }: { label: string }) {
  return (
    <Button size="touch" onClick={() => window.location.reload()}>
      {label}
    </Button>
  );
}
