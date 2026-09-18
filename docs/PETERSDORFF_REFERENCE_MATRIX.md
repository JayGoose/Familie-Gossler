# Petersdorff → Gossler Reference Matrix

Öffentliche Referenz (abgerufen und eingefroren 2026-09-18):
- https://petersdorff.github.io/ (Live-Shell)
- https://github.com/petersdorff/petersdorff.github.io/blob/main/FEATURE_SPECIFICATION.md (v43)
- https://github.com/petersdorff/petersdorff.github.io/blob/main/ARCHITECTURE.md

Diese Matrix ist die Abnahmegrundlage. Referenz vor jeder Implementierung erneut lesen,
da sie sich ändern kann. Konkrete Referenzwerte sind unten je Zeile eingefroren, damit
Parität überprüfbar ist. Gossler nutzt eigene Daten und eigene Farben (config.js), kein
fremdes Asset.

## Legende Status
TODO = noch nicht implementiert · WIP = in Arbeit · IMPL = implementiert, noch nicht
unabhängig geprüft · PASS = implementiert + getestet + mobil + synchron geprüft (Task 19).

## Fächer (fan.js) — Standardansicht

| Bereich | Referenzverhalten (eingefroren) | Gossler-Ziel | Status |
|---|---|---|---|
| Fächer-Grundform | radialer Nachkommen-Sunburst in reinem SVG, Wurzel = Stammvater der aktiven Familie im Zentrum | identisches Prinzip, eigenes SVG | TODO |
| Fächer-Ringe | jede Generation = ein Ring (`RING`-Radius), Radius steigt nach außen | gleich | TODO |
| Segmentbreite | Winkelspanne ∝ Zahl der Nachkommen-Blätter der Person (rekursiv verteilt) | gleich | TODO |
| Geschwisterordnung | innerhalb der Eltern nach Geburtsjahr aufsteigend | gleich | TODO |
| Partner | Angeheiratete stehen als „∞ Name" im Segment des Blutsverwandten (hostOf-Map), antippbar | gleich | TODO |
| Ex-Partner | Kennzeichnung „⚮" statt „∞"; Typ bleibt spouse mit former=true | gleich (Seed: former=true) | TODO |
| Segment-/Ringlücken | konstante Lücke `SEG_GAP` (in Winkel je Radius umgerechnet) und `RING_GAP` | gleich | TODO |
| Treffererkennung | per Geometrie (getExtentOfChar/Glyphenzelle), nicht DOM-Hit-Test; Maus 0px, Finger 6px Toleranz | gleichwertig (Geometrie, nicht per-tspan pointer-events) | TODO |
| Farbmodus Geschlecht | Männer hellblau, Frauen rosa, unbekannt grau, Verstorbene entsättigt; registriert dunkler Rand, aktueller Nutzer rot | gleich, Gossler-Farben aus config.js (m #9dbce6, f #e9b1c4, neutral #d2cec5) | TODO |
| Farbmodus Geburtsjahr | Skala ältestes→jüngstes Geburtsjahr je Zweig, Blau→Orange, Legende mit Farbbalken | gleichwertig | TODO |
| Farbmodus Familienname | nur wer aktuell den Nachnamen der Zweigwurzel trägt behält Farbe, Rest grau/`fan-muted`; Legende nennt Namen | gleich (Goßler/Gossler) | TODO |
| Semantic Zoom | 3 Stufen (fern=Vorname, mittel=+Partner-Vornamen, nah=Name+Geburtsname+Jahre); Pixel-Deckel `cap()`, `kFit` je Segment | gleichwertig | TODO |
| Rotation | vertikales Rändelrad rechts (`phi`, 720px = eine Umdrehung), bildschirmfix; Labels bleiben lesbar ausgerichtet | gleichwertig | TODO |
| Highlight | `highlightConnection` umrandet Beteiligte rot, dimmt Rest (`fan-dim`), Viewport lässt Panelplatz | gleich | TODO |
| Zeitstrahl (Year-Modus) | nur im Geburtsjahr-Modus; Drag 6px/Jahr, Wheel 3 Jahre, Tap springt; feste rote Jahresmarke; `.fan-future` opacity 0; fehlende Jahre geschätzt | gleich | TODO |
| Waisen-Ablage | Personen in keiner Familie über Wurzel erreichbar → Pill unten links, Klick öffnet Profil | gleich | TODO |

## Stammtafel (tree.js) — Ansicht `tree`

| Bereich | Referenzverhalten (eingefroren) | Gossler-Ziel | Status |
|---|---|---|---|
| Grundform | reines SVG (kein Cytoscape); `temporal`-Modus entfiel | gleich | TODO |
| Einheit | Blutsverwandter + Partner als Karten-Gruppe (Person 104×40, Partner schmaler darunter, ∞/⚮) | gleich | TODO |
| Verdichtung Geschwister | kinderlose Geschwister zu Spalten gestapelt (bis `MAX_COL_H`≈150), Sammellinie mit Stichleitungen; nur Kinder mit Nachkommen bekommen eigene Teilbäume | gleich | TODO |
| Layout | konturbasiertes Tidy-Layout (linke/rechte Kontur je Ebene, Slots rücken zusammen), Eltern mittig über erstem/letztem Slot | gleich | TODO |
| Kanten | orthogonal; Sammelschiene in Zeilenlücke (`V_GAP`≈60), Abgänge zu Slots | gleich | TODO |
| Generationsbänder | feste Zeilen, abwechselnd hinterlegte Bänder, bildschirmfixe römische Labels links („I", „II", + ab-Jahr) | gleichwertig | TODO |
| Collapse | Chip unter Einheit mit Kindern („−" / „+n"), `toggleCollapse` hält Einheit optisch fix; Sitzungszustand | gleich | TODO |
| Minimap | rechts oben, alle Einheiten als Rechtecke, roter Viewport-Rahmen, Klick/Ziehen springt | gleich | TODO |
| Semantic Zoom | nach px/Einheit: fern Vorname, mittel +Jahre, nah voller Name+Geburtsname+Daten | gleichwertig | TODO |
| Highlight | Pfad-Einheiten `.tree-hl`, Kanten `.tree-edge.hl`, Rest `.tree-dim`; danach `fitToHighlight` | gleich | TODO |
| API | init, render, centerOn(id,zoom,animate), fitAll, highlightConnection, clearHighlight, setCurrentUser, onNodeTap, onBackgroundTap, collapse, getZoom, getBBox | gleichwertig | TODO |

## Gotha-Verzeichnis (gotha.js)

| Bereich | Referenzverhalten (eingefroren) | Gossler-Ziel | Status |
|---|---|---|---|
| Grundform | eingerücktes verschachteltes `<ul>`, je Person eine Zeile; römische Generationsziffer (I=Stammvater) | gleich | TODO |
| Partner-Notation | „; ∞ Name (* Jahr)" bzw. „⚮" für ehemalige | gleich | TODO |
| Ordnung | Geschwister nach Geburtsjahr | gleich | TODO |
| Collapse | Zeilen mit Kindern klappbar (▾/▸), „Alle ausklappen"/„Bis Gen. III einklappen" | gleich | TODO |
| Datenquelle | dasselbe Familienmodell + aktiver Zweig wie Fächer/Tree (`buildFamiliesFrom`) | gleich | TODO |
| scrollTo/Highlight | `scrollTo(id)` klappt Vorfahren auf + blinkt; `highlightConnection` markiert Pfadzeilen | gleichwertig | TODO |

## Familienmodell und Zweige (app-weit)

| Bereich | Referenzverhalten (eingefroren) | Gossler-Ziel | Status |
|---|---|---|---|
| Zweigerkennung | `buildFamilies()`: Wurzel = elternlose Person mit Kindern, nicht eingeheiratet; ein Stammelternpaar = eine Familie (ältester Partner = Wurzel); aus Beziehungen abgeleitet, kein DB-Feld | gleich | TODO |
| Aktiver Zweig | app-weit (`computeFamilies`, `activeFamilyId`, `setActiveFamily`, `ensureFamilyFor`, `familySubset`); gilt in allen 5 Ansichten | gleich | TODO |
| Zweigschalter | `#family-switch` oben, nur bei ≥2 Zweigen; Auswahl in localStorage | gleich (`gossler_family`) | TODO |
| Auto-Wechsel | centerOn/panTo/highlightConnection wechseln bei Bedarf in die Familie der Person; Fächer meldet über onFamilyChange | gleich | TODO |
| Waisen | in keiner Familie erreichbar → einheitliche Waisen-Ablage | gleich | TODO |
| Heirat zwischen Zweigen | erscheint in beiden Fächern als „∞"-Partner | gleich | TODO |

## Ansichtsumschalter und Synchronisierung

| Bereich | Referenzverhalten (eingefroren) | Gossler-Ziel | Status |
|---|---|---|---|
| View-Switch | Pille unten mittig, 5 Icons: Fächer(gender), Fächer-Jahr, Fächer-Name, Gotha, Stammtafel; aktive dunkel; in localStorage (`stammbaum_view`) | gleich (`gossler_view`) | TODO |
| Zustandssync | aktive Familie + Ansicht persistiert; „Im Stammbaum zeigen" wechselt Zweig; Profile/Suche/QR wechseln automatisch in passenden Zweig | gleich | TODO |
| Connection-Sync | Verwandtschaftspanel synchronisiert Highlight in Fächer UND Stammtafel gleichzeitig | gleich | TODO |

## Profile, Vita, Beziehungen

| Bereich | Referenzverhalten (eingefroren) | Gossler-Ziel | Status |
|---|---|---|---|
| Profilpanel | Desktop Seitenpanel (≥600px, 400px), Mobil fullscreen; Foto/Name/Badges/Details/Vita-Auszug/Verbindungen | gleich | TODO |
| Artikelseite | „Ganze Seite öffnen"/„Weiterlesen"; Properties + volle Markdown-Vita (Quelle members.notes) | gleich (vita_markdown) | TODO |
| Markdown | XSS-sicherer Renderer: nur #–###, Absätze, -/1. Listen, >, ---, **, *, http(s)-Links; Rest escaped | gleich (markdown.js) | TODO |
| Verbindungsliste | feste Reihenfolge Eltern→Partner→ehem. Partner→Kinder→Geschwister, innerhalb nach Geburtsdatum | gleich | TODO |
| Beziehungs-Automatik | `propagateLogicalRelations`: nur eindeutig sichere Ergänzungen (2. Elternteil bei genau 1 Partner, Geschwister teilen Eltern, Eltern gemeinsamer Kinder werden Partner); `cleanConflictingRelations` | gleichwertig | TODO |
| Konfliktregel | zwischen zwei Personen nur EIN Beziehungstyp; neuer Typ entfernt alten | gleich | TODO |
| Max Eltern | hartes Limit 2 Eltern pro Kind | gleich (im Seed geprüft) | TODO |
| Profilbild | Upload/Anzeige/Löschen, Bucket nicht public, signierte URL | gleich (bereits in api.js) | IMPL |

## Verwandtschaft, Suche, QR

| Bereich | Referenzverhalten (eingefroren) | Gossler-Ziel | Status |
|---|---|---|---|
| Kinship-Terme | gemeinsamer Vorfahre + BFS-Pfad; Cousin N. Grades, Onkel/Tante mit Gross-/Ur-, „(angeheiratet)", Halb- nur wenn beide 2 Eltern und genau 1 geteilt | gleichwertig (relationship.js) | IMPL |
| DNA-Schätzung | (1/2)^Schritte, Spouse-Pfad = 0%, Anzeige „~X.XX%" | gleichwertig (estimatedSharedDNA) | IMPL |
| Suche | Live-Substring über first/last/birth/location(/Rufname), Debounce, max 8 Treffer | gleich | TODO |
| QR-Code | Erzeugung `#connect/<id>`; Kamera-Scanner mit Fallback wenn BarcodeDetector fehlt | gleich | TODO |
| Deep-Links | `#connect/{id}`, `#admin`, `?zugang=<Code>` | gleich | TODO |

## Zugriffsstufen und Zustände

| Bereich | Referenzverhalten (eingefroren) | Gossler-Ziel | Status |
|---|---|---|---|
| Gast/Familientag | nur mit Code, nur lesen, ohne contact/phone/email; RPC guest_snapshot; Code in localStorage bis Ablauf | gleich (guest_family_snapshot, rate-limitiert) | IMPL (Backend) |
| Pending | Warteseite; mit Code sofort approved (redeem) | gleich (redeem_family_day_code_rl) | IMPL (Backend) |
| Member approved | alles lesen inkl. Kontakt; Platzhalter/unbeanspruchte anlegen/ändern; eigenes nur Inhaber/Admin | gleich (RLS) | IMPL (Backend) |
| Admin | Nutzerverwaltung, Status setzen, Claim/Unclaim, Code setzen | gleichwertig | IMPL (Backend) |
| Sichtbare Zustände | Loading, Empty, Error, Guest, Pending, Member, Admin dokumentiert | gleich | TODO |

## Akzeptanz
Eine Zeile darf erst PASS werden, wenn:
1. implementiert,
2. reproduzierbar getestet,
3. mobil geprüft (320/375/430px),
4. bei Interaktion mit anderen Ansichten synchron geprüft.

Der unabhängige parity-reviewer (Task 19) vergibt PASS/FAIL je Zeile mit Evidenz.
