# Produktions-Runbook

## Vor dem Go-Live

1. Supabase-Projekt in EU-Region anlegen.
2. Migrationen `001` bis `006` ausführen.
3. Ersten Admin manuell freigeben.
4. Gossler-Seed importieren.
5. `public/runtime-config.js` mit URL, anon key und Admin-E-Mail füllen.
6. GitHub Pages aktivieren.
7. Gastcode setzen und Ablaufdatum testen.
8. Test mit drei Konten:
   - Gast
   - Mitglied
   - Administrator
9. Prüfen:
   - Gast sieht keine E-Mail/Telefonnummern.
   - Mitglied kann eigenes Profil ändern.
   - Mitglied kann keine Nutzer freigeben.
   - Admin kann Nutzer freigeben/sperren.
   - Passwort-Reset funktioniert.
   - QR-Code öffnet die richtige Person.
   - Scanner benötigt nur Kamerazugriff.
10. Backup herunterladen und sicher speichern.

## Regelmäßige Pflege

- Monatlich: Backup herunterladen.
- Vierteljährlich: offene Nutzer prüfen.
- Halbjährlich: Familientag-Code wechseln.
- Jährlich: Supabase-Logs und Speicher überprüfen.
- Bei Ausscheiden eines Administrators: Adminrolle sofort entziehen.

## Datenschutz

- Keine privaten Kontaktdaten in GitHub committen.
- Keine Fotos lebender Personen ohne Zustimmung.
- Gastcode nicht öffentlich posten.
- GitHub-Repository möglichst privat halten; nur `public/` wird deployt.
