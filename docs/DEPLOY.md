# Deployment

## 1. Supabase

1. Neues Supabase-Projekt in der EU-Region anlegen.
2. SQL-Dateien in `supabase/migrations/` in nummerierter Reihenfolge ausführen.
3. Unter Authentication die Site URL auf die GitHub-Pages-URL setzen.
4. Redirect URL für Passwort-Reset ebenfalls freigeben.
5. Ersten Benutzer registrieren.
6. Im SQL-Editor diesen Benutzer einmalig zum Admin machen:

```sql
update public.profiles
set status='approved', role='admin'
where user_id=(select id from auth.users where email='DEINE_EMAIL');
```

## 2. Gossler-Daten importieren

```bash
python scripts/make_seed_sql.py private_seed/gossler.seed.json > /tmp/gossler_seed.sql
```

`/tmp/gossler_seed.sql` im Supabase SQL Editor ausführen.

## 3. Frontend konfigurieren

In `public/js/config.js`:
- `SUPABASE_URL_HIER_EINTRAGEN`
- `SUPABASE_ANON_KEY_HIER_EINTRAGEN`
- `ADMIN_EMAIL_HIER_EINTRAGEN`

Der Supabase `anon` Key darf im Browser stehen. Niemals den Service Role Key eintragen.

## 4. GitHub Pages

1. Repository erstellen.
2. Projekt hochladen.
3. Settings → Pages → Source: GitHub Actions.
4. `main` pushen.
5. Workflow `.github/workflows/pages.yml` deployt `public/`.

## 5. Familientag-Code

Im Adminbereich der laufenden Seite Code + Ablaufdatum setzen.

## 6. Sicherheit

- `private_seed/` kann nach erfolgreichem Import aus dem öffentlichen GitHub-Repo entfernt
  oder in ein privates Repository verschoben werden.
- Keine E-Mails/Telefonnummern im `public/`-Ordner.
- Service Role Key nie im Browser.

## Freigabe-E-Mail
`supabase functions deploy approval-email`
Danach `RESEND_API_KEY` und `APPROVAL_FROM_EMAIL` als Supabase Secrets setzen.
