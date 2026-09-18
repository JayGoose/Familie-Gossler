import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  computeFamilies, focusRootFor, bloodSubtreeFrom, DEFAULT_FOCUS_ROOT_ID
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

test("DEFAULT_FOCUS_ROOT_ID ist wilhelm1866 (Johannes-Feedback #3)", () => {
  assert.equal(DEFAULT_FOCUS_ROOT_ID, "wilhelm1866");
});

test("focusRootFor faellt ohne Auswahl auf wilhelm1866 zurueck (im Hauptzweig)", () => {
  const { people, relations } = seedAsDb();
  const main = computeFamilies(people, relations)[0];
  // Ohne gemerkte Auswahl (null) -> Default, weil wilhelm1866 Blutsmitglied ist.
  assert.equal(focusRootFor(main, null), "wilhelm1866");
});

test("focusRootFor respektiert eine explizite Bluts-Auswahl", () => {
  const { people, relations } = seedAsDb();
  const main = computeFamilies(people, relations)[0];
  assert.equal(focusRootFor(main, "johannes1902"), "johannes1902");
  // Nicht-Blutsmitglied -> ignoriert, Default greift.
  assert.equal(focusRootFor(main, "nicht_existent"), "wilhelm1866");
});

test("bloodSubtreeFrom(wilhelm1866) blendet die duenne fruehe Linie aus, behaelt die Nachkommen", () => {
  const { people, relations } = seedAsDb();
  const main = computeFamilies(people, relations)[0];
  const sub = bloodSubtreeFrom(people, relations, main, "wilhelm1866");
  assert.ok(sub.has("wilhelm1866"), "Fokus-Wurzel enthalten");
  assert.ok(sub.has("johannes1902"), "Nachkomme enthalten");
  // Die fruehe Linie (Claus 1630) ist NICHT im Fokus-Teilbaum,
  // bleibt aber im vollen Datenbestand (main.bloodIds) erreichbar.
  assert.ok(!sub.has("claus1630"), "fruehe Linie im Fokus ausgeblendet");
  assert.ok(main.bloodIds.has("claus1630"), "fruehe Linie im Datenbestand erhalten");
  assert.ok(sub.size < main.bloodIds.size, "Fokus-Teilbaum kleiner als voller Zweig");
});

test("bloodSubtreeFrom(rootId) = ganzer Blutszweig", () => {
  const { people, relations } = seedAsDb();
  const main = computeFamilies(people, relations)[0];
  const sub = bloodSubtreeFrom(people, relations, main, main.rootId);
  assert.equal(sub.size, main.bloodIds.size);
});
