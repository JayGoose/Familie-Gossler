# Sicherheits-Checkliste

- [ ] Supabase-Projekt in EU-Region.
- [ ] Service Role Key niemals im Frontend.
- [ ] `public/` enthält keine privaten Stammdaten.
- [ ] Kontakte nur in `people_contacts`.
- [ ] Gastdaten ausschließlich über `guest_family_snapshot`.
- [ ] Familientag-Code nur gehasht in `family_settings`.
- [ ] Code hat Ablaufdatum.
- [ ] `robots.txt` + noindex gesetzt.
- [ ] RLS auf allen privaten Tabellen aktiv.
- [ ] Erstes Admin-Konto manuell bestätigt.
- [ ] Passwort-Reset-Redirect geprüft.
- [ ] Storage-Bucket nicht öffentlich.
- [ ] Vor Produktivstart Test mit Gast-, Member- und Admin-Konto.

## Security Review — Task 4 (2026-09-18)

Statischer Review der Supabase-Migrationen (001–008), der Edge Function und der
Frontend-Datenschicht `public/js/api.js`. Die DB-Prüfungen sind statisch (kein Live-Projekt
konfiguriert); die Policy-Logik wurde im SQL verifiziert.

### Positiv bestätigt
- [x] Service Role Key nur serverseitig: nur in `functions/approval-email/index.ts`
      aus `Deno.env`; kein Vorkommen in `public/` (clone_audit PASS).
- [x] Edge Function prüft Admin-Rolle (role=admin und status=approved) vor Versand.
- [x] Kontaktdaten in separater Tabelle `people_contacts`; `savePerson` entfernt
      email/phone aus dem people-Payload; Gast-Snapshot selektiert people OHNE Kontaktfelder.
- [x] RLS auf allen privaten Tabellen aktiv; Lesen erfordert `is_approved()`.
- [x] Storage-Bucket `profile-pictures` ist nicht public; Zugriff nur approved; signierte URLs.
- [x] Familientag-Code nur bcrypt-gehasht in `family_settings`, mit Ablaufdatum.

### Findings und Fixes (Migration 008 + api.js)
| ID | Schwere | Befund | Fix |
|---|---|---|---|
| S1 | KRITISCH | View `people_public` umging RLS (View läuft mit Owner-Rechten); `api.js` liest daraus. pending/anon hätten alle Personendaten lesen können. | `alter view ... set (security_invoker=true)`; `revoke from anon`, `grant select to authenticated`. Damit greift die people-RLS des Aufrufers (nur approved). |
| S2 | KRITISCH | `validate_family_day_code` (anon) ohne Rate-Limit → Gastcode brute-forcebar. | Neue `*_rl`-Funktionen mit Versuchsprotokoll `code_attempts` und Sperre (max 8 Fehlversuche/15 min je Fingerprint). `api.js` nutzt jetzt die rate-limitierte Variante. |
| S3 | MITTEL | `usage_events` Insert-Policy `with check(true)` erlaubte gefälschte Events. | Direktes Insert entzogen; Schreiben nur über `track_usage` (SECURITY DEFINER, setzt auth.uid() selbst). |
| S4 | GERING | `create_and_link_my_person` konnte ein zweites Profil anlegen trotz bestehender Verknüpfung. | Vorabprüfung: wirft `profile already linked`. |

### Offen / später verifizieren (kein Blocker für Struktur, aber vor Go-Live)
- Live-Test mit Gast-, pending-, member-, admin-Konto (RLS im echten Projekt).
- Passwort-Reset-Redirect-Allowlist im Supabase-Dashboard.
- `relations_delete_member`: jedes approved Mitglied darf jede Beziehung löschen
  (bewusst kollaborativ, wie in der Referenz; ohne Undo). Als bewusste Design-Entscheidung
  notiert, nicht als Bug.
