// views.js — App-weite Synchronisierung der fuenf Ansichten (Task 13).
// Ansichten: Fächer(gender), Fächer(year), Fächer(name), Gotha, Stammtafel.
// Aktive Familie + Ansicht in localStorage (gossler_view, gossler_family).
// „Im Stammbaum zeigen", Highlight synchron in Fächer UND Stammtafel.

import { CONFIG } from "./config.js";
import {
  computeFamilies, pickActiveFamily, ensureFamilyFor, orphans,
  savePreferredFamilyId, familySubset
} from "./family-model.js";
import Fan from "./fan.js";
import Tree from "./tree.js";
import Gotha from "./gotha.js";

const VIEW_KEY = "gossler_view";
const VIEWS = ["fan-gender", "fan-year", "fan-name", "gotha", "tree"];
const VIEW_META = {
  "fan-gender": { icon: "◔", label: "Fächer · Geschlecht", kind: "fan", color: "gender" },
  "fan-year":   { icon: "◷", label: "Fächer · Jahr", kind: "fan", color: "year" },
  "fan-name":   { icon: "◑", label: "Fächer · Name", kind: "fan", color: "name" },
  "gotha":      { icon: "☰", label: "Gotha", kind: "gotha" },
  "tree":       { icon: "⌗", label: "Stammtafel", kind: "tree" }
};

const V = {
  people: [], relations: [], families: [], active: null,
  view: "fan-gender", meId: null, onPerson: null, mounted: false, outlet: null
};

function loadView() {
  try { return localStorage.getItem(VIEW_KEY) || "fan-gender"; } catch (_) { return "fan-gender"; }
}
function saveView(v) { try { localStorage.setItem(VIEW_KEY, v); } catch (_) {} }

/**
 * Initialisiert die Ansichten mit dem aktuellen Datenbestand.
 * @param people/relations  DB-Schema
 * @param opts { meId, onPerson }
 */
export function mountViews(outlet, people, relations, { meId = null, onPerson = null } = {}) {
  V.people = people || []; V.relations = relations || [];
  V.meId = meId; V.onPerson = onPerson; V.outlet = outlet;
  V.families = computeFamilies(V.people, V.relations);
  V.active = pickActiveFamily(V.families);
  V.view = loadView();
  if (!VIEWS.includes(V.view)) V.view = "fan-gender";

  outlet.innerHTML = `
    <div id="view-canvas" style="position:relative;width:100%;height:76vh"></div>
    <div class="view-switch" id="view-switch" role="tablist" aria-label="Ansicht wählen"></div>
  `;
  buildSwitch();
  buildFamilySwitch();

  // Ansichts-Module initialisieren (einmalig; Container wird je Ansicht getauscht).
  const canvas = outlet.querySelector("#view-canvas");
  Fan.init(canvas, {
    onPerson: (id) => handlePerson(id),
    onFamilyChange: (id) => showInTree(id, { view: V.view }),
    meId: V.meId
  });
  Fan.setData(V.people, V.relations);
  Fan.setMeta({
    registeredIds: V.people.filter(p => p.is_registered).map(p => p.id),
    deceasedIds: V.people.filter(p => p.death_date || p.death).map(p => p.id)
  });
  Tree.init(canvas, { onNodeTap: (id) => handlePerson(id), onBackgroundTap: () => {}, meId: V.meId });
  Tree.setData(V.people, V.relations, V.active?.bloodIds || null);
  Tree.setRoot(V.active?.rootId);
  Gotha.init(canvas, { onPerson: (id) => handlePerson(id), bloodIds: V.active?.bloodIds });
  Gotha.setData(V.people, V.relations, V.active?.bloodIds || null);
  Gotha.setRoot(V.active?.rootId);

  V.mounted = true;
  renderActive();
  renderOrphanPill();
}

function buildSwitch() {
  const sw = V.outlet.querySelector("#view-switch");
  sw.innerHTML = VIEWS.map(v =>
    `<button role="tab" data-view="${v}" aria-selected="${v === V.view}" title="${VIEW_META[v].label}"
       class="${v === V.view ? "active" : ""}">${VIEW_META[v].icon}</button>`).join("");
  sw.querySelectorAll("[data-view]").forEach(b => b.onclick = () => setView(b.dataset.view));
}

function buildFamilySwitch() {
  // Zweigschalter nur bei >=2 Zweigen.
  let host = V.outlet.querySelector("#family-switch");
  if (V.families.length < 2) { host?.remove(); return; }
  if (!host) {
    host = document.createElement("div");
    host.id = "family-switch";
    host.style.cssText = "position:fixed;left:16px;top:112px;z-index:56";
    V.outlet.appendChild(host);
  }
  const byId = Object.fromEntries(V.people.map(p => [p.id, p]));
  host.innerHTML = `<label style="margin:0;font-size:12px">Zweig
    <select id="family-select">${V.families.map(f => {
      const r = byId[f.rootId];
      const name = r ? `${r.first_name || ""} ${r.last_name || ""}`.trim() || f.rootId : f.rootId;
      return `<option value="${f.id}" ${f.id === V.active?.id ? "selected" : ""}>${name} (${f.size})</option>`;
    }).join("")}</select></label>`;
  host.querySelector("#family-select").onchange = (e) => setActiveFamily(e.target.value);
}

