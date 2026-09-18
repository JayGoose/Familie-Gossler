---
inclusion: always
---
# Technik

Frontend: statisches HTML/CSS/ES-Module-JavaScript unter `public/`.
Backend: Supabase Auth + Postgres + RLS/RPC + Storage + Edge Functions.
Hosting-Ziel: GitHub Pages für `public/`; Supabase für private Daten.
QR: qrcodejs; Scanner: BarcodeDetector, mit Browser-Kompatibilität beachten.

Bevorzuge vorhandene Architektur statt Framework-Rewrite. Ein Rewrite braucht eine klare,
messbare Begründung und Benutzerfreigabe.

Pflichtprüfungen:
- `python scripts/security_guard.py`
- `python scripts/clone_audit.py`
- vorhandene Relationship-Tests
- neue Regressionstests für jeden behobenen Fehler
