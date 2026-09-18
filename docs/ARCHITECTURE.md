# Architektur

## Ziel

Die Anwendung bildet die öffentlich sichtbare Bedienlogik des Petersdorff-Familienstammbaums
für die Familie Gossler eigenständig nach. Der fremde Quellcode und fremde grafische Assets
werden nicht übernommen.

## Schichten

- `public/`: Browser-Anwendung.
- `public/js/config.js`: Familien- und Feature-Konfiguration.
- `public/js/auth.js`: Login, Registrierung, Reset, Gastmodus.
- `public/js/api.js`: Datenzugriff.
- `public/js/permissions.js`: Rollen/Rechte.
- `public/js/relationship.js`: Verwandtschaftsgraph, gemeinsame Vorfahren, Pfade.
- `public/js/tree.js`: klassische Baumansicht mit Einklappen + Minimap.
- `public/js/ring.js`: Ringansicht.
- `public/js/generation.js`: Generationenansicht.
- `public/js/timeline.js`: Zeitstrahl.
- `public/js/profile.js`: Profil, Vita, Bearbeitung, Verbindungen.
- `public/js/qr.js`: QR-Erzeugung + Kamera-Scanner.
- `public/js/admin.js`: Nutzerverwaltung und Familientag-Code.
- `supabase/migrations/`: Datenbank, RLS, Funktionen, Storage.
- `private_seed/`: lokale Gossler-Ausgangsdaten. Nicht nach `public/` kopieren.

## Datenschutz

Die Produktivseite lädt genealogische Daten nach Authentifizierung bzw. nach Validierung
des Familientag-Codes aus Supabase. Private Kontaktdaten liegen in einer separaten Tabelle.
Der Gastmodus bekommt nur einen sanitisierten Snapshot ohne E-Mail/Telefon.

## Rollen

- `guest`: lesen ohne Kontaktdaten.
- `pending`: registriert, noch nicht freigegeben.
- `member`: lesen, Kontakte, eigenes Profil + Platzhalter/Beziehungen.
- `admin`: zusätzlich Nutzerverwaltung und Freigaben.
