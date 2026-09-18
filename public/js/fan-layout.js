// fan-layout.js
// Reine, DOM-freie Geometrieberechnung für den Nachkommen-Sunburst.
// Testbar mit node --test. Das Rendering (SVG) liegt in fan.js.
//
// Prinzip (Referenz): Wurzel im Zentrum, jede Generation ein Ring, Winkelspanne
// eines Segments proportional zur Zahl seiner Nachkommen-Blätter. Geschwister
// nach Geburtsjahr. Angeheiratete sind keine eigenen Segmente, sondern hängen
// als "∞ Name" am Segment des blutsverwandten Partners (hostOf).

import { indexGraph } from "./relationship.js";

export const RING = 90;      // Radius je Generation
export const SEG_GAP = 0.008; // Winkellücke zwischen Segmenten (rad, am Referenzradius)
const YEAR_UNKNOWN = 999999;

function yearOf(p) {
  const d = p?.birth_date || p?.birth || null;
  if (!d) return YEAR_UNKNOWN;
  const y = parseInt(String(d).slice(0, 4), 10);
  return Number.isFinite(y) ? y : YEAR_UNKNOWN;
}

/**
 * Baut den Nachkommenbaum der Wurzel als verschachtelte Knoten.
 * Angeheiratete Partner werden dem Blutsknoten als `partners` angehängt,
 * NICHT als eigene Kinderknoten.
 */
function buildDescendantTree(g, rootId, bloodIds) {
  const visited = new Set();

  function node(id) {
    visited.add(id);
    const person = g.P.get(id);
    // Kinder nur über parent-Kanten; nach Geburtsjahr sortiert.
    const childIds = (g.children.get(id) || [])
      .filter(c => bloodIds.has(c))
      .slice()
      .sort((a, b) => yearOf(g.P.get(a)) - yearOf(g.P.get(b)));

    const partners = (g.partners.get(id) || []).map(pt => ({
      id: pt.id,
      person: g.P.get(pt.id),
      former: !!pt.former
    }));

    const children = [];
    for (const c of childIds) {
      if (!visited.has(c)) children.push(node(c));
    }
    return { id, person, partners, children };
  }

  return node(rootId);
}

/** Blattgewicht: Zahl der Blätter (Knoten ohne Kinder) im Teilbaum, min. 1. */
export function computeLeafWeight(node) {
  if (!node.children.length) {
    node.leaf = 1;
    return 1;
  }
  let sum = 0;
  for (const c of node.children) sum += computeLeafWeight(c);
  node.leaf = sum;
  return sum;
}

/**
 * Verteilt die Winkelspanne [a0, a1] rekursiv proportional zum Blattgewicht.
 * Schreibt je Knoten { theta0, theta1, mid, generation, radius0, radius1 }.
 * @returns flache Liste aller Segmente.
 */
export function assignAngles(node, a0, a1, gen, out = []) {
  node.theta0 = a0;
  node.theta1 = a1;
  node.mid = (a0 + a1) / 2;
  node.generation = gen;
  node.radius0 = gen * RING;
  node.radius1 = (gen + 1) * RING;
  out.push(node);

  if (node.children.length) {
    const total = node.children.reduce((s, c) => s + (c.leaf || 1), 0);
    let cursor = a0;
    for (const c of node.children) {
      const span = (a1 - a0) * ((c.leaf || 1) / total);
      assignAngles(c, cursor, cursor + span, gen + 1, out);
      cursor += span;
    }
  }
  return out;
}

/**
 * Vollständiges Layout für einen Zweig.
 * @param people   DB-Schema people
 * @param relations DB-Schema relations
 * @param rootId   Wurzel des Zweigs
 * @param bloodIds Set der blutsverwandten IDs (aus family-model)
 * @returns { root, segments, hostOf, maxGen }
 *   segments: [{id, person, generation, theta0, theta1, mid, radius0, radius1, leaf, partners}]
 *   hostOf: Map partnerId -> hostSegmentId (für "∞ Name" im Host-Segment)
 */
export function layoutFan(people, relations, rootId, bloodIds) {
  const g = indexGraph(people, relations);
  if (!bloodIds) {
    // Fallback: alle über parent von rootId erreichbaren als Blut betrachten.
    bloodIds = new Set([rootId]);
    const stack = [rootId];
    while (stack.length) {
      const x = stack.pop();
      for (const c of g.children.get(x) || []) {
        if (!bloodIds.has(c)) { bloodIds.add(c); stack.push(c); }
      }
    }
  }

  const root = buildDescendantTree(g, rootId, bloodIds);
  computeLeafWeight(root);
  const segments = assignAngles(root, -Math.PI / 2, Math.PI * 1.5, 0);

  // hostOf: jeder angeheiratete Partner hängt am Segment seines Blutspartners.
  const hostOf = new Map();
  for (const seg of segments) {
    for (const pt of seg.partners) {
      if (!bloodIds.has(pt.id)) hostOf.set(pt.id, seg.id);
    }
  }

  const maxGen = segments.reduce((m, s) => Math.max(m, s.generation), 0);
  return { root, segments, hostOf, maxGen };
}
