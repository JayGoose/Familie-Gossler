
import { getSupabase } from "./supabase-client.js";
import { canReadContacts } from "./permissions.js";

export async function loadFamily() {
  const sb = await getSupabase();

  // Gastmodus: Daten werden ausschließlich über die sanitizende RPC-Funktion
  // ausgeliefert. Der Code bleibt nur in sessionStorage und wird nicht persistiert.
  let guest = null;
  try {
    guest = JSON.parse(sessionStorage.getItem("gossler_guest_session") || "null");
  } catch (_) {}

  if (guest?.code && Date.now() < guest.expiresAt) {
    const { data, error } = await sb.rpc("guest_family_snapshot", {
      p_code: guest.code
    });
    if (error) throw error;
    return {
      people: data?.people || [],
      relations: data?.relations || []
    };
  }

  const { data: people, error: pErr } = await sb
    .from("people_public")
    .select("*")
    .order("birth_date", { ascending: true, nullsFirst: false });
  if (pErr) throw pErr;

  const { data: relations, error: rErr } = await sb
    .from("relations")
    .select("*");
  if (rErr) throw rErr;

  if (canReadContacts()) {
    const { data: contacts, error: cErr } = await sb
      .from("people_contacts")
      .select("person_id,email,phone");
    if (cErr) throw cErr;
    const byId = Object.fromEntries((contacts || []).map(x => [x.person_id, x]));
    for (const person of people || []) {
      Object.assign(person, byId[person.id] || {});
    }
  }
  return { people: people || [], relations: relations || [] };
}

