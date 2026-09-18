// Genealogie-Invarianten und Verwandtschafts-Regressionen.
// Läuft mit node --test (siehe package.json "test").
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  indexGraph,
  relationshipLabel,
  siblingKind,
  commonAncestor,
  estimatedSharedDNA
} from "../public/js/relationship.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const seedPath = join(__dirname, "..", "private_seed", "gossler.seed.json");

// --- Seed laden und ins kanonische DB-Schema mappen -----------------------
// Seed-Schema:  people {id, ...}, relations {a, b, type: parent|partner, former}
// App/DB-Schema: relations {person_a, person_b, relation_type, former}
function loadSeedAsGraphInput() {
  const seed = JSON.parse(readFileSync(seedPath, "utf-8"));
  const people = seed.people.map(p => ({ id: p.id, gender: p.gender }));
  const relations = seed.relations.map(r => ({
    person_a: r.a,
    person_b: r.b,
    relation_type: r.type,
    former: !!r.former
  }));
  return { seed, people, relations };
}

// --- Invarianten auf dem echten Seed --------------------------------------
test("Seed: keine Selbstrelationen", () => {
  const { relations } = loadSeedAsGraphInput();
  const self = relations.filter(r => r.person_a === r.person_b);
  assert.equal(self.length, 0, `Selbstrelationen: ${JSON.stringify(self)}`);
});

test("Seed: keine verwaisten Beziehungs-IDs", () => {
  const { people, relations } = loadSeedAsGraphInput();
  const ids = new Set(people.map(p => p.id));
  const bad = relations.filter(r => !ids.has(r.person_a) || !ids.has(r.person_b));
  assert.equal(bad.length, 0, `verwaiste IDs: ${JSON.stringify(bad.slice(0, 5))}`);
});

test("Seed: keine doppelten Beziehungen", () => {
  const { relations } = loadSeedAsGraphInput();
  const seen = new Set();
  const dupes = [];
  for (const r of relations) {
    // partner ist ungerichtet -> normalisieren
    const key = r.relation_type === "partner"
      ? `partner:${[r.person_a, r.person_b].sort().join("|")}`
      : `${r.relation_type}:${r.person_a}->${r.person_b}`;
    if (seen.has(key)) dupes.push(key);
    seen.add(key);
  }
  assert.equal(dupes.length, 0, `Duplikate: ${JSON.stringify(dupes)}`);
});

test("Seed: höchstens zwei Eltern pro Kind", () => {
  const { relations } = loadSeedAsGraphInput();
  const parents = new Map();
  for (const r of relations) {
    if (r.relation_type === "parent") {
      parents.set(r.person_b, (parents.get(r.person_b) || 0) + 1);
    }
  }
  const over = [...parents.entries()].filter(([, n]) => n > 2);
  assert.equal(over.length, 0, `Kinder mit >2 Eltern: ${JSON.stringify(over)}`);
});

test("Seed: keine Eltern-Zyklen (niemand ist eigener Vorfahre)", () => {
  const { people, relations } = loadSeedAsGraphInput();
  const g = indexGraph(people, relations);
  for (const p of people) {
    const anc = new Set();
    const stack = [...(g.parents.get(p.id) || [])];
    while (stack.length) {
      const x = stack.pop();
      if (x === p.id) assert.fail(`Zyklus: ${p.id} ist eigener Vorfahre`);
      if (anc.has(x)) continue;
      anc.add(x);
      for (const pp of g.parents.get(x) || []) stack.push(pp);
    }
  }
});

test("Seed: jede Beziehung hat eine Quelle und einen Status", () => {
  const seed = JSON.parse(readFileSync(seedPath, "utf-8"));
  const missing = seed.relations.filter(r => !r.source || !r.status);
  assert.equal(missing.length, 0, `ohne Quelle/Status: ${missing.length}`);
});

