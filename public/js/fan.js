// fan.js
// Radialer Nachkommen-Sunburst in reinem SVG (Parität zur Petersdorff-Referenz).
// Ersetzt den einfachen Punkt-Ring aus ring.js als Paritätsansicht.
//
// Task 9: Pan/Zoom (viewBox), Semantic Zoom (fern/mittel/nah), Rotation
// (vertikales Rändelrad), centerOn/panTo-Animation, Legenden je Farbmodus,
// Geburtsjahre an den Labels + Lesbarkeit (Johannes-Feedback). Standard-
// Einstieg auf Wilhelm Goßler *1866 (Fokus-Wurzel), frühe Linie über den
// Fokus-/Zweigschalter erreichbar.
//
// Reine Geometrie liegt in fan-layout.js; reine Interaktions-/Label-Logik in
// fan-interaction.js (beide node-getestet). Hier: SVG-Rendering + Events.

import { CONFIG } from "./config.js";
import { layoutFan, RING } from "./fan-layout.js";
import { focusRootFor, bloodSubtreeFrom, saveFocusRootId } from "./family-model.js";
import { indexGraph } from "./relationship.js";
import {
  estimateBirthYears, visibilityAt, yearBounds,
  dragToYears, wheelToYears, clampYear
} from "./fan-timeline.js";
import {
  zoomLevelFor, labelForZoom, cap, segmentArcPx,
  wheelDeltaToPhi, readableTextRotation,
  initialViewBox, viewScale, zoomAt, panBy, centerOnPoint,
  segmentCenterXY, lerpViewBox, easeInOut, ZOOM_FAR, ZOOM_NEAR,
  yearOf, lifespanLabel, firstNameOf, fullNameOf, birthNameOf
} from "./fan-interaction.js";

const NS = "http://www.w3.org/2000/svg";

const state = {
  container: null,
  svg: null,
  gRoot: null,
  people: [],
  relations: [],
  family: null,          // { rootId, bloodIds, memberIds }
  focusId: null,         // Fokus-Wurzel (Ansicht), Default wilhelm1866
  colorMode: "gender",   // gender | year | name
  layout: null,
  meId: null,
  registeredIds: null,
  deceasedIds: null,
  onPerson: null,
  onFamilyChange: null,
  yearRange: null,
  rootLastName: "",
  size: 1000,
  cx: 500, cy: 500,
  vb: null,              // aktuelle viewBox
  phi: 0,                // Rotation (rad)
  raf: null,
  timelineOn: false,     // Zeitstrahl aktiv (nur year-Modus)
  timelineYear: null,    // aktuelle Jahresmarke
  yearMap: null,         // Map<id,{year,estimated}>
  yearBounds: null,
  defs: null,            // <defs> fuer textPath-Boegen
  labelSeq: 0
};

function el(name, attrs = {}) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
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
  const a = [69, 123, 157], b = [230, 130, 60]; // Blau (alt) -> Orange (jung)
  const mix = a.map((c, i) => Math.round(c + (b[i] - c) * t));
  return `rgb(${mix[0]},${mix[1]},${mix[2]})`;
}
function nameColor(person, rootLastName) {
  const ln = person?.last_name || (person?.name || "").split(" ").pop();
  const surn = (CONFIG.ui.familySurname || rootLastName || "").toLowerCase();
  const alt = (CONFIG.ui.alternativeSurname || "").toLowerCase();
  const l = (ln || "").toLowerCase();
  if (l && (l === surn || l === alt)) return CONFIG.ui.maleColor;
  return "#d8d4cb";
}
function segColor(seg) {
  const p = seg.person;
  if (state.colorMode === "year") return yearColor(p, state.yearRange);
  if (state.colorMode === "name") return nameColor(p, state.rootLastName);
  return genderColor(p);
}

// --- Geometrie-Helfer -----------------------------------------------------
function polar(cx, cy, r, theta) {
  return [cx + r * Math.cos(theta), cy + r * Math.sin(theta)];
}
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

