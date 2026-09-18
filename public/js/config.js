
export const CONFIG = Object.freeze({
  family: {
    title: "Digitaler Stammbaum",
    subtitle: "Familie Gossler",
    shortName: "Gossler",
    defaultPersonId: null,
    contactEmail: window.GOSSLER_RUNTIME?.ADMIN_EMAIL || "Familienadministrator",
    privacyVersion: "September 2026"
  },

  supabase: {
    url: window.GOSSLER_RUNTIME?.SUPABASE_URL || "",
    anonKey: window.GOSSLER_RUNTIME?.SUPABASE_ANON_KEY || ""
  },

  guest: {
    enabled: true,
    storageKey: "gossler_guest_session",
    maxSessionHours: 12
  },

  ui: {
    maleColor: "#9dbce6",
    femaleColor: "#e9b1c4",
    neutralColor: "#d2cec5",
    pathColor: "#d8b64b",
    deceasedOpacity: 0.48,
    familySurname: "Goßler",
    alternativeSurname: "Gossler",
    minTreeScale: 0.28,
    maxTreeScale: 2.2
  },

  privacy: {
    hideContactsForGuest: true,
    hidePrivateNotesForGuest: true,
    robotsNoIndex: true
  },

  features: {
    tree: true,
    ring: true,
    generation: true,
    timeline: true,
    relationship: true,
    profiles: true,
    markdownVita: true,
    qr: true,
    qrScanner: true,
    admin: true,
    analyticsCounter: true
  }
});
