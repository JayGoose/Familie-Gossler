// tree.js — Stammtafel v2 (reines SVG, Parität zur Petersdorff-Referenz).
// Ersetzt die alte HTML-Grid-Ansicht. Layout-Mathematik liegt testbar in
// tree-layout.js; hier: SVG-Rendering, Pan/Zoom, Semantic Zoom, Minimap,
// Collapse, Highlight + fitToHighlight, Generationsbänder, orthogonale Kanten.

import { CONFIG } from "./config.js";
import { indexGraph, shortestPath } from "./relationship.js";
import {
  buildUnitTree, layoutTree, rowY, layoutBBox, edgePath,
  UNIT_W, UNIT_H, PARTNER_H, ROW_H, ROW_STRIDE
} from "./tree-layout.js";

const NS = "http://www.w3.org/2000/svg";
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

const S = {
  container: null, svg: null, gWorld: null, minimap: null,
  people: [], relations: [], bloodIds: null,
  rootId: null, meId: null,
  collapsed: new Set(),
  layout: null, bbox: null,
  vb: null, size: { w: 1000, h: 700 },
  onNodeTap: null, onBackgroundTap: null,
  hlPath: null
};

function el(name, attrs = {}) {
  const n = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
}
function year(p) { return p?.birth_date ? String(p.birth_date).slice(0, 4) : ""; }
function dyear(p) { return p?.death_date ? String(p.death_date).slice(0, 4) : ""; }
function nm(p) { return [p?.first_name, p?.last_name].filter(Boolean).join(" ") || p?.name || ""; }
function firstn(p) { return (p?.first_name || p?.name || "").split(" ")[0] || ""; }

// roots() bleibt fuer app.js erhalten.
export function roots(people, relations) {
  const g = indexGraph(people, relations);
  return people.filter(p => (g.parents.get(p.id) || []).length === 0);
}

// --- Public API -----------------------------------------------------------
export function init(container, { onNodeTap, onBackgroundTap, meId } = {}) {
  S.container = container;
  S.onNodeTap = onNodeTap || null;
  S.onBackgroundTap = onBackgroundTap || null;
  S.meId = meId || null;
}
export function setData(people, relations, bloodIds = null) {
  S.people = people || []; S.relations = relations || []; S.bloodIds = bloodIds;
}
export function setCurrentUser(id) { S.meId = id; }
export function setRoot(id) { S.rootId = id; }

export function collapse(id) {
  if (S.collapsed.has(id)) S.collapsed.delete(id); else S.collapsed.add(id);
  render();
}
export function getZoom() { return S.vb ? S.size.w / S.vb.w : 1; }
export function getBBox() { return S.bbox; }

export function render(container = S.container, onPerson) {
  if (container && container !== S.container) S.container = container;
  if (onPerson && !S.onNodeTap) S.onNodeTap = onPerson;
  const c = S.container;
  if (!c) return;

  const rootId = S.rootId || roots(S.people, S.relations)[0]?.id || S.people[0]?.id;
  if (!rootId) { c.innerHTML = `<div class="empty">Noch keine Personen vorhanden.</div>`; return; }
  S.rootId = rootId;

  const unitRoot = buildUnitTree(S.people, S.relations, rootId, {
    collapsed: S.collapsed, bloodIds: S.bloodIds
  });
  const layout = layoutTree(unitRoot);
  S.layout = layout;
  S.bbox = layoutBBox(layout);
  if (!S.vb) S.vb = { ...S.bbox };

  const wrap = el("svg", {
    class: "tree2-svg", role: "img", "aria-label": "Stammtafel",
    viewBox: `${S.vb.x} ${S.vb.y} ${S.vb.w} ${S.vb.h}`,
    preserveAspectRatio: "xMidYMid meet"
  });
  const world = el("g", { class: "tree2-world" });
  wrap.appendChild(world);

  // Generationsbänder + römische Labels.
  const bandW = S.bbox.w + UNIT_W * 2;
  for (let d = 0; d <= layout.depth; d++) {
    world.appendChild(el("rect", {
      class: "tree2-band" + (d % 2 ? " alt" : ""),
      x: S.bbox.x - UNIT_W, y: rowY(d) - 8, width: bandW, height: ROW_H + 16
    }));
    const t = el("text", {
      class: "tree2-genlabel", x: S.bbox.x - UNIT_W + 6, y: rowY(d) + 16
    });
    t.textContent = ROMAN[d] || String(d + 1);
    world.appendChild(t);
  }

  // Kanten (orthogonal, unter den Knoten).
  const hl = new Set(S.hlPath || []);
  for (const e of layout.edges) {
    const isHl = hl.has(e.parent) && (e.childId ? hl.has(e.childId) : false);
    world.appendChild(el("path", { class: "tree2-edge" + (isHl ? " hl" : ""), d: edgePath(e) }));
  }

  // Knoten-Einheiten + Stapel.
  const zoom = getZoom();
  for (const n of layout.nodes) renderUnit(world, n, hl, zoom);

  c.innerHTML = "";
  c.appendChild(wrap);
  S.svg = wrap; S.gWorld = world;

  bindInteractions(wrap);
  buildMinimap(c);
}