// Tangentialer Bogen (fuer <textPath>): Text folgt der Ringkruemmung.
// In der unteren Bildhaelfte wird der Bogen umgekehrt gezeichnet, damit der
// Text nicht auf dem Kopf steht.
function labelArcPath(cx, cy, r, t0, t1, flip) {
  const a0 = flip ? t1 : t0;
  const a1 = flip ? t0 : t1;
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  const large = Math.abs(t1 - t0) > Math.PI ? 1 : 0;
  const sweep = flip ? 0 : 1;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} ${sweep} ${x1} ${y1}`;
}

// Erzeugt ein zentriertes, tangential gebogenes Label auf einem Bogen bei
// Radius r ueber die Segmentspanne. Gibt das <text>-Element zurueck (oder null).
function curvedLabel(g, seg, r, text, { fontPx = 10, cls = "fan-label", dataId = null, aria = null } = {}) {
  if (!text) return null;
  const mid = seg.mid + state.phi;              // absolute Lage inkl. Rotation
  let deg = (mid * 180 / Math.PI) % 360; if (deg < 0) deg += 360;
  // SVG: y zeigt nach unten. Tangentialer Text steht kopfueber, wenn die
  // Segmentmitte in die UNTERE Halbkugel weist (0°<deg<180°, sin>0). Dort den
  // Bogen umkehren; sonst laeuft der Text verkehrt herum.
  const flip = (deg > 0 && deg < 180);
  // Bei umgekehrtem Bogen laeuft der Text sonst kopfstehend: den Bogenradius
  // leicht nach aussen ruecken und die Grundlinie zentrieren, damit die
  // Glyphen aufrecht auf der Aussenseite sitzen.
  const arcR = flip ? r + fontPx * 0.34 : r;
  const id = `fan-arc-${state.labelSeq++}`;
  const arc = el("path", { id, d: labelArcPath(state.cx, state.cy, arcR, seg.theta0, seg.theta1, flip), fill: "none" });
  state.defs.appendChild(arc);
  const t = el("text", { class: cls, "font-size": String(fontPx), "dominant-baseline": "central" });
  if (dataId) { t.setAttribute("data-id", dataId); t.setAttribute("role", "button"); }
  if (aria) t.setAttribute("aria-label", aria);
  const tp = el("textPath", { href: `#${id}`, startOffset: "50%", "text-anchor": "middle" });
  tp.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", `#${id}`); // Safari-Fallback
  tp.textContent = text;
  t.appendChild(tp);
  g.appendChild(t);
  return t;
}

// --- Public API -----------------------------------------------------------
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

export function setMeta({ registeredIds, deceasedIds } = {}) {
  if (registeredIds) state.registeredIds = new Set(registeredIds);
  if (deceasedIds) state.deceasedIds = new Set(deceasedIds);
}

export function setFamily(family) {
  state.family = family;
  // Fokus auf gemerkte Auswahl / Default wilhelm1866 / Zweigwurzel.
  state.focusId = focusRootFor(family);
  state.phi = 0;
  render(true);
}

export function setFocus(personId) {
  if (!state.family) return;
  if (personId && state.family.bloodIds.has(personId)) {
    state.focusId = personId;
    saveFocusRootId(personId);
    render(true);
  }
}
export function getFocus() { return state.focusId; }

export function setColorMode(mode) {
  if (["gender", "year", "name"].includes(mode)) {
    state.colorMode = mode;
    render(false);
  }
}
export function getColorMode() { return state.colorMode; }

function computeYearRange(segments) {
  let min = Infinity, max = -Infinity;
  for (const s of segments) {
    const y = yearOf(s.person);
    if (y != null) { min = Math.min(min, y); max = Math.max(max, y); }
  }
  return Number.isFinite(min) ? { min, max } : null;
}

