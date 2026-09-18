import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildGotha, flattenGotha, ancestorsOf, roman } from "../public/js/gotha-model.js";
import { computeFamilies } from "../public/js/family-model.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const people = [
  { id: "root", first_name: "Stamm", last_name: "Vater", gender: "m", birth_date: "1900", death_date: "1970" },
  { id: "frau", first_name: "Stamm", last_name: "Mutter", gender: "f", birth_date: "1902" },
  { id: "spaet", first_name: "Bea", last_name: "Vater", gender: "f", birth_date: "1935" },
  { id: "frueh", first_name: "Anton", last_name: "Vater", gender: "m", birth_date: "1930" },
  { id: "enkel", first_name: "Cara", last_name: "Vater", gender: "f", birth_date: "1960" },
  { id: "ex", first_name: "Egon", last_name: "Extern", gender: "m", birth_date: "1928" }
];
const relations = [
  { person_a: "root", person_b: "frueh", relation_type: "parent" },
  { person_a: "root", person_b: "spaet", relation_type: "parent" },
  { person_a: "frueh", person_b: "enkel", relation_type: "parent" },
  { person_a: "root", person_b: "frau", relation_type: "partner" },
  { person_a: "frueh", person_b: "ex", relation_type: "partner", former: true }
];
const blood = new Set(["root", "frueh", "spaet", "enkel"]);

test("roman: I = Stammvater", () => {
  assert.equal(roman(0), "I");
  assert.equal(roman(2), "III");
});

test("buildGotha: Wurzel ist Generation I mit Lebensdaten", () => {
  const g = buildGotha(people, relations, "root", { bloodIds: blood });
  assert.equal(g.id, "root");
  assert.equal(g.roman, "I");
  assert.equal(g.years, "* 1900 † 1970");
});

test("buildGotha: Geschwister nach Geburtsjahr (Anton 1930 vor Bea 1935)", () => {
  const g = buildGotha(people, relations, "root", { bloodIds: blood });
  assert.deepEqual(g.children.map(c => c.id), ["frueh", "spaet"]);
});

test("buildGotha: angeheirateter Partner als ∞-Notation", () => {
  const g = buildGotha(people, relations, "root", { bloodIds: blood });
  assert.equal(g.partners.length, 1);
  assert.ok(g.partners[0].label.startsWith("∞ Stamm Mutter"));
  assert.ok(g.partners[0].label.includes("(* 1902)"));
});

test("buildGotha: ehemaliger Partner als ⚮", () => {
  const g = buildGotha(people, relations, "root", { bloodIds: blood });
  const frueh = g.children.find(c => c.id === "frueh");
  assert.equal(frueh.partners[0].former, true);
  assert.ok(frueh.partners[0].label.startsWith("⚮ Egon Extern"));
});

test("buildGotha: Generationstiefe steigt (Enkel = III)", () => {
  const g = buildGotha(people, relations, "root", { bloodIds: blood });
  const enkel = g.children.find(c => c.id === "frueh").children[0];
  assert.equal(enkel.id, "enkel");
  assert.equal(enkel.roman, "III");
});

test("flattenGotha + ancestorsOf liefern Vorfahrenkette", () => {
  const g = buildGotha(people, relations, "root", { bloodIds: blood });
  const flat = flattenGotha(g);
  assert.ok(flat.some(f => f.id === "enkel" && f.gen === 2));
  assert.deepEqual(ancestorsOf(g, "enkel"), ["root", "frueh"]);
});

test("Seed: Gotha ab wilhelm1866 baut auf, I = Wilhelm", () => {
  const seed = JSON.parse(readFileSync(join(__dirname, "..", "private_seed", "gossler.seed.json"), "utf-8"));
  const ppl = seed.people.map(p => {
    const parts = (p.name || "").split(" ");
    return { id: p.id, first_name: parts[0], last_name: parts.slice(1).join(" "), gender: p.gender, birth_date: p.birth, death_date: p.death };
  });
  const rel = seed.relations.map(r => ({ person_a: r.a, person_b: r.b, relation_type: r.type, former: !!r.former }));
  const main = computeFamilies(ppl, rel)[0];
  const g = buildGotha(ppl, rel, "wilhelm1866", { bloodIds: main.bloodIds });
  assert.equal(g.id, "wilhelm1866");
  assert.equal(g.roman, "I");
  assert.ok(g.children.length >= 2, "mehrere Kinder");
  // Geschwisterordnung: nach Jahr aufsteigend.
  const yrs = g.children.map(c => c.person.birth_date).filter(Boolean);
  const sorted = [...yrs].sort();
  assert.deepEqual(yrs, sorted);
});
