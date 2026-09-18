// render-smoke.test.mjs
// Dependency-freier Smoke-Test: rendert Fächer, Stammtafel, Gotha und die
// Views-Orchestrierung gegen den echten Seed in einem minimalen DOM-Shim.
// Faengt Integrations-/Laufzeitfehler (undefinierte Methoden, kaputte SVG-
// Attribute, falsche Aufrufe), die Unit-Tests der reinen Module nicht sehen.
// KEIN echter Browser noetig — kein jsdom, kein Chromium.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Minimaler DOM-Shim ---------------------------------------------------
function makeStub() {
  const s = {
    _attrs: {}, dataset: {}, style: {}, textContent: "", innerHTML: "",
    onclick: null, onchange: null, oninput: null,
    setAttribute() {}, getAttribute() { return null; },
    appendChild(c) { return c; }, append() {}, remove() {},
    addEventListener() {}, removeEventListener() {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    querySelector() { return makeStub(); }, querySelectorAll() { return []; },
    closest() { return null; }, scrollIntoView() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 800, height: 600 }; },
    setPointerCapture() {}, releasePointerCapture() {}
  };
  return s;
}

function makeEl(tag) {
  const node = {
    tagName: tag, _attrs: {}, children: [], style: {}, classList: null,
    dataset: {}, textContent: "", innerHTML: "",
    setAttribute(k, v) { this._attrs[k] = String(v); if (k.startsWith("data-")) this.dataset[k.slice(5)] = String(v); },
    setAttributeNS(_ns, k, v) { this._attrs[k] = String(v); },
    getAttribute(k) { return this._attrs[k] ?? null; },
    appendChild(c) { this.children.push(c); c.parentNode = this; return c; },
    append(c) { this.children.push(c); },
    remove() {},
    addEventListener() {},
    removeEventListener() {},
    setPointerCapture() {}, releasePointerCapture() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    closest() { return null; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 800, height: 600 }; },
    scrollIntoView() {},
    get clientWidth() { return 800; }, get clientHeight() { return 600; }
  };
  // querySelector liefert einen Stub (nie null), damit Event-Bindung nach
  // innerHTML nicht wegen fehlender Elemente wirft. querySelectorAll -> [].
  node.querySelector = () => makeStub();
  node.querySelectorAll = () => [];
  node.classList = {
    _set: new Set(),
    add(...c) { c.forEach(x => node.classList._set.add(x)); },
    remove(...c) { c.forEach(x => node.classList._set.delete(x)); },
    toggle(c, on) { on ? node.classList._set.add(c) : node.classList._set.delete(c); },
    contains(c) { return node.classList._set.has(c); }
  };
  return node;
}

globalThis.document = {
  createElementNS: (_ns, tag) => makeEl(tag),
  createElement: (tag) => makeEl(tag),
  querySelector: () => null,
  addEventListener() {}
};
globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = () => {};
globalThis.performance = { now: () => 0 };
globalThis.localStorage = {
  _m: new Map(),
  getItem(k) { return this._m.get(k) ?? null; },
  setItem(k, v) { this._m.set(k, String(v)); },
  removeItem(k) { this._m.delete(k); }
};
globalThis.window = { GOSSLER_RUNTIME: {} };
globalThis.CSS = { escape: (s) => s };

function seedGraph() {
  const seed = JSON.parse(readFileSync(join(__dirname, "..", "private_seed", "gossler.seed.json"), "utf-8"));
  const people = seed.people.map(p => {
    const parts = (p.name || "").split(" ");
    return {
      id: p.id, first_name: parts[0] || "", last_name: parts.slice(1).join(" "),
      gender: p.gender, birth_date: p.birth, death_date: p.death, is_registered: false
    };
  });
  const relations = seed.relations.map(r => ({ person_a: r.a, person_b: r.b, relation_type: r.type, former: !!r.former }));
  return { people, relations };
}

test("Fächer rendert alle drei Farbmodi + Zeitstrahl ohne Fehler", async () => {
  const { people, relations } = seedGraph();
  const { computeFamilies } = await import("../public/js/family-model.js");
  const Fan = (await import("../public/js/fan.js")).default;
  const fam = computeFamilies(people, relations)[0];
  const c = makeEl("div");
  Fan.init(c, { onPerson() {}, meId: "johannes1988" });
  Fan.setData(people, relations);
  Fan.setMeta({ registeredIds: [], deceasedIds: people.filter(p => p.death_date).map(p => p.id) });
  Fan.setFamily(fam);
  for (const mode of ["gender", "year", "name"]) Fan.setColorMode(mode);
  Fan.enableTimeline(true);
  Fan.setColorMode("year");
  Fan.enableTimeline(true);
  assert.ok(Fan.getTimelineYear() != null, "Zeitstrahl hat eine Jahresmarke");
  Fan.setTimelineYear(1950);
  assert.equal(Fan.getTimelineYear(), 1950);
  Fan.centerOn("johannes1902", { animate: false });
  Fan.highlightConnection(["wilhelm1866", "johannes1902"]);
  Fan.clearHighlight();
  // Default-Fokus ist wilhelm1866.
  assert.equal(Fan.getFocus(), "wilhelm1866");
});

test("Stammtafel v2 rendert + centerOn + highlight ohne Fehler", async () => {
  const { people, relations } = seedGraph();
  const { computeFamilies } = await import("../public/js/family-model.js");
  const Tree = (await import("../public/js/tree.js")).default;
  const fam = computeFamilies(people, relations)[0];
  const c = makeEl("div");
  Tree.init(c, { onNodeTap() {}, meId: "johannes1988" });
  Tree.setData(people, relations, fam.bloodIds);
  Tree.setRoot("wilhelm1866");
  Tree.render(c, () => {});
  assert.ok(Tree.getBBox(), "BBox berechnet");
  Tree.centerOn("johannes1902", 1.2, false);
  const path = Tree.highlightConnection("johannes1988", "wilhelm1866");
  assert.ok(Array.isArray(path));
  Tree.clearHighlight();
});

test("Gotha rendert + scrollTo + highlight ohne Fehler", async () => {
  const { people, relations } = seedGraph();
  const { computeFamilies } = await import("../public/js/family-model.js");
  const Gotha = (await import("../public/js/gotha.js")).default;
  const fam = computeFamilies(people, relations)[0];
  const c = makeEl("div");
  Gotha.init(c, { onPerson() {}, bloodIds: fam.bloodIds });
  Gotha.setData(people, relations, fam.bloodIds);
  Gotha.setRoot("wilhelm1866");
  Gotha.render(c, () => {});
  Gotha.scrollTo("johannes1988");
  Gotha.highlightConnection("johannes1988", "wilhelm1866");
  Gotha.clearHighlight();
  assert.ok(true);
});

test("Views mountet, wechselt alle 5 Ansichten + highlight + showInTree", async () => {
  const { people, relations } = seedGraph();
  const Views = (await import("../public/js/views.js")).default;
  const outlet = makeEl("div");
  Views.mountViews(outlet, people, relations, { meId: "johannes1988", onPerson() {} });
  for (const v of ["fan-gender", "fan-year", "fan-name", "gotha", "tree"]) {
    Views.setView(v);
    assert.equal(Views.getView(), v);
  }
  Views.highlightConnection("johannes1988", "wilhelm1866");
  Views.showInTree("johannes1902", { view: "tree" });
  Views.clearHighlight();
  assert.ok(Views.getActiveFamily(), "aktive Familie gesetzt");
});
