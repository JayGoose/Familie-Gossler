# STATUS — gossler-family-tree

Operative Quelle für dieses Projekt (der globale `projects.md` führt nur Pfad und Lifecycle).

- **Pfad:** `~/code/gossler-family-tree/`
- **Lifecycle:** active
- **Rolle:** Private Familien-Webanwendung (Familie Gossler), Funktions- und Ansichtsparität
  mit der öffentlich dokumentierten Petersdorff-Referenz, eigener Code und Gossler-Daten.
- **Stand:** 2026-09-18

## Aktueller Fortschritt

Task 1 (Ablage und Baseline): abgeschlossen.
- Projekt von `~/Downloads/gossler_kiro_1to1_parity` nach `~/code/gossler-family-tree/`
  verschoben.
- Baseline ausgeführt: `clone_audit.py` PASS, `npm test` FAIL (Modultyp-Problem).
- Findings in `docs/KIRO_FINDINGS.md`.

Nächster Schritt: Task 2 (Gossler-Seed aus den sieben Quelldokumenten aufbauen/abgleichen).

## Wichtige Rahmenbedingungen
- Familientag-Zugangscode nur zur Laufzeit, niemals in Repo/Logs/Commits.
- `private_seed/` muss gitignored werden, bevor ein Repo initialisiert oder gepusht wird
  (siehe Finding P2.3).
- Keine erfundenen/unbestätigten Familiendaten; Unsicheres markiert.
- Kein Go-Live, solange Release Gate nicht PASS.

## Referenzquellen
- https://petersdorff.github.io/ (Live-Shell, öffentlich)
- FEATURE_SPECIFICATION.md und ARCHITECTURE.md im öffentlichen Petersdorff-Repo.
- Bundle-Doku: `docs/PETERSDORFF_REFERENCE_MATRIX.md`, `docs/REFERENCE_NOTES_2026-09-16.md`.

## Offene Entscheidungen für Johannes
- Datenmodell-Vereinheitlichung (Seed vs. `relationship.js` vs. Tests) — wird in Task 5/7
  vorgeschlagen.

## Task 2 (Gossler-Seed aus Quelldokumenten): abgeschlossen (2026-09-18)
- Sieben Quelldokumente gefunden in `~/Downloads/Persoenlich/Familie/FAMILIE GOSSLER/Allgemeines/`
  und `~/Desktop/Johannes/KI_Stammbaum/`.
- .doc via textutil, PDF via pypdf (lokale .venv) extrahiert nach `private_seed/_sources/`.
- Seed erweitert: frühe Berenberg-Gossler-Linie von Claus Goßler (1630) bis Wilhelm (1811)
  ∞ Elisabeth Donner → Wilhelm (1866) ergänzt. Jetzt 107 Personen, 167 Beziehungen.
- Unsichere/widersprüchliche Werte mit status="unsicher" und Quelle markiert; Widersprüche in
  `openQuestions` dokumentiert.
- `.gitignore`: `private_seed/` und `.venv/` aktiviert (Finding P2.3 behoben).

## Fächer-Demo (Option B, 2026-09-18): sichtbar und verifiziert
- `public/fan-demo.html` + `scripts/build_demo_graph.mjs` (Demo-Daten nach `public/demo-graph.json`,
  gitignored). Lokal via `npx serve public -l 8080`, geöffnet `/fan-demo.html`.
- Verifiziert im Browser (Playwright): Sunburst rendert, Claus im Zentrum, Ringe je Generation,
  Segmente ∝ Nachkommen. Farbmodus Geschlecht (blau/rosa) und Geburtsjahr (blau→orange, Personen
  ohne Jahr grau) funktionieren. Zweigschalter zeigt „Claus Goßler (96)". Waisen 0. Keine
  Konsolenfehler.
- Offene visuelle Feinpunkte (bewusst, für spätere Tasks): innere Generationen (Claus→Wilhelm-
  Linie) sind breite fast-leere Ringe, weil je Generation nur 1–2 Personen; Label-Lesbarkeit
  innen; Start-Keil oben durch SEG_GAP. Pan/Zoom/Rotation/Semantic-Zoom noch offen (Task 9),
  Zeitstrahl (Task 10).

## ÜBERGABEPUNKT für Neustart / KiroCrew (2026-09-18)

Stand: 8 von 20 Tasks der Spec `.kiro/specs/production-finish` sinngemäß erledigt
(Ablage/Baseline, Seed+frühe Linie, Web-Abgleich, Security-Hardening, Genealogie-Invarianten,
Referenz-Matrix, Familienmodell, Fächer-Kern). Alles neustart-fest, Kontext liegt in den Dateien.

### Was fertig und getestet ist (33 Node-Tests grün, clone_audit PASS)
- `public/js/relationship.js` (Kinship-Bugs behoben), `public/js/family-model.js`,
  `public/js/fan-layout.js`, `public/js/fan.js` (SVG-Sunburst).