// --- Verwandtschafts-Regressionen auf kontrolliertem Fixture --------------
// gender: m/f. Relationen im DB-Schema.
const fx = {
  people: [
    { id: "opa", gender: "m" }, { id: "oma", gender: "f" },
    { id: "vater", gender: "m" }, { id: "onkel", gender: "m" },
    { id: "mutter", gender: "f" },
    { id: "ich", gender: "m" }, { id: "schwester", gender: "f" },
    { id: "cousin", gender: "m" }
  ],
  relations: [
    { person_a: "opa", person_b: "vater", relation_type: "parent" },
    { person_a: "oma", person_b: "vater", relation_type: "parent" },
    { person_a: "opa", person_b: "onkel", relation_type: "parent" },
    { person_a: "oma", person_b: "onkel", relation_type: "parent" },
    { person_a: "vater", person_b: "ich", relation_type: "parent" },
    { person_a: "mutter", person_b: "ich", relation_type: "parent" },
    { person_a: "vater", person_b: "schwester", relation_type: "parent" },
    { person_a: "mutter", person_b: "schwester", relation_type: "parent" },
    { person_a: "onkel", person_b: "cousin", relation_type: "parent" },
    { person_a: "vater", person_b: "mutter", relation_type: "partner" }
  ]
};
const fg = indexGraph(fx.people, fx.relations);

test("Kinship: Vater", () => {
  assert.equal(relationshipLabel(fg, "ich", "vater"), "Vater");
});
test("Kinship: Tochter", () => {
  assert.equal(relationshipLabel(fg, "vater", "schwester"), "Tochter");
});
test("Kinship: Vollgeschwister (Schwester)", () => {
  assert.equal(siblingKind(fg, "ich", "schwester"), "full");
  assert.equal(relationshipLabel(fg, "ich", "schwester"), "Schwester");
});
test("Kinship: Großvater", () => {
  assert.equal(relationshipLabel(fg, "ich", "opa"), "Großvater");
});
test("Kinship: Cousin ersten Grades", () => {
  const ca = commonAncestor(fg, "ich", "cousin");
  assert.ok(ca, "gemeinsamer Vorfahre erwartet");
  assert.equal(relationshipLabel(fg, "ich", "cousin"), "Cousin");
});
test("Kinship: Onkel großgeschrieben (Vollverwandtschaft)", () => {
  assert.equal(relationshipLabel(fg, "ich", "onkel"), "Onkel väterlicherseits");
});
test("Kinship: Neffe großgeschrieben (Vollverwandtschaft)", () => {
  assert.equal(relationshipLabel(fg, "onkel", "ich"), "Neffe");
});
test("DNA: Vollgeschwister ~50%", () => {
  const dna = estimatedSharedDNA(fg, "ich", "schwester");
  assert.ok(dna >= 40 && dna <= 60, `erwartet ~50, war ${dna}`);
});
test("DNA: Cousins ersten Grades ~12.5%", () => {
  const dna = estimatedSharedDNA(fg, "ich", "cousin");
  assert.ok(dna >= 10 && dna <= 15, `erwartet ~12.5, war ${dna}`);
});

// --- Halbgeschwister-Fall (wie im ursprünglichen Test) --------------------
test("Kinship: Halbschwester (nur ein gemeinsamer Elternteil)", () => {
  const people = [
    { id: "a", gender: "m" }, { id: "b", gender: "f" },
    { id: "c", gender: "m" }, { id: "d", gender: "f" }, { id: "e", gender: "f" }
  ];
  const relations = [
    { person_a: "a", person_b: "c", relation_type: "parent" },
    { person_a: "b", person_b: "c", relation_type: "parent" },
    { person_a: "a", person_b: "d", relation_type: "parent" },
    { person_a: "e", person_b: "d", relation_type: "parent" }
  ];
  const g = indexGraph(people, relations);
  assert.equal(siblingKind(g, "c", "d"), "half");
  assert.equal(relationshipLabel(g, "c", "d"), "Halbschwester");
});
