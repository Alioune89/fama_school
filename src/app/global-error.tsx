"use client";

// Dernier filet de sécurité (erreur dans le layout racine) : pas de traductions disponibles ici.
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="fr">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#f4f5fa", color: "#1e2433", margin: 0 }}>
        <main style={{ maxWidth: 420, margin: "20vh auto", padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 22 }}>Quelque chose s&apos;est mal passé</h1>
          <p style={{ color: "#667085" }}>L&apos;erreur a été signalée. Réessayez dans un instant.</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{ marginTop: 16, padding: "10px 20px", borderRadius: 999, border: 0, background: "#1570a6", color: "#fff", fontWeight: 600 }}
          >
            Réessayer
          </button>
        </main>
      </body>
    </html>
  );
}
