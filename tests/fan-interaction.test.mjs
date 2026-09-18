import { test } from "node:test";
import assert from "node:assert/strict";
import {
  zoomLevelFor, segmentArcPx, ZOOM_FAR, ZOOM_MID, ZOOM_NEAR,
  labelForZoom, cap, lifespanLabel, birthNameOf, yearOf, deathYearOf,
  wheelDeltaToPhi, readableTextRotation, WHEEL_PX_PER_TURN,
  initialViewBox, viewScale, zoomAt, panBy, centerOnPoint,
  segmentCenterXY, lerpViewBox, easeInOut
} from "../public/js/fan-interaction.js";

const seg = (o) => ({ theta0: 0, theta1: 1, radius0: 90, radius1: 180, mid: 0.5, partners: [], ...o });

test("segmentArcPx = Winkelspanne * Aussenradius * scale", () => {
  const s = seg({ theta0: 0, theta1: 1, radius1: 100 });
  assert.equal(segmentArcPx(s, 1), 100);
  assert.equal(segmentArcPx(s, 2), 200);
});

test("zoomLevelFor waehlt Stufe nach Bogenlaenge", () => {
  assert.equal(zoomLevelFor(seg({ theta0: 0, theta1: 0.05, radius1: 180 })), ZOOM_FAR);   // ~9px
  assert.equal(zoomLevelFor(seg({ theta0: 0, theta1: 0.3, radius1: 180 })), ZOOM_MID);    // ~54px
  assert.equal(zoomLevelFor(seg({ theta0: 0, theta1: 0.7, radius1: 180 })), ZOOM_NEAR);   // ~126px
});

test("Geburtsjahr erscheint in den Labels (Johannes-Feedback #1)", () => {
  const p = { first_name: "Wilhelm", last_name: "Goßler", birth_date: "1866-11-28", death_date: "1934-01-01" };
  const s = seg({ person: p });
  assert.equal(labelForZoom(s, ZOOM_FAR), "Wilhelm");
  assert.equal(labelForZoom(s, ZOOM_MID), "Wilhelm * 1866");
  assert.ok(labelForZoom(s, ZOOM_NEAR).includes("* 1866 † 1934"));
  assert.ok(labelForZoom(s, ZOOM_NEAR).includes("Wilhelm Goßler"));
});

test("Geburtsname wird nur bei Abweichung gezeigt", () => {
  const differ = { first_name: "Elisabeth", last_name: "Goßler", birth_name: "Donner", birth_date: "1870" };
  const same = { first_name: "Anna", last_name: "Goßler", birth_name: "Goßler", birth_date: "1875" };
  assert.equal(birthNameOf(differ), "Donner");
  assert.equal(birthNameOf(same), null);
  const s = seg({ person: differ });
  assert.ok(labelForZoom(s, ZOOM_NEAR).includes("(geb. Donner)"));
});

test("lifespanLabel formatiert * / †", () => {
  assert.equal(lifespanLabel({ birth_date: "1866" }), "* 1866");
  assert.equal(lifespanLabel({ birth_date: "1866", death_date: "1934" }), "* 1866 † 1934");
  assert.equal(lifespanLabel({}), "");
});

test("yearOf / deathYearOf lesen Jahr aus ISO-Datum", () => {
  assert.equal(yearOf({ birth_date: "1866-11-28" }), 1866);
  assert.equal(deathYearOf({ death_date: "1934" }), 1934);
  assert.equal(yearOf({}), null);
});

test("cap() kuerzt lange Namen mit … und respektiert Bogenlaenge", () => {
  assert.equal(cap("Wilhelm", 200, 10), "Wilhelm");   // passt
  const short = cap("Maximiliana Freifrau von Musterhausen", 40, 10);
  assert.ok(short.endsWith("\u2026"), "gekuerzt");
  assert.ok(short.length < "Maximiliana Freifrau von Musterhausen".length);
  assert.equal(cap("", 100), "");
});

test("wheelDeltaToPhi: 720px = eine volle Umdrehung", () => {
  assert.ok(Math.abs(wheelDeltaToPhi(WHEEL_PX_PER_TURN) - 2 * Math.PI) < 1e-9);
  assert.ok(Math.abs(wheelDeltaToPhi(360) - Math.PI) < 1e-9);
});

test("readableTextRotation dreht untere Haelfte um 180° (kein Kopfstand)", () => {
  assert.equal(readableTextRotation(0), 0);                        // rechts
  assert.equal(readableTextRotation(Math.PI), 180 + 180);          // links -> geflippt (=360)
  // 135° (unten links) -> +180
  assert.equal(readableTextRotation(135 * Math.PI / 180), 135 + 180);
  // 45° (oben rechts) -> kein Flip
  assert.equal(readableTextRotation(45 * Math.PI / 180), 45);
});

test("initialViewBox + viewScale", () => {
  const vb = initialViewBox(1000);
  assert.deepEqual(vb, { x: 0, y: 0, w: 1000, h: 1000 });
  assert.equal(viewScale(vb, 1000), 1);
  assert.equal(viewScale({ x: 0, y: 0, w: 500, h: 500 }, 1000), 2);
});

test("zoomAt haelt Fokuspunkt fix und clamped Skala", () => {
  const size = 1000;
  let vb = initialViewBox(size);
  vb = zoomAt(vb, size, 500, 500, 2, 0.28, 6);   // 2x an Mitte
  assert.ok(Math.abs(viewScale(vb, size) - 2) < 1e-9);
  // Fokus Mitte bleibt Mitte
  assert.ok(Math.abs((vb.x + vb.w / 2) - 500) < 1e-9);
  // Clamp nach oben
  let z = initialViewBox(size);
  for (let i = 0; i < 20; i++) z = zoomAt(z, size, 500, 500, 2, 0.28, 6);
  assert.ok(viewScale(z, size) <= 6 + 1e-9);
});

test("panBy verschiebt nur x/y", () => {
  const vb = panBy({ x: 0, y: 0, w: 100, h: 100 }, 10, -5);
  assert.deepEqual(vb, { x: 10, y: -5, w: 100, h: 100 });
});

test("centerOnPoint zentriert bei Zoom", () => {
  const vb = centerOnPoint(1000, 300, 400, 2);
  assert.equal(vb.w, 500);
  assert.ok(Math.abs((vb.x + vb.w / 2) - 300) < 1e-9);
  assert.ok(Math.abs((vb.y + vb.h / 2) - 400) < 1e-9);
});

test("segmentCenterXY liegt auf dem Mittelradius", () => {
  const s = seg({ radius0: 90, radius1: 180, mid: 0 });
  const [x, y] = segmentCenterXY(s, 500, 500);
  assert.ok(Math.abs(x - (500 + 135)) < 1e-9);  // mid=0 -> +x
  assert.ok(Math.abs(y - 500) < 1e-9);
});

test("lerpViewBox + easeInOut", () => {
  const a = { x: 0, y: 0, w: 100, h: 100 }, b = { x: 100, y: 0, w: 50, h: 50 };
  const mid = lerpViewBox(a, b, 0.5);
  assert.equal(mid.x, 50); assert.equal(mid.w, 75);
  assert.equal(easeInOut(0), 0); assert.equal(easeInOut(1), 1);
  assert.ok(easeInOut(0.5) > 0.49 && easeInOut(0.5) < 0.51);
});
