
import { CONFIG } from "./config.js";

let client = null;

export async function getSupabase() {
  if (client) return client;

  if (!window.supabase?.createClient) {
    throw new Error("Supabase-Bibliothek nicht geladen.");
  }
  if (CONFIG.supabase.url.includes("HIER_EINTRAGEN")) {
    throw new Error("Supabase ist noch nicht konfiguriert. Siehe public/js/config.js.");
  }

  client = window.supabase.createClient(
    CONFIG.supabase.url,
    CONFIG.supabase.anonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );
  return client;
}
