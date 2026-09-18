import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  buildUnitTree, layoutTree, rowY, layoutBBox, edgePath,
  UNIT_W, ROW_STRIDE, MAX_STACK
} from "../public/js/tree-layout.js";
import { computeFamilies } from "../public/js/family-model.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Fixture: root + zwei Kinder mit Nachkommen + drei kinderlose Geschwister.
const people = [
  { id: "root", gender: "m", birth_date: "1900" },
  { id: "rootfrau", gender: "f", birth_date: "1902" },
  { id: "A", gender: "m", birth_date: "1930" },
  { id: "B", gender: "f", birth_date: "1932" },
  { id: "L1", gender: "m", birth_date: "1934" },
  { id: "L2", gender: "f", birth_date: "1936" },
  { id: "L3", gender: "m", birth_date: "1938" },
  { id: "A1", gender: "m", birth_date: "1960" },
  { id: "B1", gender: "f", birth_date: "1962" },
  { id: "apartner", gender: "f", birth_date: "1931" }
];
const relations = [
  { person_a: "root", person_b: "A", relation_type: "parent" },
  { person_a: "root", person_b: "B", relation_type: "parent" },
  { person_a: "root", person_b: "L1", relation_type: "parent" },
  { person_a: "root", person_b: "L2", relation_type: "parent" },
  { person_a: "root", person_b: "L3", relation_type: "parent" },
  { person_a: "root", person_b: "rootfrau", relation_type: "partner" },
  { person_a: "A", person_b: "A1", relation_type: "parent" },
  { person_a: "B", person_b: "B1", relation_type: "parent" },
  { person_a: "A", person_b: "apartner", relation_type: "partner", former: false }
];
const blood = new Set(["root", "A", "B", "L1", "L2", "L3", "A1", "B1"]);

test("buildUnitTree: Partner haengt an Einheit, Blutspartner separat", () => {
  const t = buildUnitTree(people, relations, "root", { bloodIds: blood });
  assert.equal(t.id, "root");
  const A = t.children.find(c => c.id === "A");
  assert.ok(A, "A hat eigenen Teilbaum (hat Nachkommen)");
  assert.ok(A.partners.some(p => p.id === "apartner"), "A_partner an A");
});

test("buildUnitTree: kinderlose Geschwister werden gestapelt", () => {
  const t = buildUnitTree(people, relations, "root", { bloodIds: blood });
  // A und B haben Nachkommen -> eigene Teilbaeume. L1..L3 kinderlos -> Stack.
  assert.equal(t.children.length, 2, "A,B als Teilbaeume");
  const stacked = t.stacks.flat().map(s => s.id).sort();
  assert.deepEqual(stacked, ["L1", "L2", "L3"]);
});

test("buildUnitTree: Stack respektiert MAX_STACK", () => {
  const many = [{ id: "r", gender: "m", birth_date: "1900" }];
  const rel = [];
  for (let i = 0; i < MAX_STACK + 2; i++) {
    many.push({ id: "c" + i, gender: "m", birth_date: "19" + (30 + i) });
    rel.push({ person_a: "r", person_b: "c" + i, relation_type: "parent" });
  }
  const bl = new Set(many.map(p => p.id));
  const t = buildUnitTree(many, rel, "r", { bloodIds: bl });
  assert.equal(t.stacks.length, 2, "MAX_STACK+2 Blaetter -> 2 Spalten");
  assert.equal(t.stacks[0].length, MAX_STACK);
  assert.equal(t.stacks[1].length, 2);
});

test("buildUnitTree: collapse verbirgt Kinder und zaehlt sie", () => {
  const t = buildUnitTree(people, relations, "root", { bloodIds: blood, collapsed: new Set(["A"]) });
  const A = t.children.find(c => c.id === "A");
  assert.equal(A.collapsed, true);
  assert.equal(A.children.length, 0);
  assert.ok(A.hiddenCount >= 1);
});

test("layoutTree: Eltern mittig ueber Kindern", () => {
  const t = buildUnitTree(people, relations, "root", { bloodIds: blood });
  const { nodes } = layoutTree(t);
  const root = nodes.find(n => n.id === "root");
  const childXs = nodes.filter(n => ["A", "B"].includes(n.id)).map(n => n.x);
  // root.x liegt zwischen den Kind-Slots (Teilbaeume + Stapel).
  assert.ok(root.x >= Math.min(...childXs) - UNIT_W && root.x <= Math.max(...childXs) + UNIT_W * 6);
  // Tiefe korrekt.
  assert.equal(root.depth, 0);
  assert.equal(nodes.find(n => n.id === "A").depth, 1);
  // A1 ist kinderlos -> gestapeltes Blatt unter A, kein eigener Knoten.
  const A = nodes.find(n => n.id === "A");
  assert.ok(A.stacks.flat().some(s => s.id === "A1"), "A1 im Stack von A");
});

test("layoutTree: keine ueberlappenden Slots auf derselben Ebene", () => {
  const t = buildUnitTree(people, relations, "root", { bloodIds: blood });
  const { nodes } = layoutTree(t);
  const byDepth = new Map();
  for (const n of nodes) { (byDepth.get(n.depth) || byDepth.set(n.depth, []).get(n.depth)).push(n.x); }
  for (const xs of byDepth.values()) {
    const sorted = [...xs].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      assert.ok(sorted[i] - sorted[i - 1] >= UNIT_W, `Slots ueberlappen: ${sorted[i - 1]} / ${sorted[i]}`);
    }
  }
});

test("rowY / ROW_STRIDE: Ebenen liegen untereinander", () => {
  assert.equal(rowY(0), 0);
  assert.equal(rowY(1), ROW_STRIDE);
  assert.ok(rowY(2) > rowY(1));
});

test("edgePath erzeugt orthogonalen Pfad ueber Sammelschiene", () => {
  const path = edgePath({ parentX: 100, childX: 300, depth: 0 });
  assert.ok(path.startsWith("M 100"));
  assert.ok(path.includes(" V "));
  assert.ok(path.includes(" H 300"));
});

test("layoutBBox umschliesst das Layout", () => {
  const t = buildUnitTree(people, relations, "root", { bloodIds: blood });
  const lay = layoutTree(t);
  const bb = layoutBBox(lay);
  assert.ok(bb.w >= lay.width);
  assert.ok(bb.h >= ROW_STRIDE);
});

// --- Gegen den echten Seed -----------------------------------------------
test("Seed: Stammtafel-Layout des Hauptzweigs ab Fokus wilhelm1866 baut auf", () => {
  const seed = JSON.parse(readFileSync(join(__dirname, "..", "private_seed", "gossler.seed.json"), "utf-8"));
  const ppl = seed.people.map(p => ({ id: p.id, gender: p.gender, birth_date: p.birth }));
  const rel = seed.relations.map(r => ({ person_a: r.a, person_b: r.b, relation_type: r.type, former: !!r.former }));
  const main = computeFamilies(ppl, rel)[0];
  const t = buildUnitTree(ppl, rel, "wilhelm1866", { bloodIds: main.bloodIds });
  const lay = layoutTree(t);
  assert.ok(lay.nodes.length > 3, "mehrere Einheiten");
  assert.ok(lay.nodes.some(n => n.id === "wilhelm1866"));
  assert.ok(lay.depth >= 2, `Tiefe erwartet >=2, war ${lay.depth}`);
});