export function setView(view) {
  if (!VIEWS.includes(view)) return;
  V.view = view; saveView(view);
  V.outlet.querySelectorAll("#view-switch [data-view]").forEach(b => {
    const on = b.dataset.view === view;
    b.classList.toggle("active", on); b.setAttribute("aria-selected", String(on));
  });
  renderActive();
}
export function getView() { return V.view; }

export function setActiveFamily(id) {
  const fam = V.families.find(f => f.id === id);
  if (!fam) return;
  V.active = fam;
  savePreferredFamilyId(id);
  Tree.setData(V.people, V.relations, fam.bloodIds); Tree.setRoot(fam.rootId);
  Gotha.setData(V.people, V.relations, fam.bloodIds); Gotha.setRoot(fam.rootId);
  buildFamilySwitch();
  renderActive();
}

function renderActive() {
  const canvas = V.outlet.querySelector("#view-canvas");
  const meta = VIEW_META[V.view];
  // Andere Module ausblenden, aktives rendern.
  hideOverlays();
  if (meta.kind === "fan") {
    Fan.setColorMode(meta.color);
    Fan.setFamily(V.active);
    Fan.enableTimeline(meta.color === "year");
    renderLegend(Fan.legendHtml());
    if (meta.color === "year") renderTimelineBar();
  } else if (meta.kind === "tree") {
    Tree.render(canvas, (id) => handlePerson(id));
  } else if (meta.kind === "gotha") {
    Gotha.render(canvas, (id) => handlePerson(id));
  }
}

function hideOverlays() {
  V.outlet.querySelector("#fan-legend")?.remove();
  V.outlet.querySelector("#timeline-bar")?.remove();
}

function renderLegend(html) {
  let lg = V.outlet.querySelector("#fan-legend");
  if (!lg) { lg = document.createElement("div"); lg.id = "fan-legend"; lg.className = "fan-legend"; V.outlet.appendChild(lg); }
  lg.innerHTML = html;
}

function renderTimelineBar() {
  let bar = V.outlet.querySelector("#timeline-bar");
  if (!bar) { bar = document.createElement("div"); bar.id = "timeline-bar"; bar.className = "timeline-bar"; V.outlet.appendChild(bar); }
  const y = Fan.getTimelineYear();
  bar.innerHTML = `<span class="year" id="tl-year">${y ?? "—"}</span>
    <input type="range" id="tl-range" min="1600" max="2030" value="${y ?? 2000}" aria-label="Jahresmarke">`;
  const range = bar.querySelector("#tl-range");
  range.oninput = () => {
    Fan.setTimelineYear(Number(range.value));
    bar.querySelector("#tl-year").textContent = Fan.getTimelineYear();
  };
}

function renderOrphanPill() {
  const ids = orphans(V.people, V.families);
  V.outlet.querySelector("#orphan-pill")?.remove();
  if (!ids.length) return;
  const pill = document.createElement("button");
  pill.id = "orphan-pill"; pill.className = "orphan-pill";
  pill.textContent = `${ids.length} Person${ids.length > 1 ? "en" : ""} ohne Zweig`;
  pill.onclick = () => handlePerson(ids[0]);
  V.outlet.appendChild(pill);
}

// --- Person angetippt: Profil + Zweigwechsel bei Bedarf -------------------
function handlePerson(id) {
  ensureActiveFor(id);
  if (V.onPerson) V.onPerson(id);
}

function ensureActiveFor(id) {
  const fam = ensureFamilyFor(V.families, id);
  if (fam && fam.id !== V.active?.id) setActiveFamily(fam.id);
}

/**
 * „Im Stammbaum zeigen": Zweig wechseln, Stammtafel aktivieren, zentrieren.
 */
export function showInTree(id, { view = "tree" } = {}) {
  ensureActiveFor(id);
  setView(view);
  requestAnimationFrame(() => {
    if (VIEW_META[view]?.kind === "tree") Tree.centerOn(id, 1.2, true);
    else if (VIEW_META[view]?.kind === "fan") Fan.centerOn(id);
    else if (VIEW_META[view]?.kind === "gotha") Gotha.scrollTo(id);
  });
}

/**
 * Verwandtschaft hervorheben — synchron in Fächer UND Stammtafel (Referenz:
 * das Verwandtschaftspanel markiert beide gleichzeitig).
 */
export function highlightConnection(meId, otherId) {
  ensureActiveFor(otherId);
  const meta = VIEW_META[V.view];
  if (meta.kind === "tree") {
    const path = Tree.highlightConnection(meId, otherId);
    return path;
  }
  if (meta.kind === "gotha") return Gotha.highlightConnection(meId, otherId);
  // Fächer: Pfad selbst berechnen und beide markieren.
  Fan.highlightConnection([meId, otherId]);
  Fan.fitToHighlight([meId, otherId]);
  return [meId, otherId];
}
export function clearHighlight() {
  Fan.clearHighlight?.(); Tree.clearHighlight?.(); Gotha.clearHighlight?.();
}

export function getActiveFamily() { return V.active; }

export const Views = {
  mountViews, setView, getView, setActiveFamily, getActiveFamily,
  showInTree, highlightConnection, clearHighlight
};
export default Views;
