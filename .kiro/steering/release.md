---
inclusion: always
---
# Release Gate

Ein Release ist nur PASS, wenn:
- keine offenen Critical/High Security Findings
- Gast kann keine Kontakte/private Daten abrufen
- Member kann keine Adminaktionen ausführen
- Admin-Flows funktionieren
- Auth/Reset/Gastcode live getestet
- Relationship-Tests grün
- Backup und Restore praktisch getestet
- Mobile Kernflows geprüft
- Accessibility Kernflows geprüft
- Seed/Secrets nicht öffentlich
- genealogische Konflikte dokumentiert
- Parity-Matrix aktualisiert

Erlaubte Ergebnisse: PASS, PASS WITH KNOWN GAPS, FAIL.
Nur PASS ist Go-Live-Freigabe.
