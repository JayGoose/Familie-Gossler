# Funktionsabgleich mit der Petersdorff-Referenz

Nachgebaut bzw. als Steuerungsmodul vorbereitet:

- Login
- Registrierung
- Passwort vergessen / neues Passwort
- Familientag-Gastzugang
- Registrierung mit Familientag-Code
- Pending/Freigabe-Status
- Nutzerverwaltung
- Familientag-Code + Ablaufdatum
- Nutzungszähler
- „Wer bist du?“
- vorhandenes Profil verknüpfen
- neues Profil erstellen
- klassische Stammbaumansicht
- Einklappen von Nachkommen
- Minimap
- Ringansicht
- Generationenansicht
- Zeitstrahl mit Jahresregler
- Legende
- Verwandtschaftspfad
- gemeinsamer Vorfahre
- DNA-Näherungswert
- Profil-Details
- Vita als Markdown
- Profil bearbeiten
- neue Beziehungen hinzufügen
- Platzhalter löschen
- QR-Code anzeigen
- QR-Code per Kamera scannen
- Datenschutzansicht
- Rollenabhängige Kontaktdaten
- GitHub-Pages-Deployment
- Supabase-Datenbank/RLS/Storage

Nicht 1:1 übernommen:
- Petersdorff-Wappen, Fotografien oder sonstige fremde Assets.
- Fremder Quellcode.
- Familiendaten der Familie von Petersdorff.

## Parity-Ergänzungen
- Profilbilder hochladen/anzeigen/löschen
- Ring-Aktionschips (?, + Kind, + Geschwister, ∞ Partner)
- Unverbundene Personen
- Generationen ein-/ausklappen
- Gossler-Nachname hervorgehoben
- Ganze Profilseite / Im Stammbaum zeigen
- Nummerierte Liste im Vita-Editor
- Admin-Verknüpfungsfeld
- Freigabe-Mail via Edge Function


## Korrektur des Paritätsziels
Die bisherige `ring.js`-Ansicht ist nur ein Zwischenprototyp und **nicht** Parity-PASS.
Final erforderlich ist `fan.js` als radialer Nachkommen-Sunburst gemäß
`PETERSDORFF_REFERENCE_MATRIX.md`.
