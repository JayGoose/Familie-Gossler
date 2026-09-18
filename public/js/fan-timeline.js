// fan-timeline.js
// Reine, DOM-freie Logik fuer den Faecher-Zeitstrahl (nur im Geburtsjahr-Modus).
// Testbar mit node --test. Parität zur Petersdorff-Referenz:
//  - Drag: 6px pro Jahr. Wheel: 3 Jahre pro Tick. Tap: springt auf ein Jahr.
//  - Feste rote Jahresmarke; Personen mit Geburtsjahr > Marke sind "Zukunft"
//    (.fan-future, opacity 0). Fehlende Geburtsjahre werden geschaetzt.
//
// Der Zeitstrahl blendet Personen nach ihrem (ggf. geschaetzten) Geburtsjahr
// relativ zu einer beweglichen Jahresmarke ein. Er aendert KEINE Daten; die
// Schaetzung ist rein fuer die Anzeige und als solche markiert.

export const PX_PER_YEAR = 6;      // Drag-Empfindlichkeit
export const WHEEL_YEARS = 3;      // Jahre je Wheel-Tick

function rawYear(p) {
  const d = p?.birth_date || p?.birth || null;
  if (!d) return null;
  const y = parseInt(String(d).slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}

/** Drag-Weg (px) -> Jahres-Delta (positive px = zurueck in der Zeit oder vor,
 *  Vorzeichen bestimmt der Aufrufer; hier reine Umrechnung). */
export function dragToYears(deltaPx) {
  return Math.round(deltaPx / PX_PER_YEAR);
}

/** Wheel-Ticks -> Jahres-Delta. */
export function wheelToYears(ticks) {
  return ticks * WHEEL_YEARS;
}

/** Begrenzt eine Jahresmarke auf [min,max]. */
export function clampYear(year, min, max) {
  return Math.max(min, Math.min(max, year));
}

/**
 * Schaetzt fehlende Geburtsjahre aus dem Familiengraphen. Regeln (nur Anzeige):
 *  1) Elternjahr + 30, sofern ein Elternteil ein Jahr hat.
 *  2) sonst Kinderjahr - 30.
 *  3) sonst Partnerjahr.
 *  4) sonst null (bleibt unbekannt).
 * Iteriert bis zur Stabilitaet, damit Ketten aufgeloest werden.
 * @param people   [{id, birth_date?}]
 * @param g        indexGraph-Ergebnis { parents, children, partners }
 * @returns Map<id, {year:number, estimated:boolean}>
 */
export function estimateBirthYears(people, g) {
  const GEN = 30;
  const out = new Map();
  for (const p of people) {
    const y = rawYear(p);
    if (y != null) out.set(p.id, { year: y, estimated: false });
  }
  let changed = true, guard = 0;
  while (changed && guard++ < 12) {
    changed = false;
    for (const p of people) {
      if (out.has(p.id) && !out.get(p.id).estimated) continue;
      let est = null;
      // aus Eltern
      for (const par of g.parents.get(p.id) || []) {
        const pe = out.get(par);
        if (pe) { est = pe.year + GEN; break; }
      }
      // aus Kindern
      if (est == null) {
        for (const ch of g.children.get(p.id) || []) {
          const ce = out.get(ch);
          if (ce) { est = ce.year - GEN; break; }
        }
      }
      // aus Partner
      if (est == null) {
        for (const pt of g.partners.get(p.id) || []) {
          const te = out.get(pt.id);
          if (te) { est = te.year; break; }
        }
      }
      if (est != null) {
        const prev = out.get(p.id);
        if (!prev || prev.year !== est) { out.set(p.id, { year: est, estimated: true }); changed = true; }
      }
    }
  }
  return out;
}

/**
 * Sichtbarkeitszustand einer Person am Zeitstrahl.
 * @returns { visible:boolean, future:boolean, year:number|null, estimated:boolean }
 */
export function visibilityAt(personId, markerYear, yearMap) {
  const e = yearMap.get(personId);
  if (!e) return { visible: false, future: false, year: null, estimated: false };
  const future = e.year > markerYear;
  return { visible: !future, future, year: e.year, estimated: e.estimated };
}

/** Min/Max der (ggf. geschaetzten) Jahre — Grenzen fuer die Jahresmarke. */
export function yearBounds(yearMap) {
  let min = Infinity, max = -Infinity;
  for (const { year } of yearMap.values()) {
    if (year < min) min = year;
    if (year > max) max = year;
  }
  if (!Number.isFinite(min)) return null;
  return { min, max };
}
