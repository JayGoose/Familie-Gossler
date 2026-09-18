# Clone-Engineering Prompt Stack

Diese Prompts dienen als Entwicklungs- und QA-Rahmen für die Gossler-Version.
Ziel: funktionale Parität mit der öffentlich sichtbaren Referenz, ohne fremden
Quellcode oder fremde Assets zu kopieren.

---

## Prompt 1 — Behaviour Inventory

**Rolle:** Senior Reverse-Engineering Engineer

**Aufgabe:**
Analysiere die Referenzoberfläche ausschließlich anhand öffentlich sichtbarer
Interaktionen. Erstelle keine Vermutungen über private Backend-Implementierung.

Erfasse pro Funktion:
- Einstiegspunkt
- sichtbaren Zustand davor
- Benutzeraktion
- sichtbaren Zustand danach
- Fehlermeldungen / Edge Cases
- Rollenabhängigkeit
- mobile Unterschiede
- Datenabhängigkeiten
- Persistenz
- Sicherheitsrelevanz

**Abnahme:**
Jede sichtbare Funktion muss mindestens einen Testfall besitzen.

---

## Prompt 2 — Pixel & Interaction Parity

**Rolle:** Senior Frontend Engineer + Product Designer

**Aufgabe:**
Vergleiche Referenz und Gossler-Version komponentenweise:
- Navigation
- Abstände
- Typografie
- Karten
- Overlays
- Buttons
- Hover/Focus
- aktive Zustände
- responsive Verhalten
- Leerzustände
- Fehlerzustände
- Ladezustände

Priorisiere:
1. Informationsarchitektur
2. Interaktionslogik
3. Layout
4. visuelle Details

**Nicht kopieren:**
Wappen, Bilder, Texte, Logos oder geschützte Assets der Referenz.

---

## Prompt 3 — State Machine Audit

**Rolle:** Application Architect

**Aufgabe:**
Behandle die Anwendung als Zustandsmaschine.

Auth-Zustände:
- unauthenticated
- guest
- pending
- member
- admin

UI-Zustände:
- tree
- ring
- generations
- timeline
- person-profile
- full-profile
- admin
- scanner
- privacy

Prüfe für jeden Zustandsübergang:
- erlaubte Rollen
- Datenladevorgänge
- Fehlerpfade
- Rücknavigation
- Persistenz
- Race Conditions

**Abnahme:**
Kein Zustand darf durch Browsermanipulation privilegierte Daten freigeben.

---

## Prompt 4 — Genealogy Data Invariants

**Rolle:** Genealogy Data Engineer

**Aufgabe:**
Prüfe jede Relation gegen folgende Invarianten:
- Person kann nicht Elternteil von sich selbst sein.
- Parent-Relationen dürfen keine Zyklen erzeugen.
- Partnerrelationen sind symmetrisch.
- Halbgeschwister = exakt ein gemeinsamer dokumentierter Elternteil.
- Vollgeschwister = zwei gemeinsame dokumentierte Elternteile.
- Stiefbeziehungen werden nicht als Blutsverwandtschaft dargestellt.
- Bei fehlender Quelle: `ungeklärt`, nicht erraten.
- Datumsfehler dürfen nicht automatisch korrigiert werden.
- Quelle jeder genealogischen Relation muss nachvollziehbar sein.

**Abnahme:**
Unsichere Beziehungen werden sichtbar markiert.

---

## Prompt 5 — Security / Abuse Review

**Rolle:** Security Engineer

Simuliere:
- Gast versucht Kontakte per API abzurufen.
- Member versucht Admin-RPCs.
- manipuliertes JWT
- abgelaufener Familientag-Code
- Rate-Limit-Missbrauch
- direkte Storage-URL
- XSS in Vita-Markdown
- schädliche Dateiuploads
- IDOR bei Profilbearbeitung
- Datenexport durch Nicht-Admin
- QR-Link-Manipulation

**Abnahme:**
Sicherheit darf nicht nur im Frontend erzwungen werden; RLS/RPC muss blockieren.

---

## Prompt 6 — Accessibility & Responsive Review

**Rolle:** Accessibility Engineer

Prüfe:
- Tastaturbedienung
- sichtbare Fokuszustände
- ARIA-Labels
- Farbkontrast
- Touch-Ziele
- iPhone Safari
- Android Chrome
- Desktop Safari/Chrome/Firefox/Edge
- Zoom bis 200 %
- Screenreader-Navigation
- reduzierte Bewegung (`prefers-reduced-motion`)

**Abnahme:**
Keine Kernfunktion darf ausschließlich Hover erfordern.

---

## Prompt 7 — Differential Parity Test

**Rolle:** QA Lead

Erstelle eine Matrix:

| Feature | Referenz sichtbar | Gossler vorhanden | Gleiches Verhalten | Abweichung | Kritikalität |
|---|---|---|---|---|---|

Teste mindestens:
- Login
- Registrierung
- Passwort-Reset
- Gastzugang
- Wer bist du?
- Baum
- Ring
- Generationen
- Timeline
- Personensuche
- Verwandtschaft
- Profile
- Vita
- Bearbeitung
- Verbindungen
- QR
- Scanner
- Nutzerverwaltung
- Familientag-Code
- Datenschutz

---

## Prompt 8 — Release Gate

**Rolle:** Staff Engineer

Ein Release ist nur erlaubt, wenn:
- keine kritischen Parity-Gaps offen
- keine High-Security-Funde offen
- Gastdaten sauber getrennt
- Member/Admin-Rollen serverseitig geprüft
- Backup wiederherstellbar
- Tests für Verwandtschaftslogik grün
- mobile Kernflows geprüft
- Datenschutztext geprüft
- Seed-Daten nicht versehentlich öffentlich
- keine Service-Role-Secrets im Frontend

**Release-Entscheidung:**
- PASS
- PASS WITH KNOWN GAPS
- FAIL

Mit Begründung.
