# Requirements — Production Finish

## R1 Datenschutz
Als Familienmitglied möchte ich, dass private Kontaktdaten nur autorisierten Rollen zugänglich sind.

Akzeptanz:
- Gast kann Kontakte weder UI- noch API-seitig lesen.
- Pending/blocked erhalten keine Familiendaten.
- Member/Admin-Zugriffe entsprechen dokumentierter Rollenmatrix.

## R2 Genealogische Korrektheit
Als Familienmitglied möchte ich korrekte Beziehungen ohne erfundene Ableitungen.

Akzeptanz:
- Parent-Zyklen werden verhindert.
- Voll/Halb/Stief werden korrekt unterschieden.
- Unsichere Daten sind markiert.
- Relationship-Pfad besitzt Regressionstests.

## R3 Funktionsparität
Als Nutzer möchte ich die öffentlich sichtbaren Kernabläufe der Referenz in der Gossler-Version.

Akzeptanz:
- Auth, Gast, Wer-bist-du, Baum, Ring, Generationen, Timeline, Suche, Profile,
  Vita, Beziehungen, QR, Scanner und Admin sind getestet.
- Abweichungen stehen in `docs/PARITY_AUDIT.md`.

## R4 Production Readiness
Als Administrator möchte ich sicher deployen und wiederherstellen können.

Akzeptanz:
- Migrationen reproduzierbar.
- Backup UND Restore getestet.
- GitHub Pages enthält nur `public/`.
- Edge Function für Freigabe-Mail funktioniert oder Feature ist sauber deaktiviert.
- Security- und Clone-Audit grün.

## R5 Mobile & Accessibility
Akzeptanz:
- Kernflows bei 320–430 px funktionieren.
- keine Kernfunktion ausschließlich per Hover.
- Tastaturfokus sichtbar.
- 200%-Zoom ohne Funktionsverlust.
- sinnvolle ARIA/Labels für interaktive Controls.


# R6 — Exakte Referenzparität

Als Familienmitglied möchte ich dieselben öffentlich sichtbaren Ansichten und Bedienabläufe
wie in der Petersdorff-Anwendung, jedoch vollständig mit Gossler-Daten.

Akzeptanz:
- Der bisherige einfache Ring ist nicht ausreichend.
- Fächer ist ein echter Nachkommen-Sunburst.
- Fächer besitzt Gender-, Year- und Name-Modus.
- Year-Modus besitzt interaktiven Zeitstrahl.
- Familienzweige werden graphbasiert erkannt und app-weit umgeschaltet.
- Partner erscheinen im Segment des Blutsverwandten.
- Fächer unterstützt semantischen Zoom, Rotation, Pan/Zoom und Connection-Highlight.
- Stammtafel besitzt verdichtetes Tidy-Layout, gestapelte kinderlose Geschwister,
  orthogonale Kanten, Generationsbänder, Collapse, Minimap und Semantic Zoom.
- Gotha-/Generationenverzeichnis entspricht dem Referenzzweck und verwendet denselben aktiven Zweig.
- „Im Stammbaum zeigen“ wechselt bei Bedarf automatisch in den richtigen Zweig.
- Verwandtschaftspanel synchronisiert Highlight in Fächer und Stammtafel.
- Connect-QR/Deep-Link öffnet die referenzierte Person/Verbindung.
- Alle fünf Hauptansichten sind über denselben globalen aktiven Familienzweig synchronisiert.

# R7 — Sichtbare Zustandsparität

Akzeptanz:
- Loading-, Empty-, Error-, Guest-, Pending-, Member- und Admin-Zustände dokumentiert.
- Aktive Ansichten und Zweige werden wie in der Referenz sinnvoll in der Sitzung bzw.
  lokal gespeichert.
- Mobile Panels, Bottom-Sheets/FAB-Konflikte und Touch-Ziele sind geprüft.