// --- Rendering ------------------------------------------------------------
export function render(resetView = false) {
  const c = state.container;
  if (!c || !state.family) return;

  // Blut-Teilbaum ab Fokus-Wurzel (frühe Linie bleibt im Datenbestand).
  const focusBlood = bloodSubtreeFrom(
    state.people, state.relations, state.family, state.focusId
  );
  const rootId = state.focusId || state.family.rootId;

  const lay = layoutFan(state.people, state.relations, rootId, focusBlood);
  state.layout = lay;
  state.yearRange = computeYearRange(lay.segments);
  const rootPerson = state.people.find(p => p.id === rootId);
  state.rootLastName = rootPerson?.last_name || (rootPerson?.name || "").split(" ").pop();

  // Zeitstrahl (nur year-Modus): geschaetzte Jahre + Grenzen vorbereiten.
  if (state.colorMode === "year" && state.timelineOn) {
    const g = indexGraph(state.people, state.relations);
    state.yearMap = estimateBirthYears(state.people, g);
    state.yearBounds = yearBounds(state.yearMap);
    if (state.timelineYear == null && state.yearBounds) {
      state.timelineYear = state.yearBounds.max;
    }
  }

  const size = (lay.maxGen + 2) * RING * 2;
  state.size = size;
  state.cx = size / 2; state.cy = size / 2;
  if (resetView || !state.vb) state.vb = initialViewBox(size);

  const svg = el("svg", {
    class: "fan-svg",
    "data-color-mode": state.colorMode,
    role: "img",
    "aria-label": `Fächer-Stammbaum ab ${fullNameOf(rootPerson)}`
  });
  applyViewBox(svg);
  const defs = el("defs", {});
  svg.appendChild(defs);
  state.defs = defs;
  state.labelSeq = 0;
  const g = el("g", { class: "fan-root", transform: rotTransform() });
  svg.appendChild(g);

  // Ringlinien (dezent)
  for (let gen = 1; gen <= lay.maxGen + 1; gen++) {
    g.appendChild(el("circle", {
      cx: state.cx, cy: state.cy, r: gen * RING, fill: "none",
      stroke: "#e4e0d6", "stroke-width": "1", class: "fan-ring"
    }));
  }

  const scale = viewScale(state.vb, size);
  for (const seg of lay.segments) renderSegment(g, seg, scale);

  c.innerHTML = "";
  c.appendChild(svg);
  state.svg = svg;
  state.gRoot = g;

  bindInteractions(svg);
}

