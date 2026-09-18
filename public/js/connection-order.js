// connection-order.js
// Reine, DOM-freie Sortierung der Verbindungsliste eines Profils.
// Reihenfolge (Referenz): Eltern → Partner → ehem. Partner → Kinder →
// Geschwister; innerhalb jeder Gruppe nach Geburtsdatum. Testbar.

import { indexGraph, siblingKind } from "./relationship.js";

function year(p) {
  const d = p?.birth_date || p?.birth || null;
  if (!d) return 999999;
  const y = parseInt(String(d).slice(0, 4), 10);
  return Number.isFinite(y) ? y : 999999;
}
function byYear(a, b) { return year(a.person) - year(b.person); }

/**
 * @returns [{ id, person, kind: 'parent'|'partner'|'ex-partner'|'child'|'sibling', former? }]
 *          in fester Referenz-Reihenfolge, je Gruppe nach Geburtsjahr.
 */
export function orderedConnections(people, relations, personId) {
  const g = indexGraph(people, relations);
  const P = g.P;

  const parents = (g.parents.get(personId) || [])
    .map(id => ({ id, person: P.get(id), kind: "parent" })).sort(byYear);

  const partnersAll = (g.partners.get(personId) || []);
  const partners = partnersAll.filter(pt => !pt.former)
    .map(pt => ({ id: pt.id, person: P.get(pt.id), kind: "partner", former: false })).sort(byYear);
  const exPartners = partnersAll.filter(pt => pt.former)
    .map(pt => ({ id: pt.id, person: P.get(pt.id), kind: "ex-partner", former: true })).sort(byYear);

  const children = (g.children.get(personId) || [])
    .map(id => ({ id, person: P.get(id), kind: "child" })).sort(byYear);

  // Geschwister: teilen mindestens einen Elternteil (nicht die Person selbst).
  const sibIds = new Set();
  for (const par of g.parents.get(personId) || []) {
    for (const c of g.children.get(par) || []) if (c !== personId) sibIds.add(c);
  }
  const siblings = [...sibIds]
    .map(id => ({ id, person: P.get(id), kind: "sibling", half: siblingKind(g, personId, id) === "half" }))
    .sort(byYear);

  return [...parents, ...partners, ...exPartners, ...children, ...siblings];
}
