// Les variables NEXT_PUBLIC_ sont injectées au build : elles doivent être lues littéralement.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function getSupabaseEnv() {
  if (!url || !publishableKey) {
    throw new Error(
      "Variables Supabase manquantes : définissez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (voir .env.example).",
    );
  }
  return { url, publishableKey };
}
