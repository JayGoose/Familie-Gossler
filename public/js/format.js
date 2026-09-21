// format.js — zentrale, anzeigeseitige Formatierung (keine Datenänderung).
// Wandelt gespeicherte Datumswerte in menschenlesbare deutsche Form.
// Regel: unvollständige/jahresgenaue Werte bleiben jahresgenau (Genealogie-Invariante:
// nichts erfinden). Nur vollständige ISO-Daten werden zu "12. April 1938".

const MONATE = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember"
];

/**
 * @param {string|null} value  gespeicherter Wert, z.B. "1938-04-12", "1938", "1969" oder ""
 * @param {string} fallback    Anzeige bei fehlendem Wert (Default "—")
 * @returns {string}
 */
export function formatDate(value, fallback = "—") {
  if (!value) return fallback;
  const s = String(value).trim();
  // Volles ISO-Datum JJJJ-MM-TT
  const full = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (full) {
    const [, y, m, d] = full;
    const mi = parseInt(m, 10) - 1;
    const day = parseInt(d, 10);
    if (mi >= 0 && mi < 12 && day >= 1 && day <= 31) {
      return `${day}. ${MONATE[mi]} ${y}`;
    }
  }
  // Jahr + Monat JJJJ-MM
  const ym = s.match(/^(\d{4})-(\d{2})$/);
  if (ym) {
    const mi = parseInt(ym[2], 10) - 1;
    if (mi >= 0 && mi < 12) return `${MONATE[mi]} ${ym[1]}`;
  }
  // Nur Jahr JJJJ (jahresgenau/unvollständig) — unverändert lassen.
  if (/^\d{4}$/.test(s)) return s;
  // Unbekanntes Format: unverändert zurückgeben (nichts erfinden).
  return s;
}
