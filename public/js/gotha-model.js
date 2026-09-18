// gotha-model.js
// Reine, DOM-freie Struktur fuer das Gotha-Verzeichnis (eingerueckte, klappbare
// Nachkommenliste). Testbar mit node --test. Das Rendering liegt in gotha.js.
//
// Prinzip (Referenz): verschachteltes <ul>, je Person eine Zeile, roemische
// Generationsziffer (I = Stammvater/Fokus-Wurzel). Partner als "; ∞ Name (* Jahr)"
// bzw. "⚮" fuer ehemalige. Geschwister nach Geburtsjahr. Gleiche Datenquelle +
// aktiver Zweig wie Faecher/Tree (buildFamiliesFrom).

import { indexGraph } from "./relationship.js";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV"];
export function roman(gen) { return ROMAN[gen] || String(gen + 1); }

function year(p) {
  const d = p?.birth_date || p?.birth || null;
  if (!d) return null;
  const y = parseInt(String(d).slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}
function sortYear(p) { return year(p) ?? 999999; }
function nm(p) { return [p?.first_name, p?.last_name].filter(Boolean).join(" ") || p?.name || ""; }

/**
 * Baut die verschachtelte Gotha-Struktur ab einer Fokus-Wurzel.
 * @returns { id, person, gen, roman, partners:[{id,person,former,symbol,label}],
 *            years, children:[...] }
 */
export function buildGotha(people, relations, rootId, { bloodIds = null } = {}) {
  const g = indexGraph(people, relations);
  const inBlood = (id) => !bloodIds || bloodIds.has(id);
  const visited = new Set();

  function partnerEntry(pt) {
    const person = g.P.get(pt.id);
    const y = year(person);
    const symbol = pt.former ? "\u26AE" : "\u221E"; // ⚮ / ∞
    const label = `${symbol} ${nm(person)}${y != null ? ` (* ${y})` : ""}`;
    return { id: pt.id, person, former: !!pt.former, symbol, label };
  }

  function node(id, gen) {
    visited.add(id);
    const person = g.P.get(id);
    const partners = (g.partners.get(id) || [])
      // Blutspartner erscheinen als eigene Zeile in ihrer Linie; nur
      // Angeheiratete werden hier als Partner-Notation gefuehrt.
      .filter(pt => !bloodIds || !bloodIds.has(pt.id))
      .map(partnerEntry);

    const kidIds = (g.children.get(id) || [])
      .filter(inBlood).filter(c => !visited.has(c))
      .sort((a, b) => sortYear(g.P.get(a)) - sortYear(g.P.get(b)));

    const b = year(person), d = (person?.death_date || person?.death) ?
      parseInt(String(person.death_date || person.death).slice(0, 4), 10) : null;
    const years = b == null && d == null ? "" : `* ${b ?? "?"}${d != null ? ` \u2020 ${d}` : ""}`;

    return {
      id, person, gen, roman: roman(gen),
      partners, years,
      children: kidIds.map(c => node(c, gen + 1))
    };
  }

  return node(rootId, 0);
}

/** Flache Liste (fuer Tests / scrollTo): jede Zeile mit gen + Pfad zur Wurzel. */
export function flattenGotha(root) {
  const out = [];
  (function walk(n, path) {
    const p = [...path, n.id];
    out.push({ id: n.id, gen: n.gen, ancestors: path });
    for (const c of n.children) walk(c, p);
  })(root, []);
  return out;
}

/** Vorfahrenkette einer Person (fuer scrollTo: aufklappen). */
export function ancestorsOf(root, id) {
  let found = null;
  (function walk(n, path) {
    if (found) return;
    if (n.id === id) { found = path; return; }
    for (const c of n.children) walk(c, [...path, n.id]);
  })(root, []);
  return found;
}