function renderSegment(g, seg, scale) {
  const { cx, cy } = state;
  const p = seg.person;
  const registered = state.registeredIds?.has(seg.id);
  const deceased = state.deceasedIds?.has(seg.id) || !!(p?.death_date || p?.death);

  // Zeitstrahl: Personen mit Jahr > Marke sind Zukunft (.fan-future, opacity 0).
  let future = false;
  if (state.colorMode === "year" && state.timelineOn && state.yearMap && state.timelineYear != null) {
    future = visibilityAt(seg.id, state.timelineYear, state.yearMap).future;
  }

  if (seg.generation === 0) {
    const circle = el("circle", {
      cx, cy, r: RING * 0.8, fill: segColor(seg),
      class: "fan-seg fan-root-node"
        + (state.meId === seg.id ? " fan-me" : "")
        + (registered ? " fan-registered" : "")
        + (deceased ? " fan-deceased" : "")
        + (future ? " fan-future" : ""),
      "data-id": seg.id, tabindex: "0",
      role: "button", "aria-label": fullNameOf(p)
    });
    g.appendChild(circle);
    const t = el("text", {
      x: cx, y: cy, "text-anchor": "middle", "dominant-baseline": "middle",
      class: "fan-label fan-center-label", "font-size": "13"
    });
    t.textContent = cap(firstNameOf(p), RING * 1.4, 13);
    g.appendChild(t);
    if (yearOf(p) != null) {
      const yl = el("text", {
        x: cx, y: cy + 16, "text-anchor": "middle", "dominant-baseline": "middle",
        class: "fan-label fan-center-year", "font-size": "10"
      });
      yl.textContent = lifespanLabel(p);
      g.appendChild(yl);
    }
    return;
  }

  const path = el("path", {
    d: segmentPath(cx, cy, seg.radius0, seg.radius1, seg.theta0, seg.theta1),
    fill: segColor(seg),
    class: "fan-seg"
      + (state.meId === seg.id ? " fan-me" : "")
      + (registered ? " fan-registered" : "")
      + (deceased ? " fan-deceased" : "")
      + (future ? " fan-future" : ""),
    "data-id": seg.id, tabindex: "0",
    role: "button", "aria-label": `${fullNameOf(p)} ${lifespanLabel(p)}`.trim()
  });
  g.appendChild(path);

  // Tangentiale, der Ringkruemmung folgende Labels (Referenzverhalten).
  const level = zoomLevelFor(seg, scale);
  const rMid = (seg.radius0 + seg.radius1) / 2;
  const ringPx = (seg.radius1 - seg.radius0) * scale;   // Ringhoehe in BILDSCHIRM-px

  // Semantischer Zoom: Schrift bleibt BILDSCHIRM-konstant (~9/10px), egal wie
  // stark gezoomt ist. In Weltkoordinaten heisst das fontPx/scale — sonst
  // wuerde die Schrift mit dem viewBox mitwachsen und nichts gewaenne an Platz.
  const screenFont = level === ZOOM_FAR ? 9 : 10;
  const fontPx = screenFont / scale;                    // Weltkoordinaten-Schrift
  // Name je Zoomstufe.
  let nameText = level === ZOOM_FAR ? firstNameOf(p) : fullNameOf(p);
  if (level === ZOOM_NEAR) {
    const bn = birthNameOf(p);
    if (bn) nameText += ` (geb. ${bn})`;
  }
  const span = lifespanLabel(p);

  // Verfuegbare Bogenlaenge (BILDSCHIRM-px) am Namensradius; cap() rechnet in
  // Bildschirm-px gegen die Bildschirm-Schrift -> konsistente Einheiten.
  const nameArcCap = Math.max(0, (seg.theta1 - seg.theta0) * rMid * scale - 6);
  nameText = cap(nameText, nameArcCap, screenFont);
  if (!nameText) return;

  // Jahr nur, wenn genug Ringhoehe fuer eine zweite konzentrische Zeile.
  const showYear = level !== ZOOM_FAR && span && ringPx > screenFont * 3.4;
  const lineOff = fontPx * 0.62;                          // in Weltkoordinaten
  const nameR = showYear ? rMid - lineOff : rMid;

  curvedLabel(g, seg, nameR, nameText, {
    fontPx, cls: "fan-label fan-name-line",
    dataId: seg.id, aria: `${fullNameOf(p)} ${span}`.trim()
  });
  if (showYear) {
    const yearR = rMid + lineOff;
    const yScreen = Math.max(8, screenFont - 1);
    const yFont = yScreen / scale;
    const yText = cap(span, (seg.theta1 - seg.theta0) * yearR * scale - 6, yScreen);
    if (yText) curvedLabel(g, seg, yearR, yText, { fontPx: yFont, cls: "fan-label fan-year-line" });
  }

  // Angeheiratete Partner als "∞ Name"/"⚮" auf einem Bogen nahe der Aussenkante.
  if (level !== ZOOM_FAR) {
    const pScreen = 9, pFont = pScreen / scale;
    let pi = 0;
    for (const pt of seg.partners) {
      if (state.family.bloodIds.has(pt.id)) continue;
      const pr = rMid + lineOff * 2.4 + pi * (pFont * 0.9);
      if (pr > seg.radius1 - 3) break;
      const sym = pt.former ? "⚮" : "∞";
      const cap2 = (seg.theta1 - seg.theta0) * pr * scale - 6;
      const txt = cap(`${sym} ${firstNameOf(pt.person)}`, cap2, pScreen);
      curvedLabel(g, seg, pr, txt, {
        fontPx: pFont, cls: "fan-spouse-link" + (pt.former ? " fan-former" : ""),
        dataId: pt.id, aria: `${fullNameOf(pt.person)} (Partner)`
      });
      pi++;
    }
  }
}

// --- viewBox / Rotation ---------------------------------------------------
function applyViewBox(svg = state.svg) {
  if (!svg || !state.vb) return;
  const { x, y, w, h } = state.vb;
  svg.setAttribute("viewBox", `${x} ${y} ${w} ${h}`);
}
function rotTransform() {
  const deg = state.phi * 180 / Math.PI;
  return `rotate(${deg} ${state.cx} ${state.cy})`;
}
function applyRotation() {
  if (state.gRoot) state.gRoot.setAttribute("transform", rotTransform());
}

// Nur viewBox aktualisieren (kein Full-Rerender) — fluessiges Pan/Zoom.
function commitView() {
  applyViewBox();
}

