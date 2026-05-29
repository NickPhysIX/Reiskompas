# Reiskompas v1.4.1

Client-side HTML/PWA voor het voorbereiden van een stadsbezoek met openbare bronnen. Geen API-keys, geen backend — werkt op GitHub Pages en als web-app op iOS.

## Belangrijkste functies

- Weer via Open-Meteo, inclusief klimatologie-fallback voor datums buiten het ~16-daagse voorspelvenster.
- Bezienswaardigheden, restaurants, parkeren, laadpunten en OV-knooppunten via OpenStreetMap/Overpass.
- Overpass failover over meerdere publieke endpoints, met abort-timeout.
- LocalStorage-cache om herhaalde API-calls te beperken (TTL per type).
- Favorieten (★), bewaard over releases heen.
- Interesse-, kind- én gezelschapsgevoelige ranking.
- Sectie "Niet iedereen kent deze" (zonder dubbeling met de hoofdlijst).
- Dagplanning met ICS-export, Maps-deeplink en printweergave.
- PWA-installatie met manifest en service worker (cachet ook Leaflet voor offline).

## Bestanden

- `index.html` — HTML-shell, styling en layout.
- `app.js` — alle applicatielogica.
- `manifest.webmanifest` — PWA-metadata.
- `sw.js` — service worker voor app-shell + Leaflet caching.
- `icon-180.png`, `icon-192.png`, `icon-512.png` — app-iconen.
- `README.md`, `CHANGELOG.md`, `QA_CHECK.md`

## v1.4.1 in het kort

Review-fix release: apostrof-bug in de favorietknop, gelijkgetrokken versiestrings, reisgezelschap dat nu echt meeweegt, herstelde hidden-gems-logica, ge-de-versioneerde favorieten, Leaflet offline-cache en aparte debounce per adresveld. Zie `CHANGELOG.md`.

## Gebruik

Upload alle bestanden samen naar dezelfde map (bijv. een GitHub Pages-repo). Open daarna `index.html`. Voor PWA-installatie op iPhone/iPad: deelknop → "Zet op beginscherm".

## Bekende grenzen (bewust)

Prijzen (parkeren/brandstof), live verkeersdrukte en exacte OV-tijden zitten niet in gratis open bronnen; daarvoor staan doorkliks naar de officiële planners. OSM-dekking varieert per regio — grote steden zijn rijk gevuld, kleine plaatsen mager.