function renderUnit(world, n, hl, zoom) {
  const p = n.person;
  const x = n.x - UNIT_W / 2, y = rowY(n.depth);
  const isMe = S.meId === n.id;
  const inHl = hl.has(n.id);
  const dimmed = hl.size > 0 && !inHl;
  const dead = !!(p?.death_date || p?.death);
  const g = el("g", {
    class: "tree2-unit " + (p?.gender || "u")
      + (dead ? " dead" : "") + (isMe ? " me" : "")
      + (inHl ? " tree-hl" : "") + (dimmed ? " tree-dim" : ""),
    "data-id": n.id, tabindex: "0", role: "button", "aria-label": nm(p)
  });

  g.appendChild(el("rect", { class: "card", x, y, width: UNIT_W, height: UNIT_H, rx: 8 }));

  // Semantic Zoom: fern nur Vorname, mittel +Jahre, nah voller Name.
  const nameText = zoom < 0.55 ? firstn(p) : nm(p);
  const t1 = el("text", { class: "pname", x: n.x, y: y + 17, "text-anchor": "middle" });
  t1.textContent = fit(nameText, UNIT_W - 8);
  g.appendChild(t1);
  if (zoom >= 0.55) {
    const yy = year(p) + (dyear(p) ? " † " + dyear(p) : "");
    const t2 = el("text", { class: "pyears", x: n.x, y: y + 32, "text-anchor": "middle" });
    t2.textContent = yy ? "✶ " + yy : "";
    g.appendChild(t2);
  }

  // Partnerzeile.
  let py = y + UNIT_H;
  for (const pt of (n.partners || []).slice(0, 1)) {
    g.appendChild(el("rect", { class: "partner", x: x + 8, y: py, width: UNIT_W - 16, height: PARTNER_H, rx: 5 }));
    const tp = el("text", {
      class: "ptname", x: n.x, y: py + 15, "text-anchor": "middle",
      "data-id": pt.id, role: "button", "aria-label": nm(pt.person) + " (Partner)"
    });
    tp.textContent = fit((pt.former ? "⚮ " : "∞ ") + nm(pt.person), UNIT_W - 20);
    g.appendChild(tp);
  }

  // Gestapelte kinderlose Geschwister als schmale Kartenstapel.
  for (const stack of n.stacks || []) {
    for (let i = 0; i < stack.length; i++) {
      const s = stack[i];
      const sx = stack._x - UNIT_W / 2, sy = rowY(n.depth + 1) + i * (UNIT_H + 4);
      const sg = el("g", {
        class: "tree2-unit " + (s.person?.gender || "u") + (S.meId === s.id ? " me" : ""),
        "data-id": s.id, tabindex: "0", role: "button", "aria-label": nm(s.person)
      });
      sg.appendChild(el("rect", { class: "card tree2-stack", x: sx, y: sy, width: UNIT_W, height: UNIT_H - 6, rx: 6 }));
      const st = el("text", { class: "pname", x: stack._x, y: sy + 16, "text-anchor": "middle" });
      st.textContent = fit(zoom < 0.55 ? firstn(s.person) : nm(s.person), UNIT_W - 8);
      sg.appendChild(st);
      world.appendChild(sg);
    }
  }

  // Collapse-Chip unter Einheiten mit Kindern.
  if (n.childCount > 0) {
    const chipY = py + PARTNER_H + 2;
    const chip = el("g", { class: "tree2-collapse", "data-collapse": n.id, tabindex: "0", role: "button",
      "aria-label": n.collapsed ? "Nachkommen einblenden" : "Nachkommen ausblenden" });
    chip.appendChild(el("rect", { x: n.x - 14, y: chipY, width: 28, height: 16, rx: 8 }));
    const ct = el("text", { x: n.x, y: chipY + 12, "text-anchor": "middle" });
    ct.textContent = n.collapsed ? "+" + n.hiddenCount : "−";
    chip.appendChild(ct);
    g.appendChild(chip);
  }

  world.appendChild(g);
}

