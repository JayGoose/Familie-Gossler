// family-model.js
// Geteiltes, graphbasiertes Familienmodell für Fächer, Stammtafel und Gotha.
// Erwartet das kanonische DB-Schema:
//   people:    [{ id, gender, birth_date?, last_name?, ... }]
//   relations: [{ person_a, person_b, relation_type: 'parent'|'partner', former? }]
// Zweige werden aus den Beziehungen abgeleitet (kein DB-Feld), analog zur Referenz.

import { indexGraph } from "./relationship.js";

const YEAR_UNKNOWN = 999999;

function yearOf(person) {
  const d = person?.birth_date || person?.birth || null;
  if (!d) return YEAR_UNKNOWN;
  const y = parseInt(String(d).slice(0, 4), 10);
  return Number.isFinite(y) ? y : YEAR_UNKNOWN;
}

// Alle über parent-Kanten erreichbaren Nachkommen einer Wurzel (inkl. Wurzel).
function descendantsOf(g, rootId) {
  const seen = new Set([rootId]);
  const stack = [rootId];
  while (stack.length) {
    const x = stack.pop();
    for (const c of g.children.get(x) || []) {
      if (!seen.has(c)) { seen.add(c); stack.push(c); }
    }
  }
  return seen;
}

// Ist eine Person "eingeheiratet"? Referenz: hat keine erfassten Eltern, aber
// einen Partner, der Eltern hat (also in eine dokumentierte Linie eingeheiratet).
function isMarriedIn(g, id) {
  const hasParents = (g.parents.get(id) || []).length > 0;
  if (hasParents) return false;
  for (const p of g.partners.get(id) || []) {
    if ((g.parents.get(p.id) || []).length > 0) return true;
  }
  return false;
}

/**
 * Erkennt Familienzweige. Eine Wurzel ist eine elternlose Person mit Kindern,
 * die nicht in eine dokumentierte Linie eingeheiratet ist. Ein Stammelternpaar
 * zählt als eine Familie; der ältere Partner wird Wurzel.
 * @returns {{ id, rootId, memberIds:Set, size:number }[]} nach Größe absteigend,
 *          bei Gleichstand nach Wurzel-Geburtsjahr aufsteigend.
 */
export function computeFamilies(people, relations) {
  const g = indexGraph(people, relations);
  const byId = g.P;

  const rootCandidates = [];
  for (const p of people) {
    const noParents = (g.parents.get(p.id) || []).length === 0;
    const hasChildren = (g.children.get(p.id) || []).length > 0;
    if (noParents && hasChildren && !isMarriedIn(g, p.id)) {
      rootCandidates.push(p.id);
    }
  }

  // Stammelternpaare zusammenfassen: sind zwei Wurzelkandidaten Partner, wird
  // nur der ältere (kleineres Geburtsjahr) als Wurzel geführt.
  const candidateSet = new Set(rootCandidates);
  const suppressed = new Set();
  for (const id of rootCandidates) {
    if (suppressed.has(id)) continue;
    for (const partner of g.partners.get(id) || []) {
      if (candidateSet.has(partner.id) && !suppressed.has(partner.id)) {
        const a = byId.get(id), b = byId.get(partner.id);
        // Der jüngere Partner wird unterdrückt.
        if (yearOf(a) <= yearOf(b)) suppressed.add(partner.id);
        else { suppressed.add(id); break; }
      }
    }
  }

  const roots = rootCandidates.filter(id => !suppressed.has(id));

  const families = roots.map(rootId => {
    // Blutsverwandte = über parent-Kanten von der Wurzel erreichbar.
    const bloodIds = descendantsOf(g, rootId);
    const memberIds = new Set(bloodIds);
    // Partner der Blutsverwandten gehören zur Familie (als angeheiratete Hosts).
    for (const m of [...bloodIds]) {
      for (const partner of g.partners.get(m) || []) memberIds.add(partner.id);
    }
    return { id: rootId, rootId, bloodIds, memberIds, size: memberIds.size };
  });

  families.sort((x, y) => {
    if (y.size !== x.size) return y.size - x.size;
    return yearOf(byId.get(x.rootId)) - yearOf(byId.get(y.rootId));
  });
  return families;
}

/**
 * Liefert die Teilmenge (people + relations) eines Zweigs.
 */
