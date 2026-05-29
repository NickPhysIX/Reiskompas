# Reiskompas v1.3

Client-side HTML/PWA voor het voorbereiden van een stadsbezoek met openbare bronnen.

## Belangrijkste functies

- Weer via Open-Meteo, inclusief climatologie-fallback voor latere datums.
- Bezienswaardigheden, restaurants, parkeren, laadpunten en OV-knooppunten via OpenStreetMap/Overpass.
- Overpass failover over meerdere publieke endpoints.
- LocalStorage-cache om herhaalde API-calls te beperken.
- Favorieten.
- Kindvriendelijke ranking.
- Sectie “Niet iedereen kent deze”.
- Dagplanning met ICS-export.
- Printbare reisdossierweergave.
- PWA-installatie met manifest en service worker.

## Bestanden

- `index.html` — schone HTML-shell, styling en layout.
- `app.js` — alle applicatielogica.
- `manifest.webmanifest` — PWA metadata.
- `sw.js` — service worker voor app-shell caching.
- `icon-180.png`, `icon-192.png`, `icon-512.png` — app-iconen.
- `README.md`
- `CHANGELOG.md`

## v1.3 QA-fix

Deze versie verwijdert de hybride situatie uit v1.2 waarbij er zowel een groot inline script als een extern `app.js` aanwezig waren. Vanaf v1.3 staat alle applicatielogica in `app.js`.

## Gebruik

Upload alle bestanden samen naar dezelfde map, bijvoorbeeld op GitHub Pages. Open daarna `index.html`.

