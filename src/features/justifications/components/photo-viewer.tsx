"use client";

import type { ReactNode } from "react";
import { ExternalLink, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Photo d'un justificatif ouverte par-dessus la page (pratique sur téléphone), avec un bouton pour fermer.
 * `children` est le déclencheur : vignette ou lien « Voir la photo ».
 */
export function PhotoViewer({
  url,
  title,
  className,
  children,
}: {
  url: string;
  title: string;
  className?: string;
  children: ReactNode;
}) {
  const t = useTranslations("justifications");
  return (
    <Dialog>
      <DialogTrigger className={cn("cursor-zoom-in", className)}>{children}</DialogTrigger>
      <DialogContent showCloseButton={false} className="gap-3 p-3 sm:max-w-2xl sm:p-4">
        <div className="flex items-center gap-3">
          <DialogTitle className="min-w-0 flex-1 truncate text-base font-semibold">{title}</DialogTitle>
          <DialogClose render={<Button variant="ghost" size="icon-sm" aria-label={t("close")} title={t("close")} />}>
            <X aria-hidden />
          </DialogClose>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- lien temporaire du stockage privé */}
        <img src={url} alt={title} className="max-h-[75dvh] w-full rounded-lg bg-muted object-contain" />
        <div className="flex flex-wrap justify-end gap-2">
          <a href={url} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <ExternalLink aria-hidden />
            {t("openOriginal")}
          </a>
          <DialogClose render={<Button size="sm" />}>{t("close")}</DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
