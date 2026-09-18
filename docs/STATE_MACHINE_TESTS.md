# State Machine Test Plan

## unauthenticated
- Login sichtbar
- keine Familiendaten im DOM
- direkte API-Requests auf private Tabellen blockiert

## guest
- Familienstammbaum lesbar
- keine Kontakte
- kein Editieren
- kein Admin
- abgelaufener Code → Zugriff endet

## pending
- keine Familiendaten
- Statusseite
- Code kann Freigabe ermöglichen

## member
- Familie lesbar
- Kontakte lesbar
- eigenes Profil editierbar
- Platzhalter/Relationen ergänzbar
- kein Admin

## admin
- alle Member-Rechte
- Freigaben/Sperren
- Familientag-Code
- Backup-Export
- Nutzungsdaten

## kritische Übergänge
- none → guest
- none → pending
- pending → member
- member → blocked
- member → admin
- guest → expired
- reset-password → member