// --- Interaktion ----------------------------------------------------------
function bindInteractions(svg) {
  // Klick / Tastatur auf Segment öffnet Profil.
  svg.addEventListener("click", (e) => {
    const t = e.target.closest("[data-id]");
    if (t && state.onPerson) state.onPerson(t.getAttribute("data-id"));
  });
  svg.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const t = e.target.closest?.("[data-id]");
    if (t && state.onPerson) { e.preventDefault(); state.onPerson(t.getAttribute("data-id")); }
  });

  // Wheel: Zoom am Cursor (Rotation liegt auf dem Rändelrad, s.u.).
  svg.addEventListener("wheel", (e) => {
    e.preventDefault();
    const [wx, wy] = clientToWorld(svg, e.clientX, e.clientY);
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    state.vb = zoomAt(state.vb, state.size, wx, wy, factor,
      CONFIG.ui.minTreeScale ?? 0.28, 6);
    scheduleRelabel();
  }, { passive: false });

  // Drag-Pan.
  let dragging = false, lastX = 0, lastY = 0;
  svg.addEventListener("pointerdown", (e) => {
    if (e.target.closest("#fan-wheel")) return;
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    svg.setPointerCapture?.(e.pointerId);
  });
  svg.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const k = state.vb.w / svg.clientWidth;   // Welt-px pro Bildschirm-px
    state.vb = panBy(state.vb, -(e.clientX - lastX) * k, -(e.clientY - lastY) * k);
    lastX = e.clientX; lastY = e.clientY;
    commitView();
  });
  const endDrag = (e) => { dragging = false; svg.releasePointerCapture?.(e.pointerId); };
  svg.addEventListener("pointerup", endDrag);
  svg.addEventListener("pointercancel", endDrag);

  addWheelControl(svg);
}

// Bildschirm- -> Weltkoordinaten (unter Beruecksichtigung der viewBox).
function clientToWorld(svg, clientX, clientY) {
  const rect = svg.getBoundingClientRect();
  const px = (clientX - rect.left) / rect.width;
  const py = (clientY - rect.top) / rect.height;
  return [state.vb.x + px * state.vb.w, state.vb.y + py * state.vb.h];
}

// Vertikales Rändelrad rechts: Rotation phi (720px = eine Umdrehung).
function addWheelControl(svg) {
  const knob = el("rect", {
    id: "fan-wheel", x: state.vb.x + state.vb.w - 18 * (state.vb.w / state.size),
    y: state.cy - 60, width: 10, height: 120, rx: 5,
    class: "fan-knob", fill: "#00000018", stroke: "#0000002a"
  });
  // Das Rändelrad ist bildschirmfix — wir setzen es relativ zur viewBox neu bei jedem Rerender.
  svg.appendChild(knob);
  let active = false, startY = 0, startPhi = 0;
  knob.addEventListener("pointerdown", (e) => {
    e.stopPropagation(); active = true; startY = e.clientY; startPhi = state.phi;
    knob.setPointerCapture?.(e.pointerId);
  });
  knob.addEventListener("pointermove", (e) => {
    if (!active) return;
    const rect = svg.getBoundingClientRect();
    const dyPx = (e.clientY - startY) * (state.size / rect.height);
    state.phi = startPhi + wheelDeltaToPhi(dyPx);
    applyRotation();
    scheduleRelabel();
  });
  const end = (e) => { active = false; knob.releasePointerCapture?.(e.pointerId); };
  knob.addEventListener("pointerup", end);
  knob.addEventListener("pointercancel", end);
}

// Labels haengen an der Zoomstufe; bei Zoom/Rotation neu zeichnen (throttled).
let relabelPending = false;
function scheduleRelabel() {
  commitView();
  if (relabelPending) return;
  relabelPending = true;
  requestAnimationFrame(() => {
    relabelPending = false;
    render(false); // gleiche viewBox/phi, aber neue Semantic-Zoom-Labels
  });
}

