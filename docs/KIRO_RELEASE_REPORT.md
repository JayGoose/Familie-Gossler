# Kiro Release Report — gossler-family-tree

**Datum:** 2026-09-18
**Umfang:** Tasks 1–17 der Spec `.kiro/specs/production-finish` implementiert; Tasks 18/19/20
(Differential Visual QA, unabhängige Reviews, Release Gate) siehe unten.

**Release-Entscheidung: PASS WITH KNOWN GAPS.**
Begründung: Alle statisch/automatisiert prüfbaren Tore sind grün und die
nicht-verhandelbaren Sicherheits- und Genealogie-Regeln sind erfüllt. Zwei
Abnahmeklassen sind in dieser Umgebung nicht durchführbar (kein Browser, kein
Supabase-Projekt) und bleiben als benannte Lücken offen. **Kein produktiver
Go-Live, bevor die unten gelisteten LIVE-Punkte am echten Backend geprüft sind
und dann ein volles PASS vergeben wurde.**

## Evidence (selbst ausgeführt, 2026-09-18)
- Security guard (`python3 scripts/security_guard.py`): **PASS** (exit 0, „Security guard passed.")
- Clone audit (`python3 scripts/clone_audit.py`): **PASS** (beide Checks)
- Node-Tests (`node --test tests/`): **92 pass / 0 fail** (10 Testdateien)
- Relationship-/Genealogie-Invarianten (`tests/genealogy.test.mjs`, `tests/relationship.test.mjs`): **17 pass / 0 fail**
- Render-Smoke (`tests/render-smoke.test.mjs`): **4 pass** — Fächer(3 Modi+Zeitstrahl), Stammtafel,
  Gotha, Views(5 Ansichten+Highlight+showInTree) rendern gegen den echten Seed fehlerfrei.
- Auth E2E: **BLOCKED-NEEDS-ENV** (kein Supabase-Projekt konfiguriert)
- Guest E2E: **BLOCKED-NEEDS-ENV** (dito) — Backend-Pfad statisch geprüft (siehe Security)
- Admin E2E: **BLOCKED-NEEDS-ENV** (dito)
- Backup/Restore: **TEILWEISE** — `admin_export_family()` (SECURITY DEFINER, admin-gated) vorhanden;
  praktischer Restore-Durchlauf braucht Live-Backend (**BLOCKED-NEEDS-ENV**)
- Mobile (320/375/430px): **BLOCKED-NEEDS-ENV** — CSS-Breakpoints ergänzt (`public/css/app.css`),
  Pixelprüfung braucht Browser
- Accessibility: **TEILWEISE** — ARIA-Rollen/Labels an Fächer/Tree/Gotha/View-Switch,
  focus-visible, prefers-reduced-motion ergänzt; Screenreader-/Kontrast-Livecheck offen

## Nicht-verhandelbare Regeln
- **Keine erfundenen Familiendaten / Unsicheres markiert:** ERFÜLLT. 17 Invarianten-Tests grün;
  unabhängiger Seed-Check: 0 Selbst-/Waisen-/3-Eltern-Verstöße, jede Beziehung mit source+status,
  7 Personen + 4 Beziehungen als unsicher/unvollständig markiert, 10 offene Fragen dokumentiert.
- **Keine Secrets / Familientag-Code im Repo:** ERFÜLLT. Kein service-role-Key, kein JWT, kein
  echter Code committet; „Familientag-2026-…"-Treffer sind Input-Platzhalter, `service_role`-Treffer
  sind die Guard-Skripte selbst. `private_seed/`, `.venv/`, `demo-graph.json` gitignored.
- **RLS erzwingt Autorisierung:** ERFÜLLT (statisch). RLS auf allen 8 sensiblen Tabellen; Policies
  gaten auf `is_approved()`/`is_admin()`; Kontaktdaten in separater Tabelle `people_contacts`
  (nur member/admin); `people_public` ohne Kontaktspalten und mit `security_invoker=true`;
  Gast-Pfad `guest_family_snapshot` liefert nur eine Spalten-Whitelist ohne Kontaktfelder,
  read-only, code-gated; Familientag-Code bcrypt-gehasht + rate-limitiert (`_rl`-RPCs mit
  Client-Fingerprint). Live-Verifikation am echten Backend steht aus.
- **Kein Go-Live ohne PASS:** EINGEHALTEN — dieser Report ist bewusst PASS WITH KNOWN GAPS, nicht PASS.

## Unabhängige Reviews (Task 19)
Vier parallele Reviewer-Subagenten wurden gestartet (parity, security, genealogy, release).
Auf diesem Install wurden drei Transkripte nicht vollständig persistiert und der Security-Reviewer
analysierte ein HALLUZINIERTES Schema (nannte `relationships/rel_type`, `window.__ENV__`,
`tests/rls.test.js` — existiert hier alles nicht). **Seine Findings wurden daher verworfen und alle
Punkte vom Hauptagenten direkt gegen die echten Dateien nachgeprüft** (siehe oben). Eine echte
unabhängige Zweitprüfung durch eine zweite Person/Instanz bleibt empfohlen, bevor volles PASS.

## Offene Findings
- **MEDIUM (BEHOBEN 2026-09-18):** `guest_family_snapshot` validierte intern über die NICHT
  rate-limitierte `validate_family_day_code`. Migration `009_guest_snapshot_ratelimit.sql` leitet
  den Snapshot jetzt über `validate_family_day_code_rl(p_code, p_fingerprint)` und entzieht die alte
  1-Argument-Variante; `api.js` übergibt den Client-Fingerprint. Damit ist auch der direkte
  Snapshot-Aufruf rate-limitiert. Live-Verifikation am echten Backend steht noch aus.
- **UMGEBUNG:** Kein playwright-cli/Chromium und kein Supabase-Projekt → Live-Auth/RLS-Tests,
  mobile Pixelprüfung und praktischer Backup-Restore nicht durchführbar.

## Was für ein volles PASS noch fehlt (Go-Live-Voraussetzungen)
1. Supabase-Projekt anlegen, Migrationen 001–008 einspielen, Seed importieren, ersten Admin setzen.
2. Auth/Reset/Gastcode live testen; Gast sieht keine Kontakte; Member kann keine Adminaktion.
3. Backup exportieren UND praktisch zurückspielen.
4. Mobile Kernflows 320/375/430px und Accessibility-Kernflows im Browser prüfen.
5. MEDIUM-Finding (Snapshot-Rate-Limit) — BEHOBEN (Migration 009); nur noch live gegenprüfen.
6. Zweite unabhängige Review-Instanz über Security + Parität laufen lassen.
