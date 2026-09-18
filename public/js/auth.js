
import { getSupabase } from "./supabase-client.js";
import { getMyProfile, redeemFamilyCode, validateGuestCode } from "./api.js";
import { setState, resetState } from "./state.js";
import { CONFIG } from "./config.js";

function guestStorage() {
  try { return JSON.parse(sessionStorage.getItem(CONFIG.guest.storageKey) || "null"); }
  catch { return null; }
}

export async function restoreAccess() {
  const guest = guestStorage();
  if (guest && Date.now() < guest.expiresAt) {
    setState({ access: "guest" });
    return "guest";
  }

  const sb = await getSupabase();
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return "none";

  const profile = await getMyProfile();
  const access = profile?.status !== "approved"
    ? "pending"
    : (profile?.role === "admin" ? "admin" : "member");

  setState({
    session,
    profile,
    access,
    meId: profile?.person_id || null
  });
  return access;
}

export async function signIn(email, password) {
  const sb = await getSupabase();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return restoreAccess();
}

export async function signUp({ email, password, firstName, lastName, birthName, familyCode }) {
  const sb = await getSupabase();
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        birth_name: birthName || null
      }
    }
  });
  if (error) throw error;

  if (familyCode && data.session) {
    await redeemFamilyCode(familyCode);
  }
  return data;
}

export async function requestPasswordReset(email) {
  const sb = await getSupabase();
  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: location.origin + location.pathname + "#reset-password"
  });
  if (error) throw error;
}

export async function updatePassword(password) {
  const sb = await getSupabase();
  const { error } = await sb.auth.updateUser({ password });
  if (error) throw error;
}

export async function enterGuestMode(code) {
  const ok = await validateGuestCode(code);
  if (!ok) throw new Error("Code ungültig oder abgelaufen.");
  sessionStorage.setItem(CONFIG.guest.storageKey, JSON.stringify({
    code,
    expiresAt: Date.now() + CONFIG.guest.maxSessionHours * 3600_000
  }));
  setState({ access: "guest" });
}

export async function signOut() {
  sessionStorage.removeItem(CONFIG.guest.storageKey);
  try {
    const sb = await getSupabase();
    await sb.auth.signOut();
  } catch (_) {}
  resetState();
}
