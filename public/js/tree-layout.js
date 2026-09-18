// tree-layout.js
// Reine, DOM-freie Berechnung des Stammtafel-Layouts v2 (Parität zur
// Petersdorff-Referenz). Testbar mit node --test. Das SVG-Rendering liegt
// in tree.js.
//
// Prinzip:
//  - Einheit (unit) = Blutsverwandter + optionaler Partner (Person 104x40,
//    Partner schmaler darunter, ∞/⚮).
//  - Kinderlose Geschwister werden zu Spalten gestapelt (stack), nur Kinder
//    mit eigenen Nachkommen bekommen eigene Teilbäume.
//  - Konturbasiertes Tidy-Layout: linke/rechte Kontur je Ebene, Teilbäume
//    ruecken zusammen; Eltern mittig ueber erstem/letztem Kind-Slot.
//  - Orthogonale Kanten: Sammelschiene (bus) in der Zeilenluecke, Abgaenge zu
//    den Slots.
//  - Collapse: Einheit haelt ihre Kinder verborgen.

import { indexGraph } from "./relationship.js";

export const UNIT_W = 108;    // Kartenbreite (Person)
export const UNIT_H = 42;     // Kartenhoehe
export const PARTNER_H = 22;  // Partnerzeile darunter
export const H_GAP = 24;      // horizontaler Abstand zwischen Slots
export const V_GAP = 64;      // vertikaler Zeilenabstand (Sammelschiene)
export const ROW_H = UNIT_H + PARTNER_H;
export const ROW_STRIDE = ROW_H + V_GAP;
export const MAX_STACK = 4;   // max. gestapelte kinderlose Geschwister je Spalte

function year(p) {
  const d = p?.birth_date || p?.birth || null;
  if (!d) return 999999;
  const y = parseInt(String(d).slice(0, 4), 10);
  return Number.isFinite(y) ? y : 999999;
}

/**
 * Baut den Einheitenbaum (blutsverwandte Nachkommen ab rootId).
 * @param collapsed Set von IDs, deren Kinder verborgen sind
 * @param bloodIds  optional: Beschraenkung auf einen Blutszweig
 */
export function buildUnitTree(people, relations, rootId, { collapsed = new Set(), bloodIds = null } = {}) {
  const g = indexGraph(people, relations);
  const inBlood = (id) => !bloodIds || bloodIds.has(id);
  const visited = new Set();

  function partnersOf(id) {
    return (g.partners.get(id) || [])
      .filter(pt => !bloodIds || !bloodIds.has(pt.id) || pt.id === id) // Blutspartner hat eigene Einheit
      .map(pt => ({ id: pt.id, person: g.P.get(pt.id), former: !!pt.former }));
  }

  function unit(id) {
    visited.add(id);
    const person = g.P.get(id);
    const kids = (g.children.get(id) || [])
      .filter(inBlood)
      .filter(c => !visited.has(c))
      .sort((a, b) => year(g.P.get(a)) - year(g.P.get(b)));

    // Kinder mit eigenen Nachkommen -> eigene Teilbaeume; kinderlose -> Stack.
    const withDesc = [];
    const leaves = [];
    for (const c of kids) {
      const hasKids = (g.children.get(c) || []).some(inBlood);
      if (hasKids) withDesc.push(c); else leaves.push(c);
    }

    const collapsedHere = collapsed.has(id);
    const children = collapsedHere ? [] : withDesc.map(unit);
    // Kinderlose Geschwister als gestapelte Blaetter (Spalten bis MAX_STACK).
    const stacks = [];
    if (!collapsedHere) {
      for (let i = 0; i < leaves.length; i += MAX_STACK) {
        stacks.push(leaves.slice(i, i + MAX_STACK).map(lid => ({
          id: lid, person: g.P.get(lid), partners: partnersOf(lid)
        })));
      }
    }

    return {
      id, person,
      partners: partnersOf(id),
      children,
      stacks,
      collapsed: collapsedHere,
      childCount: withDesc.length + leaves.length,
      hiddenCount: collapsedHere ? (withDesc.length + leaves.length) : 0
    };
  }

  return unit(rootId);
}

/** Breite eines Stack-Blocks (eine Spalte kinderloser Geschwister). */
function stackWidth() { return UNIT_W; }

/**
 * Konturbasiertes Tidy-Layout. Weist jedem Knoten x (Slot-Mitte) und
 * depth (Ebene) zu. Kinder werden nebeneinander gelegt, Eltern mittig
 * ueber erstem/letztem Kind.
 * @returns { nodes:[{id,person,partners,x,depth,collapsed,childCount,hiddenCount,stacks}],
 *            edges:[{parent,childX,childId,depth}], width, depth }
 */
export function layoutTree(unitRoot) {
  const nodes = [];
  const edges = [];
  let cursor = 0; // laufende x-Position fuer Blaetter/Slots

  function place(node, depth) {
    const stackCount = node.stacks.length;
    const childUnits = node.children;

    if (!childUnits.length && !stackCount) {
      // Reines Blatt.
      node.x = cursor + UNIT_W / 2;
      cursor += UNIT_W + H_GAP;
    } else {
      const childXs = [];
      // 1) Teilbaeume mit Nachkommen platzieren.
      for (const c of childUnits) {
        place(c, depth + 1);
        childXs.push(c.x);
      }
      // 2) Stapel kinderloser Geschwister als schmale Spalten daneben.
      for (const stack of node.stacks) {
        const sx = cursor + stackWidth() / 2;
        stack._x = sx;
        stack._depth = depth + 1;
        cursor += stackWidth() + H_GAP;
        childXs.push(sx);
      }
      // Eltern mittig ueber erstem/letztem Kind-Slot.
      node.x = (Math.min(...childXs) + Math.max(...childXs)) / 2;
    }

    node.depth = depth;
    nodes.push({
      id: node.id, person: node.person, partners: node.partners,
      x: node.x, depth,
      collapsed: node.collapsed, childCount: node.childCount,
      hiddenCount: node.hiddenCount, stacks: node.stacks
    });

    // Kanten zu Kind-Einheiten und Stapeln.
    for (const c of childUnits) {
      edges.push({ parent: node.id, parentX: node.x, childX: c.x, childId: c.id, depth });
    }
    for (const stack of node.stacks) {
      edges.push({ parent: node.id, parentX: node.x, childX: stack._x, stack, depth });
    }
  }

  place(unitRoot, 0);
  const width = Math.max(UNIT_W, cursor - H_GAP);
  const depth = nodes.reduce((m, n) => Math.max(m, n.depth), 0);
  return { nodes, edges, width, depth };
}

/** y-Position (oben) einer Ebene. */
export function rowY(depth) {
  return depth * ROW_STRIDE;
}

/** Bounding-Box des gesamten Layouts (Weltkoordinaten). */
export function layoutBBox(layout) {
  const w = layout.width + UNIT_W;   // Rand
  const h = (layout.depth + 1) * ROW_STRIDE;
  return { x: -UNIT_W / 2, y: 0, w, h };
}

/**
 * Orthogonaler Kantenpfad: von der Elternunterkante ueber eine Sammelschiene
 * in der Zeilenluecke hinunter zum Kind-Slot.
 */
export function edgePath(edge) {
  const py = rowY(edge.depth) + ROW_H;          // Unterkante Eltern
  const cy = rowY(edge.depth + 1);              // Oberkante Kind
  const busY = py + V_GAP / 2;                  // Sammelschiene mittig
  const px = edge.parentX, cx = edge.childX;
  return `M ${px} ${py} V ${busY} H ${cx} V ${cy}`;
}
