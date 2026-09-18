// fan-interaction.js
// Reine, DOM-freie Interaktions- und Label-Logik fuer den Faecher.
// Testbar mit node --test. Das SVG-Rendering und die Event-Bindung liegen in fan.js.
//
// Umfasst (Parität zur Petersdorff-Referenz + Johannes-Feedback):
//  - Semantic Zoom: drei Stufen (fern=Vorname, mittel=+Partner-Vornamen,
//    nah=Name + Geburtsname + Jahre). Auswahl nach verfuegbarer Bogenlaenge
//    (px pro Segment) mit Pixel-Deckel cap().
//  - Label-Text je Zoomstufe inkl. Geburtsjahr (Johannes-Feedback #1).
//  - Lesbarkeitsregeln: Rotation lesbar halten (kein Kopfstand), Namen
//    je Zoomstufe kuerzen (Johannes-Feedback #2).
//  - Rotation ueber ein vertikales Raendelrad (phi, 720px = eine Umdrehung).
//  - viewBox-Pan/Zoom-Mathematik (fit, zoomAt, panBy, centerOn-Ziel).

// --- Zoomstufen -----------------------------------------------------------
export const ZOOM_FAR = "far";     // fern: nur Vorname
export const ZOOM_MID = "mid";     // mittel: Vorname (+ Partner-Vorname)
export const ZOOM_NEAR = "near";   // nah: voller Name + Geburtsname + Jahre

// Schwellen in Pixeln Bogenlaenge je Segment (aussen). Bewusst grosszuegig,
// damit innere, schmale Ringe eher Kurzform zeigen.
export const ZOOM_PX_MID = 42;
export const ZOOM_PX_NEAR = 96;

/**
 * Bogenlaenge eines Segments am Aussenradius in Pixeln (nach Skalierung).
 * @param seg   Segment mit theta0/theta1/radius1
 * @param scale aktueller Zoomfaktor (viewBox-basiert; 1 = neutral)
 */
export function segmentArcPx(seg, scale = 1) {
  const span = Math.max(0, (seg.theta1 - seg.theta0));
  return span * seg.radius1 * scale;
}

/**
 * Waehlt die Semantic-Zoom-Stufe eines Segments aus seiner Bogenlaenge.
 */
export function zoomLevelFor(seg, scale = 1) {
  const px = segmentArcPx(seg, scale);
  if (px >= ZOOM_PX_NEAR) return ZOOM_NEAR;
  if (px >= ZOOM_PX_MID) return ZOOM_MID;
  return ZOOM_FAR;
}