export async function getMyProfile() {
  const sb = await getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  const { data, error } = await sb
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function savePerson(person) {
  const sb = await getSupabase();
  const payload = { ...person };
  delete payload.email;
  delete payload.phone;

  const { data, error } = await sb
    .from("people")
    .upsert(payload)
    .select()
    .single();
  if (error) throw error;

  if (person.email !== undefined || person.phone !== undefined) {
    const { error: cErr } = await sb.from("people_contacts").upsert({
      person_id: data.id,
      email: person.email || null,
      phone: person.phone || null
    });
    if (cErr) throw cErr;
  }
  return data;
}

export async function saveVita(personId, markdown) {
  const sb = await getSupabase();
  const { error } = await sb
    .from("people")
    .update({ vita_markdown: markdown })
    .eq("id", personId);
  if (error) throw error;
}

export async function addRelation(personA, personB, relationType, former = false) {
  const sb = await getSupabase();
  const { data, error } = await sb
    .from("relations")
    .insert({
      person_a: personA,
      person_b: personB,
      relation_type: relationType,
      former
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRelation(id) {
  const sb = await getSupabase();
  const { error } = await sb.from("relations").delete().eq("id", id);
  if (error) throw error;
}

export async function deletePlaceholder(personId) {
  const sb = await getSupabase();
  const { error } = await sb.from("people").delete().eq("id", personId);
  if (error) throw error;
}

export async function setProfilePerson(personId) {
  const sb = await getSupabase();
  const { data, error } = await sb.rpc("link_my_profile_to_person", {
    p_person_id: personId
  });
  if (error) throw error;
  return data;
}

export async function createMyPerson(payload) {
  const sb = await getSupabase();
  const { data, error } = await sb.rpc("create_and_link_my_person", {
    p_first_name: payload.first_name,
    p_last_name: payload.last_name,
    p_birth_name: payload.birth_name || null,
    p_gender: payload.gender || null,
    p_branch: payload.branch || "Gossler"
  });
  if (error) throw error;
  return data;
}

// Einfacher, stabiler Client-Fingerprint fuer die serverseitige Ratenbegrenzung
// der Familientag-Code-Pruefung. Kein Tracking, nur ein zufaelliger, lokal
// gespeicherter Wert je Browser.
function clientFingerprint() {
  try {
    let fp = localStorage.getItem("gossler_fp");
    if (!fp) {
      fp = (crypto.randomUUID?.() || String(Math.random())).slice(0, 36);
      localStorage.setItem("gossler_fp", fp);
    }
    return fp;
  } catch (_) {
    return "anon";
  }
}

export async function validateGuestCode(code) {
  const sb = await getSupabase();
  // Rate-limitierte Variante (008_security_hardening). Faellt bei fehlender
  // Funktion NICHT still auf die ungeschuetzte zurueck.
  const { data, error } = await sb.rpc("validate_family_day_code_rl", {
    p_code: code,
    p_fingerprint: clientFingerprint()
  });
  if (error) throw error;
  return data === true;
}

export async function redeemFamilyCode(code) {
  const sb = await getSupabase();
  const { data, error } = await sb.rpc("redeem_family_day_code_rl", {
    p_code: code,
    p_fingerprint: clientFingerprint()
  });
  if (error) throw error;
  return data;
}

export async function trackUsage(eventName = "view") {
  try {
    const sb = await getSupabase();
    await sb.rpc("track_usage", { p_event: eventName });
  } catch (_) {}
}

export async function adminLoadUsers() {
  const sb = await getSupabase();
  const { data, error } = await sb.rpc("admin_list_profiles");
  if (error) throw error;
  return data || [];
}

export async function adminSetApproval(userId, status, role = "member", personId = null) {
  const sb = await getSupabase();
  const { data, error } = await sb.rpc("admin_set_profile_status", {
    p_user_id: userId,
    p_status: status,
    p_role: role,
    p_person_id: personId
  });
  if (error) throw error;
  return data;
}

export async function adminGetFamilyCode() {
  const sb = await getSupabase();
  const { data, error } = await sb.rpc("admin_get_family_day_code");
  if (error) throw error;
  return data?.[0] || null;
}

export async function adminSetFamilyCode(code, validUntil) {
  const sb = await getSupabase();
  const { data, error } = await sb.rpc("admin_set_family_day_code", {
    p_code: code || null,
    p_valid_until: validUntil || null
  });
  if (error) throw error;
  return data;
}

export async function adminUsage14Days() {
  const sb = await getSupabase();
  const { data, error } = await sb.rpc("admin_usage_last_14_days");
  if (error) throw error;
  return data || [];
}


export async function auditEvent(action, entityType = null, entityId = null, metadata = {}) {
  try {
    const sb = await getSupabase();
    await sb.rpc("audit_event", {
      p_action: action,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_metadata: metadata
    });
  } catch (_) {}
}

export async function adminExportFamily() {
  const sb = await getSupabase();
  const { data, error } = await sb.rpc("admin_export_family");
  if (error) throw error;
  return data;
}

export async function uploadProfilePicture(personId,file){const sb=await getSupabase();const ext=(file.name.split('.').pop()||'jpg').toLowerCase();const safe=['jpg','jpeg','png','webp'].includes(ext)?ext:'jpg';const path=`${personId}/${crypto.randomUUID()}.${safe}`;let {error}=await sb.storage.from('profile-pictures').upload(path,file,{contentType:file.type||'image/jpeg'});if(error)throw error;({error}=await sb.from('people').update({photo_path:path}).eq('id',personId));if(error)throw error;return path;}
export async function removeProfilePicture(personId,path){const sb=await getSupabase();if(path)await sb.storage.from('profile-pictures').remove([path]);const {error}=await sb.from('people').update({photo_path:null}).eq('id',personId);if(error)throw error;}
export async function signedProfilePictureUrl(path){if(!path)return null;const sb=await getSupabase();const {data,error}=await sb.storage.from('profile-pictures').createSignedUrl(path,3600);if(error)return null;return data?.signedUrl||null;}
export async function adminSendApprovalEmail(userId){const sb=await getSupabase();const {data,error}=await sb.functions.invoke('approval-email',{body:{userId}});if(error)throw error;return data;}