export function familySubset(people, relations, family) {
  if (!family) return { people: [], relations: [] };
  const ids = family.memberIds;
  const subPeople = people.filter(p => ids.has(p.id));
  const subRelations = relations.filter(r => ids.has(r.person_a) && ids.has(r.person_b));
  return { people: subPeople, relations: subRelations };
}

/**
 * Findet den Zweig, zu dem eine Person gehört (für „Im Stammbaum zeigen").
 * Bevorzugt den GEBURTSZWEIG (Blutsverwandtschaft) vor dem Heiratszweig,
 * wie in der Referenz (familyInfo nennt den Geburtszweig).
 * @returns family | null
 */
export function ensureFamilyFor(families, personId) {
  return families.find(f => f.bloodIds.has(personId))
      || families.find(f => f.memberIds.has(personId))
      || null;
}

/**
 * Personen, die in KEINER Familie über eine Wurzel erreichbar sind (Waisen).
 */
export function orphans(people, families) {
  const covered = new Set();
  for (const f of families) for (const id of f.memberIds) covered.add(id);
  return people.filter(p => !covered.has(p.id)).map(p => p.id);
}

// --- Aktiver Zweig, app-weit, in localStorage gemerkt --------------------
const STORAGE_KEY = "gossler_family";

export function loadPreferredFamilyId() {
  try { return localStorage.getItem(STORAGE_KEY) || null; } catch (_) { return null; }
}

export function savePreferredFamilyId(id) {
  try { if (id) localStorage.setItem(STORAGE_KEY, id); } catch (_) {}
}

/**
 * Wählt den aktiven Zweig: bevorzugt den gemerkten, sonst den größten.
 */
export function pickActiveFamily(families, preferredId = loadPreferredFamilyId()) {
  if (!families.length) return null;
  if (preferredId) {
    const found = families.find(f => f.id === preferredId);
    if (found) return found;
  }
  return families[0];
}

// --- Default-Einstieg (Fokus-Wurzel) -------------------------------------
// Johannes-Feedback #3: Der Faecher soll standardmaessig an einer breit
// verzweigten Person einsteigen (Wilhelm Goßler *1866), NICHT an der duennen
// fruehen Linie Claus->Wilhelm (je Generation nur 1 Person). Die fruehe Linie
// bleibt im Datenbestand und ist ueber den Zweig-/Fokusschalter erreichbar.
// Die Fokus-Wurzel ist eine ANSICHTS-Entscheidung; sie aendert die Daten nicht.
export const DEFAULT_FOCUS_ROOT_ID = "wilhelm1866";
const FOCUS_STORAGE_KEY = "gossler_focus";

/**
 * Liefert die Fokus-Wurzel fuer einen Zweig: die Person, ab der der Faecher
 * gezeichnet wird. Bevorzugt (1) eine gemerkte Auswahl, (2) den globalen
 * Default (falls Blutsmitglied dieses Zweigs), (3) die eigentliche Zweigwurzel.
 * @param family      Familie aus computeFamilies
 * @param preferredId optionale explizite Fokusperson
 */
export function focusRootFor(family, preferredId = loadFocusRootId()) {
  if (!family) return null;
  if (preferredId && family.bloodIds.has(preferredId)) return preferredId;
  if (family.bloodIds.has(DEFAULT_FOCUS_ROOT_ID)) return DEFAULT_FOCUS_ROOT_ID;
  return family.rootId;
}

export function loadFocusRootId() {
  try { return localStorage.getItem(FOCUS_STORAGE_KEY) || null; } catch (_) { return null; }
}
export function saveFocusRootId(id) {
  try { if (id) localStorage.setItem(FOCUS_STORAGE_KEY, id); } catch (_) {}
}

/**
 * Blutsverwandte Nachkommen AB einer Fokus-Wurzel (inkl. ihr selbst),
 * beschraenkt auf die Blutsverwandten des Zweigs. Fuer den Fächer, damit
 * die duenne obere Linie ausgeblendet werden kann, ohne Daten zu verlieren.
 */
export function bloodSubtreeFrom(people, relations, family, focusId) {
  const g = indexGraph(people, relations);
  const start = focusId && family?.bloodIds.has(focusId) ? focusId : family?.rootId;
  const seen = new Set([start]);
  const stack = [start];
  while (stack.length) {
    const x = stack.pop();
    for (const c of g.children.get(x) || []) {
      if (family.bloodIds.has(c) && !seen.has(c)) { seen.add(c); stack.push(c); }
    }
  }
  return seen;
}
