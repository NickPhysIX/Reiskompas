# Reiskompas v1.1

Reiskompas is een kleine, client-side HTML/PWA om een bezoek aan een stad voor te bereiden met openbare bronnen.

## Wat doet de app?

De gebruiker vult bestemming, vertrekpunt, datum, gezelschap, interesses, eten/drinken en vervoerswijze in. De app maakt daarna een compact reisdossier met:

- verwachte weersomstandigheden of klimaatindicatie;
- bezienswaardigheden en activiteiten uit OpenStreetMap;
- eet- en drinkgelegenheden;
- auto-/EV-/OV-/fiets-/loopadvies;
- parkeermogelijkheden en laadpunten waar beschikbaar;
- kaartweergave;
- indicatieve dagplanning;
- agenda-export als `.ics`;
- printbare reisdossierweergave.

## Openbare bronnen

- Photon / Nominatim voor geocoding;
- Open-Meteo voor weer en historische klimaatdata;
- OpenStreetMap / Overpass voor POI's;
- OSRM demo-routing voor indicatieve autoroutes;
- Leaflet + OpenStreetMap tiles voor de kaart.

## v1.1 verbeteringen

- Overpass failover naar meerdere openbare endpoints;
- lokale cache via `localStorage` voor weer/Overpass-resultaten;
- bronstatus-badges;
- betere kind-/gezinsranking;
- extra kindvriendelijke POI-categorie;
- “Niet iedereen kent deze”-blok voor kleinere vondsten;
- favorieten met lokale opslag;
- printknop voor het reisdossier;
- iOS-installprompt;
- manifest, service worker en iconen toegevoegd.

## Installatie

Plaats alle bestanden in dezelfde map en publiceer ze bijvoorbeeld via GitHub Pages:

```text
index.html
manifest.webmanifest
sw.js
icon-180.png
icon-192.png
icon-512.png
README.md
CHANGELOG.md
```

Er is geen buildproces, backend, npm-installatie of API-key nodig.

## Belangrijke beperkingen

- Openbare API's kunnen tijdelijk traag of onbereikbaar zijn.
- Overpass-data is afhankelijk van de kwaliteit van OpenStreetMap-tags.
- Exacte prijzen, live verkeersinformatie, parkeerbezetting en live OV-tijden zitten niet betrouwbaar in deze keyless setup.
- OSRM demo-routing is indicatief en niet bedoeld als productie-SLA.

## Privacy

De app draait client-side. Favorieten en cache worden lokaal in de browser opgeslagen.