// --- Navigation (centerOn/panTo mit Animation) ----------------------------
export function centerOn(personId, { zoom = 2.2, animate = true } = {}) {
  if (!personId || !state.layout) return;
  // Wechselt bei Bedarf in den Zweig der Person (onFamilyChange), Task 13.
  const seg = state.layout.segments.find(s => s.id === personId);
  if (!seg) {
    if (state.onFamilyChange) state.onFamilyChange(personId);
    return;
  }
  const [wx, wy] = segmentCenterXY(seg, state.cx, state.cy);
  const target = centerOnPoint(state.size, wx, wy, zoom);
  if (!animate) { state.vb = target; scheduleRelabel(); return; }
  animateTo(target);
}
export function panTo(personId) { centerOn(personId, { zoom: 1.6 }); }

export function fitAll() {
  state.vb = initialViewBox(state.size);
  scheduleRelabel();
}

function animateTo(target, dur = 480) {
  if (state.raf) cancelAnimationFrame(state.raf);
  const from = { ...state.vb };
  const t0 = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - t0) / dur);
    state.vb = lerpViewBox(from, target, easeInOut(t));
    commitView();
    if (t < 1) state.raf = requestAnimationFrame(step);
    else { state.raf = null; render(false); }
  };
  state.raf = requestAnimationFrame(step);
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

// Passt den Viewport an die hervorgehobenen Segmente an (Panelplatz lassen).
export function fitToHighlight(pathIds) {
  if (!state.layout || !pathIds?.length) return;
  const segs = state.layout.segments.filter(s => pathIds.includes(s.id));
  if (!segs.length) return;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of segs) {
    const [x, y] = segmentCenterXY(s, state.cx, state.cy);
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  const pad = RING * 1.5;
  const w = Math.max(RING * 3, (maxX - minX) + pad * 2);
  const h = Math.max(RING * 3, (maxY - minY) + pad * 2);
  animateTo({ x: minX - pad, y: minY - pad, w, h });
}

// --- Legende je Farbmodus -------------------------------------------------
export function legendHtml() {
  if (state.colorMode === "gender") {
    return `Farbe = Geschlecht:
      <span class="lg" style="background:${CONFIG.ui.maleColor}"></span> m
      <span class="lg" style="background:${CONFIG.ui.femaleColor}"></span> w
      <span class="lg" style="background:${CONFIG.ui.neutralColor}"></span> unbekannt ·
      dunkler Rand = registriert · rot = du · blass = verstorben`;
  }
  if (state.colorMode === "year") {
    const r = state.yearRange;
    const from = r ? r.min : "?", to = r ? r.max : "?";
    return `Farbe = Geburtsjahr: <span class="lg" style="background:#457b9d"></span> ${from}
      → <span class="lg" style="background:#e6823c"></span> ${to} · ohne Jahr grau`;
  }
  const surn = CONFIG.ui.familySurname;
  return `Farbe = Familienname: Namensträger „${surn}“ hervorgehoben, Rest grau`;
}

export function hide() {
  if (state.container) state.container.innerHTML = "";
}

// --- Zeitstrahl (nur year-Modus) ------------------------------------------
export function enableTimeline(on = true) {
  state.timelineOn = !!on;
  if (!on) state.timelineYear = null;
  render(false);
}
export function isTimelineOn() { return state.timelineOn; }

export function setTimelineYear(year) {
  if (!state.yearBounds) return;
  state.timelineYear = clampYear(year, state.yearBounds.min, state.yearBounds.max);
  render(false);
}
export function getTimelineYear() { return state.timelineYear; }

// Drag/Wheel-Helfer fuer die UI (6px/Jahr, 3 Jahre/Tick).
export function timelineDrag(deltaPx) {
  if (state.timelineYear == null) return;
  setTimelineYear(state.timelineYear - dragToYears(deltaPx));
}
export function timelineWheel(ticks) {
  if (state.timelineYear == null) return;
  setTimelineYear(state.timelineYear + wheelToYears(ticks));
}

export const Fan = {
  init, setData, setMeta, setFamily, setFocus, getFocus,
  setColorMode, getColorMode, render,
  highlightConnection, clearHighlight, fitToHighlight,
  centerOn, panTo, fitAll, legendHtml, hide,
  enableTimeline, isTimelineOn, setTimelineYear, getTimelineYear,
  timelineDrag, timelineWheel
};
export default Fan;
