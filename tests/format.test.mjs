import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDate } from "../public/js/format.js";

test("formatDate: volles ISO-Datum wird deutsch lesbar", () => {
  assert.equal(formatDate("1938-04-12"), "12. April 1938");
  assert.equal(formatDate("2001-01-01"), "1. Januar 2001");
  assert.equal(formatDate("1969-12-31"), "31. Dezember 1969");
});

test("formatDate: jahresgenaue/unvollständige Werte bleiben Jahr (nichts erfinden)", () => {
  assert.equal(formatDate("1969"), "1969");
  assert.equal(formatDate("1866"), "1866");
});

test("formatDate: Jahr+Monat", () => {
  assert.equal(formatDate("1938-04"), "April 1938");
});

test("formatDate: leer -> Fallback", () => {
  assert.equal(formatDate(""), "—");
  assert.equal(formatDate(null), "—");
  assert.equal(formatDate(undefined, "unbekannt"), "unbekannt");
});

test("formatDate: unbekanntes Format bleibt unverändert", () => {
  assert.equal(formatDate("ca. 1900"), "ca. 1900");
});
