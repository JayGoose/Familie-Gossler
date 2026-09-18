---
inclusion: always
---
# Security & Privacy

Behandle alle Angaben lebender Familienmitglieder als privat.

Pflicht:
- Autorisierung serverseitig.
- RLS für Tabellen und Storage.
- SECURITY DEFINER Funktionen mit festem `search_path` und minimalen Grants.
- Keine Service-Role-, Mail- oder Admin-Secrets im Browser.
- Gast-Snapshot enthält nur ausdrücklich erlaubte Felder.
- Uploads: Typ/Größe/Pfad/Berechtigung prüfen.
- Vita-Ausgabe gegen XSS prüfen.
- IDOR, Rolleneskalation, direkte API-Aufrufe und manipulierte IDs testen.
- Public GitHub Repo darf `private_seed/` nicht enthalten.

Bei Unsicherheit: sicherere Variante wählen und als offenen Punkt dokumentieren.
