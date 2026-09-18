# Familie Gossler – Digitaler Stammbaum

Vollständige Steuerungsbasis für eine Petersdorff-artige private Familienseite mit
der Familie Gossler.

## Start

```bash
npm run serve
```

Dann `http://localhost:8080`.

Ohne Supabase-Konfiguration erscheint die Anmeldeseite; für die Produktivfunktion
Supabase gemäß `docs/DEPLOY.md` einrichten.

## Wichtigste Dateien

- `public/js/config.js` – zentrale Konfiguration.
- `public/js/auth.js` – Login, Registrierung, Familientag.
- `public/js/api.js` – Datenzugriff.
- `public/js/relationship.js` – Verwandtschaftslogik.
- `public/js/tree.js`, `ring.js`, `generation.js`, `timeline.js` – Ansichten.
- `public/js/profile.js` – Profile, Vita, Beziehungen.
- `public/js/admin.js` – Nutzerverwaltung.
- `supabase/migrations/` – Datenbank + Sicherheit.
- `private_seed/gossler.seed.json` – Gossler-Ausgangsdaten.

## Dokumentation

- `docs/ARCHITECTURE.md`
- `docs/DEPLOY.md`
- `docs/FEATURE_PARITY.md`

## Datenschutz

Die privaten Gossler-Stammdaten werden für die Produktivseite aus Supabase geladen.
Der Gastmodus erhält keine Kontaktdaten.


## Produktions-Härtung

Diese Version enthält zusätzlich:
- Content Security Policy
- Referrer- und Permissions-Policy
- Audit-Log
- Admin-Backup-Export
- Security Guard für GitHub Actions
- Runtime-Konfiguration getrennt vom App-Code
- Go-Live-Checkliste
- Produktions-Runbook
- Datenschutzvorlage

Siehe:
- `docs/PRODUCTION_RUNBOOK.md`
- `docs/GO_LIVE_CHECKLIST.md`
- `docs/PRIVACY_TEMPLATE.md`


## Clone-Engineering QA

Diese Version wurde zusätzlich nach einem systematischen Clone-Engineering-Stack
strukturiert. Siehe:

- `docs/DEV_PROMPT_STACK.md`
- `docs/PARITY_AUDIT.md`
- `docs/GENEALOGY_INVARIANTS.md`
- `docs/STATE_MACHINE_TESTS.md`
- `scripts/clone_audit.py`

Der Audit prüft statisch, ob die zentralen Funktionsoberflächen vorhanden sind
und ob offensichtliche Secrets im öffentlichen Frontend liegen.