function fit(text, maxPx, fontPx = 12) {
  if (!text) return "";
  const maxChars = Math.max(1, Math.floor(maxPx / (fontPx * 0.58)));
  return text.length <= maxChars ? text : text.slice(0, maxChars - 1) + "…";
}

// --- Interaktion (Pan/Zoom) -----------------------------------------------
function bindInteractions(svg) {
  svg.addEventListener("click", (e) => {
    const collapse = e.target.closest("[data-collapse]");
    if (collapse) { e.stopPropagation(); return collapseNode(collapse.getAttribute("data-collapse")); }
    const t = e.target.closest("[data-id]");
    if (t) { if (S.onNodeTap) S.onNodeTap(t.getAttribute("data-id")); return; }
    if (S.onBackgroundTap) S.onBackgroundTap();
  });
  svg.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const collapse = e.target.closest?.("[data-collapse]");
    if (collapse) { e.preventDefault(); return collapseNode(collapse.getAttribute("data-collapse")); }
    const t = e.target.closest?.("[data-id]");
    if (t && S.onNodeTap) { e.preventDefault(); S.onNodeTap(t.getAttribute("data-id")); }
  });

  svg.addEventListener("wheel", (e) => {
    e.preventDefault();
    const [wx, wy] = toWorld(svg, e.clientX, e.clientY);
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    zoomAt(wx, wy, factor);
  }, { passive: false });

  let drag = false, lx = 0, ly = 0;
  svg.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".tree2-minimap")) return;
    drag = true; lx = e.clientX; ly = e.clientY; svg.setPointerCapture?.(e.pointerId);
  });
  svg.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const k = S.vb.w / svg.clientWidth;
    S.vb.x -= (e.clientX - lx) * k; S.vb.y -= (e.clientY - ly) * k;
    lx = e.clientX; ly = e.clientY; applyVB();
  });
  const end = (e) => { drag = false; svg.releasePointerCapture?.(e.pointerId); };
  svg.addEventListener("pointerup", end);
  svg.addEventListener("pointercancel", end);
}

function collapseNode(id) { collapse(id); }

function toWorld(svg, cx, cy) {
  const r = svg.getBoundingClientRect();
  return [S.vb.x + ((cx - r.left) / r.width) * S.vb.w, S.vb.y + ((cy - r.top) / r.height) * S.vb.h];
}
function zoomAt(wx, wy, factor) {
  const min = CONFIG.ui.minTreeScale ?? 0.28, max = CONFIG.ui.maxTreeScale ?? 2.2;
  const cur = getZoom(); let next = Math.max(min, Math.min(max, cur * factor));
  const rf = next / cur;
  const nw = S.vb.w / rf, nh = S.vb.h / rf;
  const tx = (wx - S.vb.x) / S.vb.w, ty = (wy - S.vb.y) / S.vb.h;
  S.vb = { x: wx - tx * nw, y: wy - ty * nh, w: nw, h: nh };
  applyVB(); scheduleRelabel();
}
function applyVB() {
  if (S.svg) S.svg.setAttribute("viewBox", `${S.vb.x} ${S.vb.y} ${S.vb.w} ${S.vb.h}`);
  updateMinimapViewport();
}
let relabelPending = false;
function scheduleRelabel() {
  if (relabelPending) return;
  relabelPending = true;
  requestAnimationFrame(() => { relabelPending = false; render(); });
}

// --- Navigation -----------------------------------------------------------
export function centerOn(id, zoom = 1.2, animate = true) {
  const n = S.layout?.nodes.find(x => x.id === id);
  if (!n) return;
  const w = S.size.w / Math.max(0.28, zoom), h = S.size.h / Math.max(0.28, zoom);
  const target = { x: n.x - w / 2, y: rowY(n.depth) + ROW_H / 2 - h / 2, w, h };
  if (!animate) { S.vb = target; applyVB(); scheduleRelabel(); return; }
  animateTo(target);
}
export function fitAll() { S.vb = { ...S.bbox }; applyVB(); scheduleRelabel(); }

