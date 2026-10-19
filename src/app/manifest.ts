import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Fama School",
    short_name: "Fama School",
    description: "Notes, bulletins, présences et paiements avec reçus : l'école, les professeurs et les parents reliés.",
    lang: "fr",
    dir: "ltr",
    start_url: "/choisir-espace",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f5fa",
    theme_color: "#1570a6",
    categories: ["education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
