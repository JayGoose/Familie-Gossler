import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { layoutFan, computeLeafWeight, RING } from "../public/js/fan-layout.js";
import { computeFamilies } from "../public/js/family-model.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Fixture: Wurzel mit zwei Kindern; Kind A hat 3 Kinder, Kind B hat 1 Kind.
// Erwartetes Blattgewicht: A=3, B=1 -> A bekommt 3x so breiten Winkel wie B.
const people = [
  { id: "root", gender: "m", birth_date: "1900" },
  { id: "root_frau", gender: "f", birth_date: "1901" },
  { id: "A", gender: "m", birth_date: "1930" },
  { id: "B", gender: "f", birth_date: "1935" },
  { id: "A1", gender: "m", birth_date: "1960" },
  { id: "A2", gender: "f", birth_date: "1962" },
  { id: "A3", gender: "m", birth_date: "1964" },
  { id: "B1", gender: "f", birth_date: "1965" },
  { id: "A_partner", gender: "f", birth_date: "1931" }
];
const relations = [
  { person_a: "root", person_b: "A", relation_type: "parent" },
  { person_a: "root", person_b: "B", relation_type: "parent" },
  { person_a: "root", person_b: "root_frau", relation_type: "partner" },
  { person_a: "A", person_b: "A1", relation_type: "parent" },
  { person_a: "A", person_b: "A2", relation_type: "parent" },
  { person_a: "A", person_b: "A3", relation_type: "parent" },
  { person_a: "B", person_b: "B1", relation_type: "parent" },
  { person_a: "A", person_b: "A_partner", relation_type: "partner" }
];
const blood = new Set(["root", "A", "B", "A1", "A2", "A3", "B1"]);

test("Blattgewicht wird korrekt aufsummiert", () => {
  const { root, segments } = layoutFan(people, relations, "root", blood);
  assert.equal(root.leaf, 4, "4 Blätter gesamt (A1,A2,A3,B1)");
  const A = segments.find(s => s.id === "A");
  const B = segments.find(s => s.id === "B");
  assert.equal(A.leaf, 3);
  assert.equal(B.leaf, 1);
});

test("Winkelspanne ist proportional zum Blattgewicht", () => {
  const { segments } = layoutFan(people, relations, "root", blood);
  const A = segments.find(s => s.id === "A");
  const B = segments.find(s => s.id === "B");
  const spanA = A.theta1 - A.theta0;
  const spanB = B.theta1 - B.theta0;
  // A hat 3 Blätter, B hat 1 -> Verhältnis ~3:1
  assert.ok(Math.abs(spanA / spanB - 3) < 0.001, `Verhältnis war ${spanA / spanB}`);
});

test("Generation bestimmt den Ring-Radius", () => {
  const { segments } = layoutFan(people, relations, "root", blood);
  const root = segments.find(s => s.id === "root");
  const A = segments.find(s => s.id === "A");
  const A1 = segments.find(s => s.id === "A1");
  assert.equal(root.generation, 0);
  assert.equal(A.generation, 1);
  assert.equal(A1.generation, 2);
  assert.equal(A.radius0, 1 * RING);
  assert.equal(A1.radius0, 2 * RING);
});

test("Geschwister sind nach Geburtsjahr sortiert (A vor B, A1<A2<A3)", () => {
  const { segments } = layoutFan(people, relations, "root", blood);
  const A = segments.find(s => s.id === "A");
  const B = segments.find(s => s.id === "B");
  assert.ok(A.mid < B.mid, "A (1930) links von B (1935)");
  const [a1, a2, a3] = ["A1", "A2", "A3"].map(id => segments.find(s => s.id === id));
  assert.ok(a1.mid < a2.mid && a2.mid < a3.mid, "A1<A2<A3 nach Jahr");
});

test("Angeheirateter Partner hängt am Host-Segment, ist KEIN eigenes Segment", () => {
  const { segments, hostOf } = layoutFan(people, relations, "root", blood);
  assert.ok(!segments.some(s => s.id === "A_partner"), "kein eigenes Segment für Angeheiratete");
  assert.equal(hostOf.get("A_partner"), "A", "A_partner hängt an A");
  const A = segments.find(s => s.id === "A");
  assert.ok(A.partners.some(p => p.id === "A_partner"));
});

test("Ex-Partner wird als former markiert", () => {
  const rel2 = relations.concat([{ person_a: "B", person_b: "B_ex", relation_type: "partner", former: true }]);
  const ppl2 = people.concat([{ id: "B_ex", gender: "m", birth_date: "1933" }]);
  const { segments } = layoutFan(ppl2, rel2, "root", blood);
  const B = segments.find(s => s.id === "B");
  const ex = B.partners.find(p => p.id === "B_ex");
  assert.ok(ex && ex.former === true, "Ex-Partner former=true");
});

// --- Gegen den echten Seed-Hauptzweig ------------------------------------
test("Seed: Fächer-Layout des Hauptzweigs ist konsistent", () => {
  const seed = JSON.parse(
    readFileSync(join(__dirname, "..", "private_seed", "gossler.seed.json"), "utf-8")
  );
  const ppl = seed.people.map(p => ({ id: p.id, gender: p.gender, birth_date: p.birth }));
  const rel = seed.relations.map(r => ({
    person_a: r.a, person_b: r.b, relation_type: r.type, former: !!r.former
  }));
  const fams = computeFamilies(ppl, rel);
  const main = fams[0];
  const { segments, root, maxGen } = layoutFan(ppl, rel, main.rootId, main.bloodIds);
  assert.equal(root.id, "claus1630");
  assert.ok(segments.length > 5, "mehrere Segmente");
  assert.ok(maxGen >= 7, `Generationstiefe erwartet >=7 (Claus..Johannes1988), war ${maxGen}`);
  // Jede Winkelspanne positiv, alle innerhalb des Vollkreises.
  for (const s of segments) {
    assert.ok(s.theta1 >= s.theta0, `Segment ${s.id} hat negative Spanne`);
  }
});