function animateTo(target, dur = 460) {
  const from = { ...S.vb }, t0 = performance.now();
  const ease = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const step = (now) => {
    const t = Math.min(1, (now - t0) / dur), k = ease(t);
    S.vb = { x: from.x + (target.x - from.x) * k, y: from.y + (target.y - from.y) * k,
             w: from.w + (target.w - from.w) * k, h: from.h + (target.h - from.h) * k };
    applyVB();
    if (t < 1) requestAnimationFrame(step); else render();
  };
  requestAnimationFrame(step);
}

// --- Highlight ------------------------------------------------------------
export function highlightConnection(meId, otherId) {
  const g = indexGraph(S.people, S.relations);
  const path = (meId && otherId) ? shortestPath(g, meId, otherId) : [];
  S.hlPath = path;
  render();
  if (path.length) fitToHighlight(path);
  return path;
}
export function clearHighlight() { S.hlPath = null; render(); }

export function fitToHighlight(pathIds) {
  const ns = S.layout?.nodes.filter(n => pathIds.includes(n.id)) || [];
  if (!ns.length) return;
  let minX = Infinity, maxX = -Infinity, minD = Infinity, maxD = -Infinity;
  for (const n of ns) {
    minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x);
    minD = Math.min(minD, n.depth); maxD = Math.max(maxD, n.depth);
  }
  const pad = UNIT_W;
  const w = Math.max(UNIT_W * 3, (maxX - minX) + pad * 2 + UNIT_W);
  const h = Math.max(ROW_STRIDE, (maxD - minD) * ROW_STRIDE + ROW_H + pad);
  animateTo({ x: minX - pad - UNIT_W / 2, y: rowY(minD) - pad / 2, w, h });
}

// --- Minimap --------------------------------------------------------------
function buildMinimap(c) {
  const old = c.querySelector(".tree2-minimap"); old?.remove();
  if (!S.layout || !S.bbox) return;
  const mm = el("svg", { class: "tree2-minimap", viewBox: `${S.bbox.x} ${S.bbox.y} ${S.bbox.w} ${S.bbox.h}`,
    preserveAspectRatio: "xMidYMid meet" });
  for (const n of S.layout.nodes) {
    mm.appendChild(el("rect", { class: "node", x: n.x - UNIT_W / 2, y: rowY(n.depth), width: UNIT_W, height: UNIT_H }));
  }
  const vp = el("rect", { class: "vp", x: S.vb.x, y: S.vb.y, width: S.vb.w, height: S.vb.h });
  mm.appendChild(vp);
  mm.addEventListener("click", (e) => {
    const r = mm.getBoundingClientRect();
    const wx = S.bbox.x + ((e.clientX - r.left) / r.width) * S.bbox.w;
    const wy = S.bbox.y + ((e.clientY - r.top) / r.height) * S.bbox.h;
    S.vb.x = wx - S.vb.w / 2; S.vb.y = wy - S.vb.h / 2; applyVB();
  });
  // Als HTML-Overlay in den Container (nicht ins Welt-SVG).
  const holder = document.createElement("div");
  holder.appendChild(mm);
  c.appendChild(mm);
  S.minimap = mm; S.minimapVp = vp;
}
function updateMinimapViewport() {
  if (S.minimapVp) {
    S.minimapVp.setAttribute("x", S.vb.x); S.minimapVp.setAttribute("y", S.vb.y);
    S.minimapVp.setAttribute("width", S.vb.w); S.minimapVp.setAttribute("height", S.vb.h);
  }
}

// Kompatibilitaets-Wrapper fuer app.js (altes renderTree(container, onPerson)).
export function renderTree(container, onPerson) {
  if (!S.svg || S.container !== container) {
    init(container, { onNodeTap: onPerson });
    setData(S.people, S.relations, S.bloodIds);
  }
  S.onNodeTap = onPerson || S.onNodeTap;
  render(container, onPerson);
}

export const Tree = {
  init, setData, setCurrentUser, setRoot, render, renderTree,
  centerOn, fitAll, highlightConnection, clearHighlight, fitToHighlight,
  collapse, getZoom, getBBox, roots
};
export default Tree;
