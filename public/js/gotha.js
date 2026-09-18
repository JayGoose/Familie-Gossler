// gotha.js — Gotha-Verzeichnis (eingerueckte, klappbare Nachkommenliste).
// Struktur/Ordnung liegt testbar in gotha-model.js; hier: DOM-Rendering.

import { buildGotha, ancestorsOf } from "./gotha-model.js";
import { indexGraph, shortestPath } from "./relationship.js";

const G = {
  container: null, people: [], relations: [], bloodIds: null, rootId: null,
  onPerson: null, collapsed: new Set(), root: null
};

function esc(s) { return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

export function init(container, { onPerson, bloodIds } = {}) {
  G.container = container; G.onPerson = onPerson || null;
  if (bloodIds) G.bloodIds = bloodIds;
}
export function setData(people, relations, bloodIds = null) {
  G.people = people || []; G.relations = relations || []; if (bloodIds) G.bloodIds = bloodIds;
}
export function setRoot(id) { G.rootId = id; }

export function render(container = G.container, onPerson) {
  if (container) G.container = container;
  if (onPerson) G.onPerson = onPerson;
  const c = G.container;
  if (!c || !G.rootId) { if (c) c.innerHTML = `<div class="empty">Kein Zweig gewählt.</div>`; return; }

  G.root = buildGotha(G.people, G.relations, G.rootId, { bloodIds: G.bloodIds });
  c.innerHTML = `<div class="gotha">
    <div class="toolbar">
      <button data-act="expand">Alle ausklappen</button>
      <button data-act="collapse3">Bis Gen. III einklappen</button>
    </div>
    <ul>${renderNode(G.root)}</ul>
  </div>`;

  c.querySelector('[data-act="expand"]').onclick = () => { G.collapsed.clear(); render(); };
  c.querySelector('[data-act="collapse3"]').onclick = () => { collapseFromGen(G.root, 2); render(); };

  c.querySelectorAll(".toggle").forEach(b => b.onclick = (e) => {
    e.stopPropagation();
    const id = b.dataset.toggle;
    if (G.collapsed.has(id)) G.collapsed.delete(id); else G.collapsed.add(id);
    render();
  });
  c.querySelectorAll(".nm").forEach(n => n.onclick = () => G.onPerson?.(n.dataset.id));
}

function renderNode(n) {
  const hasKids = n.children.length > 0;
  const collapsed = G.collapsed.has(n.id);
  const partners = n.partners.map(p =>
    `<span class="sp ${p.former ? "former" : ""}">; ${esc(p.label)}</span>`).join("");
  const toggle = hasKids
    ? `<button class="toggle" data-toggle="${esc(n.id)}" aria-label="${collapsed ? "ausklappen" : "einklappen"}">${collapsed ? "▸" : "▾"}</button>`
    : `<span class="toggle" aria-hidden="true"></span>`;
  return `<li class="${collapsed ? "collapsed" : ""}" data-row="${esc(n.id)}">
    <div class="row">
      ${toggle}
      <span class="gen">${n.roman}</span>
      <span class="nm" data-id="${esc(n.id)}" role="button" tabindex="0">${esc(nm(n.person))}</span>
      <span class="yr">${esc(n.years)}</span>${partners}
    </div>
    ${hasKids ? `<ul>${n.children.map(renderNode).join("")}</ul>` : ""}
  </li>`;
}

function nm(p) { return [p?.first_name, p?.last_name].filter(Boolean).join(" ") || p?.name || ""; }

function collapseFromGen(node, gen) {
  if (node.gen >= gen && node.children.length) G.collapsed.add(node.id);
  for (const c of node.children) collapseFromGen(c, gen);
}

// scrollTo(id): Vorfahren aufklappen, hinscrollen, kurz blinken.
export function scrollTo(id) {
  if (!G.root) return;
  const anc = ancestorsOf(G.root, id) || [];
  for (const a of anc) G.collapsed.delete(a);
  render();
  const li = G.container?.querySelector(`[data-row="${CSS.escape(id)}"]`);
  if (li) {
    li.scrollIntoView({ behavior: "smooth", block: "center" });
    li.classList.add("blink");
    setTimeout(() => li.classList.remove("blink"), 2400);
  }
}

// highlightConnection: markiert die Pfadzeilen zwischen zwei Personen.
export function highlightConnection(meId, otherId) {
  const g = indexGraph(G.people, G.relations);
  const path = (meId && otherId) ? shortestPath(g, meId, otherId) : [];
  clearHighlight();
  // Vorfahren der Pfadmitglieder aufklappen.
  for (const id of path) for (const a of (ancestorsOf(G.root, id) || [])) G.collapsed.delete(a);
  render();
  for (const id of path) G.container?.querySelector(`[data-row="${CSS.escape(id)}"]`)?.classList.add("hl");
  return path;
}
export function clearHighlight() {
  G.container?.querySelectorAll(".hl").forEach(li => li.classList.remove("hl"));
}

export const Gotha = { init, setData, setRoot, render, scrollTo, highlightConnection, clearHighlight };
export default Gotha;
