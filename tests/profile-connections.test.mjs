import { test } from "node:test";
import assert from "node:assert/strict";
import { orderedConnections } from "../public/js/connection-order.js";
import { renderMarkdown } from "../public/js/markdown.js";

const people = [
  { id: "me", first_name: "Ich", birth_date: "1960" },
  { id: "vater", first_name: "Vater", birth_date: "1930" },
  { id: "mutter", first_name: "Mutter", birth_date: "1932" },
  { id: "frau", first_name: "Frau", birth_date: "1962" },
  { id: "exfrau", first_name: "Ex", birth_date: "1961" },
  { id: "kind1", first_name: "Kind1", birth_date: "1985" },
  { id: "kind2", first_name: "Kind2", birth_date: "1988" },
  { id: "bruder", first_name: "Bruder", birth_date: "1958" }
];
const relations = [
  { person_a: "vater", person_b: "me", relation_type: "parent" },
  { person_a: "mutter", person_b: "me", relation_type: "parent" },
  { person_a: "vater", person_b: "bruder", relation_type: "parent" },
  { person_a: "mutter", person_b: "bruder", relation_type: "parent" },
  { person_a: "me", person_b: "frau", relation_type: "partner" },
  { person_a: "me", person_b: "exfrau", relation_type: "partner", former: true },
  { person_a: "me", person_b: "kind1", relation_type: "parent" },
  { person_a: "me", person_b: "kind2", relation_type: "parent" }
];

test("Verbindungen in fester Reihenfolge: Eltern→Partner→Ex→Kinder→Geschwister", () => {
  const conns = orderedConnections(people, relations, "me");
  const kinds = conns.map(c => c.kind);
  // Eltern zuerst.
  assert.equal(kinds[0], "parent"); assert.equal(kinds[1], "parent");
  // dann partner, dann ex-partner, dann child(er), dann sibling.
  const firstPartner = kinds.indexOf("partner");
  const firstEx = kinds.indexOf("ex-partner");
  const firstChild = kinds.indexOf("child");
  const firstSib = kinds.indexOf("sibling");
  assert.ok(firstPartner < firstEx, "Partner vor Ex");
  assert.ok(firstEx < firstChild, "Ex vor Kind");
  assert.ok(firstChild < firstSib, "Kind vor Geschwister");
});

test("innerhalb Eltern nach Geburtsjahr (Vater 1930 vor Mutter 1932)", () => {
  const conns = orderedConnections(people, relations, "me");
  const parents = conns.filter(c => c.kind === "parent").map(c => c.id);
  assert.deepEqual(parents, ["vater", "mutter"]);
});

test("Kinder nach Geburtsjahr", () => {
  const conns = orderedConnections(people, relations, "me");
  const kids = conns.filter(c => c.kind === "child").map(c => c.id);
  assert.deepEqual(kids, ["kind1", "kind2"]);
});

test("Geschwister erkannt (Bruder teilt beide Eltern)", () => {
  const conns = orderedConnections(people, relations, "me");
  const sibs = conns.filter(c => c.kind === "sibling").map(c => c.id);
  assert.deepEqual(sibs, ["bruder"]);
});

// --- Markdown-Sicherheit (Task 15) ---------------------------------------
test("Markdown escaped HTML/XSS", () => {
  assert.ok(renderMarkdown("<script>alert(1)</script>").includes("&lt;script&gt;"));
  assert.ok(!renderMarkdown("<img onerror=x>").includes("<img"));
});
test("Markdown: nur http(s)-Links, javascript: blockiert", () => {
  assert.ok(renderMarkdown("[k](https://x.io)").includes('rel="noopener"'));
  assert.ok(!renderMarkdown("[k](javascript:alert(1))").includes("href="));
});
test("Markdown: geordnete Liste behaelt Nummer, --- wird hr", () => {
  assert.ok(renderMarkdown("3. drei").includes("3. drei"));
  assert.ok(renderMarkdown("---").includes("<hr>"));
});
test("Markdown: Ueberschriften und Fettung", () => {
  assert.ok(renderMarkdown("# Titel").includes("<h1>Titel</h1>"));
  assert.ok(renderMarkdown("**x**").includes("<strong>x</strong>"));
});