// --- Namensbausteine ------------------------------------------------------
export function firstNameOf(person) {
  return (person?.first_name || person?.name || "").trim().split(/\s+/)[0] || "";
}
export function lastNameOf(person) {
  if (person?.last_name) return person.last_name;
  const parts = (person?.name || "").trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : "";
}
export function fullNameOf(person) {
  return person?.name ||
    [person?.first_name, person?.last_name].filter(Boolean).join(" ") || "";
}
export function birthNameOf(person) {
  // Geburtsname nur zeigen, wenn abweichend vom aktuellen Nachnamen.
  const bn = person?.birth_name || person?.birthName || null;
  if (!bn) return null;
  return bn === lastNameOf(person) ? null : bn;
}
export function yearOf(person) {
  const d = person?.birth_date || person?.birth || null;
  if (!d) return null;
  const y = parseInt(String(d).slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}
export function deathYearOf(person) {
  const d = person?.death_date || person?.death || null;
  if (!d) return null;
  const y = parseInt(String(d).slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}

/**
 * Kurz-Lebensdaten "* 1866" bzw. "* 1866 † 1934". Leerer String, wenn kein Jahr.
 * (Johannes-Feedback #1: Geburtsjahre an den Labels.)
 */
export function lifespanLabel(person) {
  const b = yearOf(person);
  const d = deathYearOf(person);
  if (b == null && d == null) return "";
  const bs = b == null ? "?" : String(b);
  return d == null ? `* ${bs}` : `* ${bs} \u2020 ${d}`;
}

/**
 * Baut den Label-Text eines Segments fuer eine Zoomstufe.
 * far  -> "Wilhelm"
 * mid  -> "Wilhelm * 1866"                (Jahr bereits ab mittel, Feedback #1)
 * near -> "Wilhelm Goßler (geb. Donner) * 1866 † 1934"
 * @param seg Segment mit .person und optional .partners
 */
export function labelForZoom(seg, level) {
  const p = seg.person;
  if (level === ZOOM_FAR) return firstNameOf(p);

  if (level === ZOOM_MID) {
    const span = lifespanLabel(p).replace(/\s\u2020.*/, ""); // nur Geburtsjahr
    return [firstNameOf(p), span].filter(Boolean).join(" ");
  }

  // near
  const bn = birthNameOf(p);
  const name = fullNameOf(p) + (bn ? ` (geb. ${bn})` : "");
  const span = lifespanLabel(p);
  return [name, span].filter(Boolean).join(" ");
}

/**
 * Deckelt eine Zeichenkette auf die Zahl von Zeichen, die bei gegebener
 * Bogenlaenge und Schriftgroesse lesbar ist (Pixel-Deckel cap(), Feedback #2).
 * @returns gekuerzter String (mit … wenn gekuerzt)
 */
export function cap(text, arcPx, fontPx = 10) {
  if (!text) return "";
  const perChar = fontPx * 0.62;               // grobe mittlere Glyphenbreite
  const maxChars = Math.max(1, Math.floor(arcPx / perChar));
  if (text.length <= maxChars) return text;
  if (maxChars <= 1) return text.slice(0, 1);
  return text.slice(0, maxChars - 1).trimEnd() + "\u2026";
}

// --- Rotation -------------------------------------------------------------
export const WHEEL_PX_PER_TURN = 720; // 720px Raenderweg = volle Umdrehung

/** Wandelt einen vertikalen Raendel-Weg (px) in einen Winkel (rad) um. */
export function wheelDeltaToPhi(deltaPx) {
  return (deltaPx / WHEEL_PX_PER_TURN) * 2 * Math.PI;
}

/**
 * Haelt ein Label lesbar (kein Kopfstand): Segmente in der unteren Haelfte
 * werden um 180° gedreht, sodass Text nie auf dem Kopf steht.
 * @param midAngleRad absoluter Segment-Mittelwinkel INKL. Rotation phi
 * @returns Grad-Rotation fuer das <text>-Element
 */
export function readableTextRotation(midAngleRad) {
  let deg = (midAngleRad * 180 / Math.PI) % 360;
  if (deg < 0) deg += 360;
  const flip = (deg > 90 && deg < 270) ? 180 : 0;
  return deg + flip;
}

// --- viewBox Pan/Zoom -----------------------------------------------------
/**
 * Eine viewBox {x,y,w,h}. size = quadratische Weltgroesse (px).
 */
export function initialViewBox(size) {
  return { x: 0, y: 0, w: size, h: size };
}

/** Zoomfaktor relativ zur Weltgroesse (1 = ganzer Fächer sichtbar). */
export function viewScale(vb, size) {
  return size / vb.w;
}

/**
 * Zoomt um einen Faktor an einem Fokuspunkt (in Weltkoordinaten), sodass der
 * Fokuspunkt an gleicher Bildposition bleibt. Clamped auf [min,max]-Skala.
 */
export function zoomAt(vb, size, focusX, focusY, factor, minScale = 0.28, maxScale = 6) {
  const curScale = viewScale(vb, size);
  let nextScale = curScale * factor;
  nextScale = Math.max(minScale, Math.min(maxScale, nextScale));
  const realFactor = nextScale / curScale;
  const newW = vb.w / realFactor;
  const newH = vb.h / realFactor;
  // Fokuspunkt-Anteil in der aktuellen viewBox
  const tx = (focusX - vb.x) / vb.w;
  const ty = (focusY - vb.y) / vb.h;
  return {
    x: focusX - tx * newW,
    y: focusY - ty * newH,
    w: newW,
    h: newH
  };
}

/** Verschiebt die viewBox um (dxWorld, dyWorld). */
export function panBy(vb, dxWorld, dyWorld) {
  return { x: vb.x + dxWorld, y: vb.y + dyWorld, w: vb.w, h: vb.h };
}

/**
 * Zentriert die viewBox auf einen Weltpunkt bei gegebenem Zoomfaktor.
 * @param zoom Skala (1 = ganzer Fächer). Werte >1 = naeher heran.
 */
export function centerOnPoint(size, worldX, worldY, zoom = 1) {
  const w = size / zoom;
  const h = size / zoom;
  return { x: worldX - w / 2, y: worldY - h / 2, w, h };
}

/** Kartesische Position der Segmentmitte (Weltkoordinaten). */
export function segmentCenterXY(seg, cx, cy) {
  const rMid = (seg.radius0 + seg.radius1) / 2;
  return [cx + rMid * Math.cos(seg.mid), cy + rMid * Math.sin(seg.mid)];
}

/** Lineare Interpolation zweier viewBoxes (fuer Animationen). */
export function lerpViewBox(a, b, t) {
  const k = Math.max(0, Math.min(1, t));
  return {
    x: a.x + (b.x - a.x) * k,
    y: a.y + (b.y - a.y) * k,
    w: a.w + (b.w - a.w) * k,
    h: a.h + (b.h - a.h) * k
  };
}

/** ease-in-out fuer Animationen. */
export function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
