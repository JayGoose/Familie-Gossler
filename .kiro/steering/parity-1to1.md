---
inclusion: always
---
# 1:1 Funktions- und Ansichtsparität

Referenz:
- https://petersdorff.github.io/
- https://github.com/petersdorff/petersdorff.github.io
- ARCHITECTURE.md und FEATURE_SPECIFICATION.md des öffentlichen Repositories

Ziel ist vollständige sichtbare und funktionale Parität mit Gossler-Daten.

## Pflichtansichten
1. Fächer — Geschlecht
2. Fächer — Geburtsjahr
3. Fächer — Familienname
4. Gotha-/Generationenverzeichnis
5. Stammtafel
6. Profil / Artikelseite
7. Verwandtschaftspanel
8. Suche
9. QR / Connect-Deep-Link
10. Auth / Gast / Pending / Admin

## Fächer
Nicht als Punkt-Ring darstellen. Erforderlich ist ein radialer Nachkommen-Sunburst:
- aktive Familienwurzel / Stammeltern im Zentrum
- jede Generation = Ring
- Segmentwinkel proportional zur Anzahl der Nachkommen-Blätter
- Geschwister nach Geburtsjahr
- Blutsverwandte als Segmente
- Partner im Segment des Blutsverwandten
- ehemalige Partner als solche sichtbar
- semantischer Zoom
- Pan/Zoom
- Rotation mit eigenem Rändelrad
- Pfad-Highlight + Dimmen
- automatische Zweigumschaltung
- Farbmodi Geschlecht / Jahr / Familienname
- Zeitstrahl in der Geburtsjahransicht

## Stammtafel
Erforderlich:
- Personen-/Partnereinheiten
- kinderlose Geschwister gestapelt
- konturbasiertes verdichtetes Layout
- orthogonale Verbindungen
- Generationsbänder
- Ein-/Ausklappen mit Nachkommenanzahl
- echte Minimap mit Viewport
- semantischer Zoom
- Pfad-Highlight und automatisches Aufklappen
- centerOn / fitAll / highlightConnection-Verhalten

## Familienzweige
Nicht als manuelles DB-Feld behandeln, wenn die Referenz sie aus Beziehungen ableitet.
Wurzeln/Familien sollen aus dem Graphen bestimmt werden; unverbundene Personen bleiben
in einer Waisen-/Unverbunden-Ablage.

## Abnahme
„Ungefähr gleich“ ist FAIL.
Für jede Referenzfunktion braucht es:
- Implementierung
- reproduzierbaren Test
- Parity-Matrix-Eintrag
- mobile Prüfung
