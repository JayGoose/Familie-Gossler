import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  computeFamilies,
  familySubset,
  ensureFamilyFor,
  orphans,
  pickActiveFamily
} from "../public/js/family-model.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function seedAsDb() {
  const seed = JSON.parse(
    readFileSync(join(__dirname, "..", "private_seed", "gossler.seed.json"), "utf-8")
  );
  const people = seed.people.map(p => ({
    id: p.id, gender: p.gender, birth_date: p.birth, last_name: (p.name || "").split(" ").pop()
  }));
  const relations = seed.relations.map(r => ({
    person_a: r.a, person_b: r.b, relation_type: r.type, former: !!r.former
  }));
  return { people, relations };
}

// --- Fixture: zwei Zweige + Heirat dazwischen + Waise --------------------
const people = [
  { id: "stammA", gender: "m", birth_date: "1900-01-01" },
  { id: "stammA_frau", gender: "f", birth_date: "1902-01-01" },
  { id: "kindA", gender: "f", birth_date: "1930-01-01" },
  { id: "stammB", gender: "m", birth_date: "1905-01-01" },
  { id: "kindB", gender: "m", birth_date: "1935-01-01" },
  { id: "waise", gender: "f", birth_date: "1980-01-01" }
];
const relations = [
  { person_a: "stammA", person_b: "kindA", relation_type: "parent" },
  { person_a: "stammA_frau", person_b: "kindA", relation_type: "parent" },
  { person_a: "stammA", person_b: "stammA_frau", relation_type: "partner" },
  { person_a: "stammB", person_b: "kindB", relation_type: "parent" },
  // Heirat zwischen den Zweigen: kindA (Zweig A) ∞ kindB (Zweig B)
  { person_a: "kindA", person_b: "kindB", relation_type: "partner" }
];

test("computeFamilies erkennt zwei Zweige", () => {
  const fams = computeFamilies(people, relations);
  const roots = fams.map(f => f.rootId).sort();
  assert.deepEqual(roots, ["stammA", "stammB"]);
});

test("Stammelternpaar: nur ein Wurzelknoten (älterer Partner)", () => {
  const fams = computeFamilies(people, relations);
  // stammA (1900) und stammA_frau (1902) sind ein Paar → nur stammA ist Wurzel
  assert.ok(fams.some(f => f.rootId === "stammA"));
  assert.ok(!fams.some(f => f.rootId === "stammA_frau"));
});

test("Heirat zwischen Zweigen: Partner erscheint in beiden Familien", () => {
  const fams = computeFamilies(people, relations);
  const famA = fams.find(f => f.rootId === "stammA");
  const famB = fams.find(f => f.rootId === "stammB");
  assert.ok(famA.memberIds.has("kindB"), "kindB als angeheiratet in Zweig A");
  assert.ok(famB.memberIds.has("kindA"), "kindA als angeheiratet in Zweig B");
});

test("familySubset liefert nur Personen/Beziehungen des Zweigs", () => {
  const fams = computeFamilies(people, relations);
  const famB = fams.find(f => f.rootId === "stammB");
  const sub = familySubset(people, relations, famB);
  assert.ok(sub.people.every(p => famB.memberIds.has(p.id)));
  assert.ok(sub.relations.every(r => famB.memberIds.has(r.person_a) && famB.memberIds.has(r.person_b)));
});

test("orphans erkennt nicht erreichbare Person", () => {
  const fams = computeFamilies(people, relations);
  assert.deepEqual(orphans(people, fams), ["waise"]);
});

test("ensureFamilyFor findet den Zweig einer Person", () => {
  const fams = computeFamilies(people, relations);
  assert.equal(ensureFamilyFor(fams, "kindB").rootId, "stammB");
});

test("pickActiveFamily bevorzugt gemerkten Zweig, sonst größten", () => {
  const fams = computeFamilies(people, relations);
  assert.equal(pickActiveFamily(fams, "stammB").rootId, "stammB");
  assert.equal(pickActiveFamily(fams, null).rootId, fams[0].rootId);
});

// --- Gegen den echten Gossler-Seed ---------------------------------------
test("Seed: Gossler-Hauptzweig hat Claus Goßler (1630) als Wurzel", () => {
  const { people, relations } = seedAsDb();
  const fams = computeFamilies(people, relations);
  assert.ok(fams.length >= 1, "mindestens eine Familie");
  // Die größte Familie sollte den frühesten Stammvater als Wurzel haben.
  const main = fams[0];
  assert.equal(main.rootId, "claus1630", `Wurzel war ${main.rootId}`);
  // Die Hauptperson johannes1988 muss im Hauptzweig enthalten sein.
  assert.ok(main.memberIds.has("johannes1988"), "johannes1988 im Hauptzweig");
});

test("Seed: keine Waisen im Hauptzweig-Kern (Wilhelm-Linie erreichbar)", () => {
  const { people, relations } = seedAsDb();
  const fams = computeFamilies(people, relations);
  const main = fams[0];
  for (const id of ["wilhelm1866", "johannes1902", "gerd1938", "johannes1988"]) {
    assert.ok(main.memberIds.has(id), `${id} muss im Hauptzweig sein`);
  }
});
