import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dragToYears, wheelToYears, clampYear, estimateBirthYears,
  visibilityAt, yearBounds, PX_PER_YEAR, WHEEL_YEARS
} from "../public/js/fan-timeline.js";
import { indexGraph } from "../public/js/relationship.js";

test("dragToYears: 6px pro Jahr", () => {
  assert.equal(PX_PER_YEAR, 6);
  assert.equal(dragToYears(60), 10);
  assert.equal(dragToYears(3), 1);   // rundet
});

test("wheelToYears: 3 Jahre pro Tick", () => {
  assert.equal(WHEEL_YEARS, 3);
  assert.equal(wheelToYears(1), 3);
  assert.equal(wheelToYears(-2), -6);
});

test("clampYear begrenzt auf Spanne", () => {
  assert.equal(clampYear(1500, 1600, 2000), 1600);
  assert.equal(clampYear(2100, 1600, 2000), 2000);
  assert.equal(clampYear(1850, 1600, 2000), 1850);
});

test("estimateBirthYears: Kind ohne Jahr = Elternjahr + 30", () => {
  const people = [
    { id: "p", birth_date: "1900" },
    { id: "k" } // kein Jahr
  ];
  const rel = [{ person_a: "p", person_b: "k", relation_type: "parent" }];
  const g = indexGraph(people, rel);
  const m = estimateBirthYears(people, g);
  assert.equal(m.get("p").year, 1900);
  assert.equal(m.get("p").estimated, false);
  assert.equal(m.get("k").year, 1930);
  assert.equal(m.get("k").estimated, true);
});

test("estimateBirthYears: Elternteil ohne Jahr = Kindjahr - 30", () => {
  const people = [{ id: "p" }, { id: "k", birth_date: "1960" }];
  const rel = [{ person_a: "p", person_b: "k", relation_type: "parent" }];
  const g = indexGraph(people, rel);
  const m = estimateBirthYears(people, g);
  assert.equal(m.get("p").year, 1930);
  assert.equal(m.get("p").estimated, true);
});

test("estimateBirthYears: Partner uebernimmt Partnerjahr", () => {
  const people = [{ id: "a", birth_date: "1920" }, { id: "b" }];
  const rel = [{ person_a: "a", person_b: "b", relation_type: "partner" }];
  const g = indexGraph(people, rel);
  const m = estimateBirthYears(people, g);
  assert.equal(m.get("b").year, 1920);
  assert.equal(m.get("b").estimated, true);
});

test("estimateBirthYears loest Ketten auf (Grosseltern->Eltern->Kind)", () => {
  const people = [{ id: "g", birth_date: "1900" }, { id: "e" }, { id: "k" }];
  const rel = [
    { person_a: "g", person_b: "e", relation_type: "parent" },
    { person_a: "e", person_b: "k", relation_type: "parent" }
  ];
  const graph = indexGraph(people, rel);
  const m = estimateBirthYears(people, graph);
  assert.equal(m.get("e").year, 1930);
  assert.equal(m.get("k").year, 1960);
});

test("visibilityAt: Zukunft ausgeblendet, Vergangenheit sichtbar", () => {
  const yearMap = new Map([
    ["alt", { year: 1900, estimated: false }],
    ["jung", { year: 1990, estimated: false }]
  ]);
  const past = visibilityAt("alt", 1950, yearMap);
  assert.ok(past.visible && !past.future);
  const fut = visibilityAt("jung", 1950, yearMap);
  assert.ok(!fut.visible && fut.future);
  assert.equal(fut.year, 1990);
  // Unbekannte Person
  assert.deepEqual(visibilityAt("x", 1950, yearMap),
    { visible: false, future: false, year: null, estimated: false });
});

test("yearBounds liefert min/max", () => {
  const yearMap = new Map([
    ["a", { year: 1866 }], ["b", { year: 1988 }], ["c", { year: 1930 }]
  ]);
  assert.deepEqual(yearBounds(yearMap), { min: 1866, max: 1988 });
  assert.equal(yearBounds(new Map()), null);
});
