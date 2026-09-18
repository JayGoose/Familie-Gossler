// fan.js
// Radialer Nachkommen-Sunburst in reinem SVG (Parität zur Petersdorff-Referenz).
// Ersetzt den einfachen Punkt-Ring aus ring.js als Paritätsansicht.
// Layout-Geometrie liegt testbar in fan-layout.js; hier: SVG-Rendering,
// Farbmodi, Highlight, Pan/Zoom-Hooks und Event-Callbacks.

import { CONFIG } from "./config.js";
import { layoutFan, RING } from "./fan-layout.js";

const NS = "http://www.w3.org/2000/svg";

const state = {
  container: null,
  svg: null,
  gRoot: null,
  people: [],
  relations: [],
  family: null,          // { rootId, bloodIds, memberIds }
  preferredFamilyId: null,
  colorMode: "gender",   // gender | year | name
  layout: null,
  meId: null,
  onPerson: null,
  onFamilyChange: null,
  yearRange: null
};

function el(name, attrs = {}) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

function firstName(person) {
  return (person?.first_name || person?.name || "").split(" ")[0] || "";
}
function fullName(person) {
  return person?.name ||
    [person?.first_name, person?.last_name].filter(Boolean).join(" ") || "";
}
function yearOf(person) {
  const d = person?.birth_date || person?.birth;
  if (!d) return null;
  const y = parseInt(String(d).slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}

// --- Farbmodi -------------------------------------------------------------
function genderColor(person) {
  const g = person?.gender;
  if (g === "m") return CONFIG.ui.maleColor;
  if (g === "f") return CONFIG.ui.femaleColor;
  return CONFIG.ui.neutralColor;
}

function yearColor(person, range) {
  const y = yearOf(person);
  if (y == null || !range || range.max === range.min) return CONFIG.ui.neutralColor;
  const t = Math.max(0, Math.min(1, (y - range.min) / (range.max - range.min)));
  // Blau (alt) -> Orange (jung)
  const a = [69, 123, 157], b = [230, 130, 60];
  const mix = a.map((c, i) => Math.round(c + (b[i] - c) * t));
  return `rgb(${mix[0]},${mix[1]},${mix[2]})`;
}

function nameColor(person, rootLastName) {
  const ln = person?.last_name || (person?.name || "").split(" ").pop();
  if (rootLastName && ln && ln.toLowerCase() === rootLastName.toLowerCase()) {
    return CONFIG.ui.maleColor; // Namensträger hervorgehoben
  }
  return "#d8d4cb"; // gedimmt/grau
}

function segColor(seg) {
  const p = seg.person;
  let base;
  if (state.colorMode === "year") base = yearColor(p, state.yearRange);
  else if (state.colorMode === "name") base = nameColor(p, state.rootLastName);
  else base = genderColor(p);
  return base;
}

// --- Geometrie-Helfer -----------------------------------------------------
function polar(cx, cy, r, theta) {
  return [cx + r * Math.cos(theta), cy + r * Math.sin(theta)];
}

// Ringsegment als SVG-Pfad (Annulus-Sektor).
function segmentPath(cx, cy, r0, r1, t0, t1) {
  const gap = 0.008;
  const a0 = t0 + gap, a1 = Math.max(t0 + gap, t1 - gap);
  const [x0, y0] = polar(cx, cy, r0, a0);
  const [x1, y1] = polar(cx, cy, r1, a0);
  const [x2, y2] = polar(cx, cy, r1, a1);
  const [x3, y3] = polar(cx, cy, r0, a1);
  const large = (a1 - a0) > Math.PI ? 1 : 0;
  return `M ${x0} ${y0} L ${x1} ${y1} A ${r1} ${r1} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${r0} ${r0} 0 ${large} 0 ${x0} ${y0} Z`;
}

// --- Rendering ------------------------------------------------------------
export function init(container, { onPerson, onFamilyChange, meId } = {}) {
  state.container = container;
  state.onPerson = onPerson || null;
  state.onFamilyChange = onFamilyChange || null;
  state.meId = meId || null;
}

export function setData(people, relations) {
  state.people = people || [];
  state.relations = relations || [];
}

export function setFamily(family) {
  state.family = family;
  state.preferredFamilyId = family?.id || null;
  render();
}

export function setPreferredFamily(family) {
  state.preferredFamilyId = family?.id || null;
  if (!state.family) state.family = family;
  render();
}

export function setColorMode(mode) {
  if (["gender", "year", "name"].includes(mode)) {
    state.colorMode = mode;
    render();
  }
}

export function getColorMode() {
  return state.colorMode;
}

function computeYearRange(segments) {
  let min = Infinity, max = -Infinity;
  for (const s of segments) {
    const y = yearOf(s.person);
    if (y != null) { min = Math.min(min, y); max = Math.max(max, y); }
  }
  return Number.isFinite(min) ? { min, max } : null;
}

export function render() {
  const c = state.container;
  if (!c || !state.family) return;

  const lay = layoutFan(
    state.people, state.relations, state.family.rootId, state.family.bloodIds
  );
  state.layout = lay;
  state.yearRange = computeYearRange(lay.segments);
  const rootPerson = state.people.find(p => p.id === state.family.rootId);
  state.rootLastName = rootPerson?.last_name || (rootPerson?.name || "").split(" ").pop();

  const size = (lay.maxGen + 2) * RING * 2;
  const cx = size / 2, cy = size / 2;

  const svg = el("svg", {
    viewBox: `0 0 ${size} ${size}`,
    class: "fan-svg",
    "data-color-mode": state.colorMode
  });
  const g = el("g", { class: "fan-root" });
  svg.appendChild(g);

  // Ringlinien (dezent)
  for (let gen = 1; gen <= lay.maxGen + 1; gen++) {
    g.appendChild(el("circle", {
      cx, cy, r: gen * RING, fill: "none",
      stroke: "#e4e0d6", "stroke-width": "1", class: "fan-ring"
    }));
  }

  // Segmente
  for (const seg of lay.segments) {
    if (seg.generation === 0) {
      // Wurzel als Kreis im Zentrum
      const circle = el("circle", {
        cx, cy, r: RING * 0.8,
        fill: segColor(seg),
        class: "fan-seg fan-root-node",
        "data-id": seg.id,
        tabindex: "0"
      });
      g.appendChild(circle);
      const label = el("text", {
        x: cx, y: cy, "text-anchor": "middle", "dominant-baseline": "middle",
        class: "fan-label", "font-size": "13"
      });
      label.textContent = firstName(seg.person);
      g.appendChild(label);
      continue;
    }

    const path = el("path", {
      d: segmentPath(cx, cy, seg.radius0, seg.radius1, seg.theta0, seg.theta1),
      fill: segColor(seg),
      class: "fan-seg" + (state.meId === seg.id ? " fan-me" : ""),
      "data-id": seg.id,
      tabindex: "0"
    });
    if (state.deceasedIds?.has?.(seg.id)) path.classList.add("fan-deceased");
    g.appendChild(path);

    // Label an der Segmentmitte
    const rMid = (seg.radius0 + seg.radius1) / 2;
    const [lx, ly] = polar(cx, cy, rMid, seg.mid);
    const deg = (seg.mid * 180 / Math.PI);
    const flip = (deg > 90 && deg < 270) ? 180 : 0;
    const label = el("text", {
      x: lx, y: ly, "text-anchor": "middle", "dominant-baseline": "middle",
      transform: `rotate(${deg + flip} ${lx} ${ly})`,
      class: "fan-label", "font-size": "10"
    });
    label.textContent = firstName(seg.person);
    g.appendChild(label);

    // Angeheiratete Partner als "∞ Name" bzw. "⚮" im Host-Segment
    let pi = 0;
    for (const pt of seg.partners) {
      if (state.family.bloodIds.has(pt.id)) continue; // Blutspartner hat eigenes Segment
      const [px, py] = polar(cx, cy, rMid + 14 + pi * 12, seg.mid);
      const sym = pt.former ? "⚮" : "∞";
      const plabel = el("text", {
        x: px, y: py, "text-anchor": "middle", "dominant-baseline": "middle",
        transform: `rotate(${deg + flip} ${px} ${py})`,
        class: "fan-spouse-link" + (pt.former ? " fan-former" : ""),
        "data-id": pt.id, "font-size": "9"
      });
      plabel.textContent = `${sym} ${firstName(pt.person)}`;
      g.appendChild(plabel);
      pi++;
    }
  }

  c.innerHTML = "";
  c.appendChild(svg);
  state.svg = svg;
  state.gRoot = g;

  // Klick auf Segment/Partner öffnet Profil
  svg.addEventListener("click", (e) => {
    const t = e.target.closest("[data-id]");
    if (t && state.onPerson) state.onPerson(t.getAttribute("data-id"));
  });
}

// --- Highlight ------------------------------------------------------------
export function highlightConnection(pathIds) {
  if (!state.gRoot) return;
  const set = new Set(pathIds || []);
  for (const node of state.gRoot.querySelectorAll("[data-id]")) {
    const id = node.getAttribute("data-id");
    node.classList.toggle("fan-hl", set.has(id));
    node.classList.toggle("fan-dim", set.size > 0 && !set.has(id));
  }
}

export function clearHighlight() {
  if (!state.gRoot) return;
  for (const node of state.gRoot.querySelectorAll("[data-id]")) {
    node.classList.remove("fan-hl", "fan-dim");
  }
}

// --- Navigation (Platzhalter-Hooks für Task 9) ----------------------------
export function centerOn(personId) {
  // Ausführliche Pan/Zoom-Animation folgt in Task 9; hier nur Highlight-Fokus.
  if (personId) highlightConnection([personId]);
}
export function panTo(personId) { centerOn(personId); }

export function hide() {
  if (state.container) state.container.innerHTML = "";
}

export const Fan = {
  init, setData, setFamily, setPreferredFamily, setColorMode, getColorMode,
  render, highlightConnection, clearHighlight, centerOn, panTo, hide
};
export default Fan;
