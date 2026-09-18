# Tasks — Production Finish

- [ ] 1. Baseline erstellen
  - alle vorhandenen Tests/Audits ausführen
  - Fehler und Warnungen in `docs/KIRO_FINDINGS.md` dokumentieren
  - keine Codeänderung vor Baseline

- [ ] 2. Security Review
  - RLS, RPC, Views, Storage und Edge Functions prüfen
  - `people_public` auf Security-Invoker/RLS-Verhalten prüfen
  - Relations-Delete-Rechte minimieren
  - Profilbild-Storage auf Person/Admin scopen
  - Gastcode-Bruteforce/Rate-Limit-Risiko bewerten
  - XSS/IDOR testen

- [ ] 3. Genealogie Review
  - Seed auf Zyklen, Selbstrelationen, Duplikate prüfen
  - Voll/Halb/Stief Regressionstests ergänzen
  - alle Platzhalter/unsicheren Werte auflisten
  - keine Daten still korrigieren

- [ ] 4. UI/Parity Review
  - Baum, Ring, Generationen, Timeline, Profile, Admin prüfen
  - „Ganze Seite öffnen“ wirklich als Vollseitenansicht implementieren/testen
  - Ringaktionen ohne manuelle UUID-Eingabe nutzbar machen
  - unverbundene Personen korrekt behandeln
  - Profilbild-Flow testen

- [ ] 5. Auth & Admin E2E
  - Registrierung
  - Pending
  - Freigabe + Personenverknüpfung
  - Login
  - Passwort-Reset
  - Sperren
  - Gastcode gültig/ungültig/abgelaufen
  - Freigabe-Mail

- [ ] 6. Accessibility/Mobile
  - Tastatur, Fokus, ARIA, Touch
  - 320/375/430 px
  - Safari/Chrome relevante Fallbacks
  - QR-Scanner-Fallback wenn BarcodeDetector fehlt

- [ ] 7. Backup/Restore
  - Export erzeugen
  - dokumentierten Restore-Prozess ergänzen
  - Restore in Testprojekt validieren

- [ ] 8. Independent Reviews
  - security-reviewer
  - genealogy-reviewer
  - parity-reviewer
  - Findings beheben und erneut prüfen

- [ ] 9. Release Review
  - alle Tests erneut
  - `docs/PARITY_AUDIT.md` aktualisieren
  - `docs/GO_LIVE_CHECKLIST.md` vollständig
  - `docs/KIRO_RELEASE_REPORT.md` mit PASS/PASS WITH KNOWN GAPS/FAIL
  - nur bei PASS Go-Live empfehlen


# 1:1-Paritätsphase

- [ ] 10. Referenz-Inventar einfrieren
  - öffentliche `ARCHITECTURE.md` und `FEATURE_SPECIFICATION.md` lesen
  - sichtbare Referenzseite testen
  - `docs/PETERSDORFF_REFERENCE_MATRIX.md` vollständig ausfüllen
  - keine Implementierung beginnen, bevor Matrix vorhanden ist

- [ ] 11. Shared Family Model
  - graphbasierte Familienwurzeln implementieren
  - aktive Familie app-weit
  - familySubset / ensureFamilyFor
  - Waisen-/Unverbunden-Ablage
  - Tests für Heirat zwischen Zweigen

- [ ] 12. Echten Fächer implementieren
  - neues `public/js/fan.js`
  - radialer Nachkommen-Sunburst
  - Segmentwinkel nach Nachkommen-Blattgewicht
  - Partner im Host-Segment
  - ehemalige Partner
  - Geschwister nach Geburtsjahr
  - Segmentlücken / Ringlücken
  - Touch- und Klickziele
  - einfachen `ring.js` nicht als finale Ansicht verwenden

- [ ] 13. Fächer-Interaktion
  - Pan/Zoom
  - Semantic Zoom
  - Rotation/Rändelrad
  - centerOn / panTo
  - Highlight + Dimmen
  - Gender-/Year-/Name-Farbmodus
  - Legenden synchronisieren

- [ ] 14. Fächer-Zeitstrahl
  - nur im Year-Modus
  - Jahre/Decades
  - Drag / Wheel / Tap
  - feste Jahresmarke
  - Fächer wächst/schrumpft nach Zeitfilter

- [ ] 15. Stammtafel v2
  - SVG
  - Person+Partner-Einheiten
  - kinderlose Geschwister stapeln
  - konturbasiertes Tidy-Layout
  - orthogonale Kanten
  - Generationsbänder
  - Collapse
  - Minimap mit Viewport
  - Semantic Zoom
  - Highlight + fitToHighlight

- [ ] 16. Gotha-/Verzeichnisansicht
  - aktiver Zweig
  - Generationen eingerückt
  - klappbar
  - gleiche Family-Model-Quelle wie Fan/Tree

- [ ] 17. App-weite Synchronisation
  - 5-Ansichten-Umschalter
  - aktive Familie
  - localStorage für Ansicht/Familie
  - `Im Stammbaum zeigen`
  - Profile/Search/QR wechseln automatisch in passenden Zweig

- [ ] 18. Differential Visual QA
  - Referenz und Gossler Seite nebeneinander
  - Desktop + 430 px + 375 px
  - Screenshots je Ansicht/Zustand
  - alle Unterschiede kategorisieren: intentional / bug / cosmetic
  - keine offenen funktionalen Unterschiede

- [ ] 19. Finales unabhängiges Parity Review
  - parity-reviewer darf keine Implementierung ändern
  - jede Zeile der Reference Matrix prüfen
  - Ergebnis nur PASS wenn alle sichtbaren Kernfunktionen äquivalent sind
