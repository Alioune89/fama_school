import { notFound } from "next/navigation";

// Toute URL inconnue sous une langue affiche la page 404 traduite.
export default function CatchAllPage() {
  notFound();
}
