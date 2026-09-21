// map.js — Ortskarte (6. Ansicht, Referenzparität zu Petersdorff).
// Gruppiert Personen nach Wohnort (`residence`), geokodiert JE ORTSNAME einmal
// über Nominatim (öffentlich, Ergebnis in localStorage gecacht) und zeigt pro Ort
// einen Marker mit Personenzahl. Datenschutz: es gehen NUR Ortsnamen an den
// Geocoder, niemals Personennamen/Kontakte. Karte lädt OSM-Kacheln.

const GEOCACHE_KEY = "gossler_geocache_v1";
const NOMINATIM = "https://nominatim.openstreetmap.org/search";

let map = null;
let layer = null;

function loadCache() {
  try { return JSON.parse(localStorage.getItem(GEOCACHE_KEY) || "{}"); } catch (_) { return {}; }
}
function saveCache(c) { try { localStorage.setItem(GEOCACHE_KEY, JSON.stringify(c)); } catch (_) {} }

function personName(p) { return [p?.first_name, p?.last_name].filter(Boolean).join(" ").trim() || "Unbenannt"; }

// Ortsnamen normalisieren (grobe Stadtebene): nur der erste, wichtigste Teil.
function normalizePlace(residence) {
  if (!residence) return null;
  // "Hamburg, Deutschland" -> "Hamburg"; nimmt den Teil vor dem ersten Komma,
  // fällt sonst auf den ganzen String zurück.
  const first = String(residence).split(",")[0].trim();
  return first || null;
}

async function geocode(place, cache) {
  if (cache[place]) return cache[place];
  const url = `${NOMINATIM}?format=json&limit=1&q=${encodeURIComponent(place)}`;
  try {
    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) return null;
    const arr = await res.json();
    if (!arr.length) { cache[place] = null; saveCache(cache); return null; }
    const { lat, lon } = arr[0];
    const coord = { lat: parseFloat(lat), lon: parseFloat(lon) };
    cache[place] = coord; saveCache(cache);
    return coord;
  } catch (_) { return null; }
}

export function init() { /* Leaflet wird lazy in render() geprüft */ }

/**
 * @param canvas  Ziel-Container (#view-canvas)
 * @param people  Personenliste (DB-Schema)
 * @param bloodIds optional: nur Personen des aktiven Zweigs
 * @param onPerson Klick-Callback
 */
export async function render(canvas, people, bloodIds, onPerson) {
  if (typeof L === "undefined") {
    canvas.innerHTML = `<p style="padding:16px">Karte konnte nicht geladen werden (Leaflet fehlt).</p>`;
    return;
  }
  canvas.innerHTML = `<div id="map-canvas" style="position:absolute;inset:0"></div>
    <div class="map-note">Wohnorte der Familie · Zahl = Personen am Ort · nur Ortsnamen werden zur Kartensuche verschickt</div>`;
  const host = canvas.querySelector("#map-canvas");

  // Personen nach Ort gruppieren.
  const groups = new Map(); // place -> [people]
  for (const p of people) {
    if (bloodIds && !bloodIds.has(p.id)) continue;
    const place = normalizePlace(p.residence);
    if (!place) continue;
    if (!groups.has(place)) groups.set(place, []);
    groups.get(place).push(p);
  }

  // Karte aufbauen (Deutschland-zentriert als Startsicht).
  if (map) { map.remove(); map = null; }
  map = L.map(host, { scrollWheelZoom: true }).setView([51.2, 10.4], 5);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: '© OpenStreetMap-Mitwirkende'
  }).addTo(map);
  layer = L.layerGroup().addTo(map);

  if (!groups.size) {
    canvas.querySelector(".map-note").textContent = "Keine Wohnorte hinterlegt.";
    return;
  }

  const cache = loadCache();
  const bounds = [];
  // Sequentiell geokodieren (Nominatim bittet um max. 1 Anfrage/Sekunde).
  for (const [place, persons] of groups) {
    const coord = await geocode(place, cache);
    if (!coord) continue;
    bounds.push([coord.lat, coord.lon]);
    const count = persons.length;
    const icon = L.divIcon({
      className: "map-pin",
      html: `<span>${count}</span>`,
      iconSize: [30, 30], iconAnchor: [15, 15]
    });
    const list = persons.map(p => `<button data-id="${p.id}" class="map-person">${personName(p)}</button>`).join("");
    const marker = L.marker([coord.lat, coord.lon], { icon })
      .bindPopup(`<div class="map-popup"><b>${place}</b><div class="map-plist">${list}</div></div>`);
    marker.on("popupopen", (e) => {
      const el = e.popup.getElement();
      el?.querySelectorAll("[data-id]").forEach(b => b.onclick = () => onPerson && onPerson(b.dataset.id));
    });
    marker.addTo(layer);
    // Nominatim-Fairness: kurze Pause zwischen frischen Anfragen (nicht bei Cache).
    if (!cache.__hit) await new Promise(r => setTimeout(r, cache[place] ? 0 : 1100));
  }
  if (bounds.length) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
}

export function hide() {
  if (map) { map.remove(); map = null; }
}

export const MapView = { init, render, hide };
export default MapView;
