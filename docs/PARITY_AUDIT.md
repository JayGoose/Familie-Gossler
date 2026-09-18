# Parity Audit Matrix

| Feature | Referenz | Gossler | Status | Anmerkung |
|---|---:|---:|---|---|
| Login | ✓ | ✓ | PASS | Supabase Auth vorbereitet |
| Registrierung | ✓ | ✓ | PASS | inkl. Familientag-Code |
| Passwort-Reset | ✓ | ✓ | PASS | Redirect muss live getestet werden |
| Gastzugang | ✓ | ✓ | PASS | serverseitig sanitisiert |
| Pending/Freigabe | ✓ | ✓ | PASS | Admin-Workflow vorhanden |
| „Wer bist du?“ | ✓ | ✓ | PASS | bestehende Person + neues Profil |
| Stammbaum | ✓ | ✓ | PASS WITH GAPS | echte Linienführung live visuell prüfen |
| Einklappen | ✓ | ✓ | PASS | Nachkommen |
| Minimap | ✓ | ✓ | PASS | vereinfachte Minimap |
| Ringansicht | ✓ | ✓ | PASS | Aktionschips ergänzt |
| Generationen | ✓ | ✓ | PASS | einklappbar, Sortierung nach Geburtsdatum |
| Zeitstrahl | ✓ | ✓ | PASS | Jahresregler vorhanden |
| Personensuche | ✓ | ✓ | PASS | global |
| Verwandtschaftspfad | ✓ | ✓ | PASS | graph-basiert |
| gemeinsamer Vorfahre | ✓ | ✓ | PASS | graph-basiert |
| DNA-Näherung | ✓ | ✓ | PASS | als Näherung gekennzeichnet |
| Profile | ✓ | ✓ | PASS | Overlay + Vollprofil |
| Profilbilder | ✓ | ✓ | PASS | Upload/Remove vorbereitet |
| Vita | ✓ | ✓ | PASS | Markdown |
| Vita nummerierte Liste | ✓ | ✓ | PASS | ergänzt |
| Beziehungen ergänzen | ✓ | ✓ | PASS | Parent/Partner/Sibling |
| Unverbundene Personen | ✓ | ✓ | PASS | ergänzt |
| QR-Code | ✓ | ✓ | PASS | qrcodejs |
| QR-Scanner | ✓ | ✓ | PASS WITH GAPS | Browser-Unterstützung variiert |
| Nutzerverwaltung | ✓ | ✓ | PASS | Rollen/Freigabe |
| Freigabe-Mail | ✓ | ✓ | PASS WITH GAPS | Resend/Supabase Secrets nötig |
| Familientag-Code | ✓ | ✓ | PASS | Ablaufdatum + Hash |
| Datenschutz | ✓ | ✓ | PASS | Textvorlage + Zugriffstrennung |
| Audit-Log | nicht sichtbar | ✓ | EXTRA | Gossler-Härtung |
| Backup-Export | nicht sichtbar | ✓ | EXTRA | Admin |
| CSP / Security Guard | nicht sichtbar | ✓ | EXTRA | Gossler-Härtung |

## Aktuelle Release-Einschätzung

**PASS WITH KNOWN GAPS**

Offen sind keine grundlegenden Produktfunktionen, aber vor öffentlichem Go-Live:
1. echte Live-Tests mit Supabase
2. mobile visuelle Prüfung
3. exakte Stammbaum-Linienführung visuell vergleichen
4. Passwort-Reset live testen
5. Edge-Function-Mailversand live testen
6. vollständige genealogische Datenprüfung
