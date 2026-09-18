# Kiro Findings — Baseline

Stand: 2026-09-18. Erhoben bei Task 1 (Baseline), ohne Produktcode-Änderung.
Umgebung: Node v20.13.1, Python 3.14.7. Kein Git-Repo im Bundle (kein `.git`).

## Ausgeführte Audits/Tests

| Prüfung | Befehl | Ergebnis |
|---|---|---|
| Clone-Audit (statisch) | `python3 scripts/clone_audit.py` | PASS (beide Checks) |
| Relationship-Unit-Test | `npm test` (`node tests/relationship.test.mjs`) | FAIL |

### Clone-Audit — Detail
- PASS: required clone-control surfaces detected.
- PASS: no obvious secret pattern in public/.
- Exit 0.

### npm test — Detail
- FAIL mit `SyntaxError: Named export 'indexGraph' not found ... CommonJS module`.
- Der Test importiert `indexGraph`/`relationshipLabel` aus `../public/js/relationship.js`.
  Das Modul verwendet `export function`, wird von Node im Testkontext aber als CommonJS
  behandelt. Ursache ist der fehlende Modultyp: keine `package.json` mit `"type": "module"`
  und keine `.mjs`-Endung für das importierte Frontend-Modul. Der Test selbst (`.mjs`)
  ist ESM, das importierte `.js` wird als CJS interpretiert.

## Priorisierte Fehlerliste

### P1 — blockiert Tests / Datenintegrität
1. **Testlauf schlug fehl (Modultyp).** BEHOBEN (Task 5): `"type": "module"` in `package.json`;
   Test-Script auf `node --test tests/` umgestellt. Alle Tests grün.
2. **Seed-Schema vs. Code/DB-Schema.** GEKLÄRT (Task 5): Kanonisch ist das DB-Schema
   (`person_a`/`person_b`/`relation_type`), wie es Migration 001 und `api.js` verwenden.
   Der Seed nutzt das kompakte `{a, b, type}`. Die Testsuite mappt Seed→DB-Schema beim Laden.
   Ein produktiver Seed→DB-Importer wird in Task 7 (Fundament) bereitgestellt.
   Nichts still angeglichen.

### P1b — Genealogie-Bugs (Task 5, behoben)
- `relationship.js` lieferte Voll-Verwandtschaften kleingeschrieben ("schwester", "onkel",
  "neffe"), weil das Groß-Präfix nur im Halb-Fall gesetzt wurde. BEHOBEN: Vollverwandtschaft
  liefert jetzt "Bruder/Schwester", "Onkel/Tante", "Neffe/Nichte"; Halb-Fall bleibt
  "Halbbruder" etc. Regressionstests ergänzt.

### P2 — Sicherheit / Datenschutz
3. **`private_seed/` ist NICHT gitignored.** BEHOBEN (Task 2): `.gitignore` aktiviert jetzt
   `private_seed/` und `.venv/`.
4. **Supabase-RLS/RPC auditiert (Task 4).** Vier Findings, alle in `008_security_hardening.sql`
   und `api.js` behoben:
   - S1 KRITISCH: View `people_public` umging RLS → `security_invoker=true`, anon-Zugriff entzogen.
   - S2 KRITISCH: Familientag-Code ohne Rate-Limit → rate-limitierte RPCs + `code_attempts`.
   - S3 MITTEL: `usage_events` beliebig beschreibbar → nur noch über `track_usage`.
   - S4 GERING: Doppelverknüpfung in `create_and_link_my_person` → Vorabprüfung.
   Details in `docs/SECURITY_CHECKLIST.md`. Live-Verifikation im echten Supabase-Projekt steht
   noch aus (kein Projekt konfiguriert).

### P3 — Parität (bekannt, geplant)
5. **`ring.js` ist nur ein konzentrischer Punkt-Ring**, kein Nachkommen-Sunburst. Zählt
   laut `FEATURE_PARITY.md` und Reference Matrix NICHT als Parität. Ersatz durch `fan.js`
   in Task 8.
6. **Fehlende Module gegenüber Referenz:** `fan.js`, `gotha.js`, `article.js`, geteiltes
   app-weites Familienmodell, Zweigsynchronisierung über fünf Ansichten (Tasks 7–13).

## Datenbestand (Ist)
- Seed enthält bereits umfangreiche, mit Quelle versehene Gossler-Daten
  (Status `belegt`/`unvollständig`, Quelle je Beziehung). Wird in Task 2/3 gegen die
  sieben Nutzerdokumente und geprüfte Web-Recherche abgeglichen und ergänzt.

## Offene Risiken
- Ohne Vereinheitlichung des Datenmodells (Finding 2) sind Tests und Ansichten nicht
  konsistent baubar.
- `private_seed/` muss vor jeder Versionierung ignoriert werden (Finding 3).
- Web-Recherche darf nur markiert und quellenbelegt in den Seed (Task 3), harte Regel:
  keine unbestätigten Familiendaten.

## Genealogie (Task 5)
Invarianten-Tests (`tests/genealogy.test.mjs`) laufen gegen den echten Seed und sind grün:
keine Selbstrelationen, keine verwaisten IDs, keine Duplikate, max 2 Eltern pro Kind,
keine Eltern-Zyklen, jede Beziehung hat Quelle + Status. Kinship-Terme, gemeinsamer
Vorfahre und DNA-Schätzung durch Regressionstests abgesichert. 17 Tests, alle grün.

### Liste unsicherer / unvollständiger Daten (nicht still korrigiert)
Personen:
- [unvollständig] Hella Schroeder, Eckart Schroeder (Geburts-/Sterbedaten fehlen in Quelle)
- [unvollständig] Axel Goßler (1944–1945, als Säugling auf der Flucht verstorben; Daten unsicher)
- [unsicher] Claus Goßler (1630/1639, †1713 vs. "nach 1704")
- [unsicher] Magdalena Witte (Ehefrau Claus nur in Kopftabelle; Fließtext: Name nicht ermittelt)
- [unsicher] Jacob Goßler (Sterbejahr "zwischen 1718 und 1734")
- [unsicher] Margarethe Elisabeth (Betty) Donner (Lebensdaten nur aus Kopftabelle)

Beziehungen:
- [unsicher] Claus ∞ Magdalena Witte (nur Kopftabelle)
- [unsicher] Anna Voigt → Johann Eibert (Mutterschaft; Kopftabelle stellte 1671 falsch als
  Sterbejahr dar, ist Geburtsjahr)
- [unsicher] Wilhelm 1811 → Wilhelm 1866 und Elisabeth Donner → Wilhelm 1866 (Verknüpfung nur
  aus Kopftabelle Chronik Original, kein Fließtext-/Webbeleg)

Diese Punkte sind im Seed markiert (status="unsicher"/"unvollständig") und in
`private_seed/gossler.seed.json` → `openQuestions` sowie `docs/GOSSLER_RESEARCH.md` erläutert.