- `supabase/migrations/008_security_hardening.sql` (2 kritische Lücken behoben) + `api.js`.
- Seed `private_seed/gossler.seed.json` (107 Personen, 167 Beziehungen, frühe Linie bis Claus 1630,
  Unsicheres markiert). Demo: `scripts/build_demo_graph.mjs` → `public/demo-graph.json` (gitignored),
  `public/fan-demo.html`.
- Referenz-Matrix `docs/PETERSDORFF_REFERENCE_MATRIX.md`, Findings `docs/KIRO_FINDINGS.md`,
  Research `docs/GOSSLER_RESEARCH.md`, Security `docs/SECURITY_CHECKLIST.md`.

### Johannes-Feedback zum Fächer (MUSS in Task 9/10 umgesetzt werden)
1. Geburtsjahre an den Labels anzeigen (Semantic Zoom nah = Name + * Jahr [† Jahr]).
2. Label-Lesbarkeit: Rotation lesbar halten, Pixel-Deckel, Namen je Zoomstufe kürzen.
3. Innere Ringe wirken leer, weil die frühe Linie Claus→Wilhelm je Generation nur 1 Person hat.
   ENTSCHEIDUNG (Empfehlung, von Johannes noch final zu bestätigen): Default-Einstieg des Fächers
   auf eine breiter verzweigte Wurzel legen (z.B. Wilhelm Goßler *1866 = `wilhelm1866`), frühe Linie
   bleibt im Datenbestand und über Zweigschalter erreichbar. Volle historische Tiefe bleibt erhalten.

### Nächste offene Tasks (Reihenfolge)
9. Fächer-Interaktion: Pan/Zoom (viewBox), Semantic Zoom (fern/mittel/nah), Rotation (Rändelrad),
   centerOn/panTo Animation, Legenden je Farbmodus, Label-Verbesserungen (Punkte 1+2 oben).
10. Fächer-Zeitstrahl (nur Year-Modus): Drag 6px/Jahr, Wheel 3 Jahre, Tap, feste Jahresmarke,
    `.fan-future` opacity 0, fehlende Geburtsjahre schätzen.
11. Stammtafel v2 `public/js/tree.js` (SVG): Person+Partner-Einheiten, kinderlose Geschwister
    gestapelt, konturbasiertes Tidy-Layout, orthogonale Kanten, Generationsbänder, Collapse,
    Minimap, Semantic Zoom, Highlight+fitToHighlight. Gleiche Datenquelle wie fan (family-model).
12. Gotha-Verzeichnis `public/js/gotha.js`: eingerückt/klappbar, römische Ziffern, Partner ∞/⚮,
    Geschwister nach Jahr, gleicher aktiver Zweig.
13. App-weite Synchronisierung `public/js/app.js`: 5-View-Switch (Fächer gender/year/name, Gotha,
    Stammtafel), aktive Familie + Ansicht in localStorage (gossler_view, gossler_family),
    „Im Stammbaum zeigen", Profile/Suche/QR-Sync, Highlight synchron Fächer+Stammtafel.
14. Auth/Gast/Admin E2E. 15. Profil/Vita/Artikel/Beziehungen. 16. Accessibility/Mobile.
17. Backup/Restore + Deploy-Härtung. 18. Differential Visual QA. 19. Unabhängige Reviews.
20. Release Review + Gate.

### Wichtige technische Fakten für den Weiterbau
- package.json hat `"type":"module"`, Tests via `node --test tests/`.
- Kanonisches Datenschema ist DB-Schema: relations `{person_a, person_b, relation_type: parent|partner, former}`.
  Seed nutzt kompaktes `{a, b, type}` → beim Laden mappen (siehe build_demo_graph.mjs / Tests).
- `relationship.js indexGraph(people, relations)` → `{P, parents, children, partners}`.
- `family-model.computeFamilies` → Familien mit `bloodIds` (Blut) und `memberIds` (+Partner).
- Farben in `public/js/config.js` CONFIG.ui (m #9dbce6, f #e9b1c4, neutral #d2cec5, path #d8b64b,
  minTreeScale 0.28, maxTreeScale 2.2).
- `ring.js` ist als VERALTET markiert (nicht mehr Paritätsansicht, nicht in den View-Switch).
- Live-Verifikation (echtes Supabase, Auth-Flows, Visual QA) braucht ein Supabase-Projekt +
  laufenden Server; noch nicht konfiguriert. Familientag-Code NUR zur Laufzeit, nie ins Repo.

### Aufräum-Hinweis
- `public/fan-demo.html`, `public/demo-graph.json`, `scripts/build_demo_graph.mjs` sind reine
  lokale Demo-Artefakte. demo-graph.json ist gitignored. fan-demo.html kann vor Release entfernt
  oder als Entwickler-Vorschau behalten werden.
