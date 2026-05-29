# Reiskompas v1.9.2

Reiskompas is een kleine, client-side PWA voor het voorbereiden van een stadsbezoek met openbare bronnen.

De app blijft bewust clean en lean:

- geen account
- geen backend
- geen tracking
- geen eigen API-keys
- werkt als statische GitHub Pages-app

## Wat doet Reiskompas?

Je vult in:

- bestemming
- eventueel een buurt/focusgebied
- vertrekplaats
- datum
- reisgezelschap
- interesses
- eten/drinken
- vervoer

Daarna maakt Reiskompas een praktisch reisdossier met:

- weerindicatie
- bezienswaardigheden
- verborgen parels
- eet- en drinkgelegenheden
- parkeerplaatsen / laadpunten / OV-knooppunten
- bereikbaarheid & verstoringen-checks
- logische routevolgorde
- routeweergave op de kaart
- Google Maps deeplink met waypoints
- optionele AI-adviesprompt voor Gemini of ChatGPT

## Belangrijkste bronnen

- OpenStreetMap / Overpass
- Open-Meteo
- OSRM
- Photon
- Nominatim
- Leaflet

## Belangrijkste functies

- Buurt-/wijkfocus binnen een stad.
- Kleinere zoekstralen bij gekozen focusgebied.
- Afstandssortering voor parkeren, laadpunten en OV.
- Favorieten via localStorage.
- Logische routevoorstellen in plaats van een strak tijdschema.
- Visuele routeweergave op de kaart.
- Bereikbaarheid & verstoringen-sectie met praktische checklinks.
- AI-promptgenerator zonder API-koppeling.
- PWA-installatie met manifest en service worker.

## v1.9.2

Housekeeping-release op basis van v1.9.

- README opgeschoond.
- Verouderde documentatie over oude agenda-export verwijderd.
- Terminologie gelijkgetrokken met de huidige functie: logische routevoorstellen.
- Versies en metadata bijgewerkt naar v1.9.2.
- Service-worker cache gebumpt.

Zie `CHANGELOG.md` voor de volledige ontwikkelgeschiedenis.


## v1.9.2

- Routefavorieten worden nu gefilterd op afstand tot het huidige focusgebied.
- Favorieten verder dan 3 km worden genegeerd voor de route.
- Waarschuwing toegevoegd wanneer oude favorieten uit een andere stad/regio worden genegeerd.
- Sanity-warning toegevoegd voor routes langer dan 5 km.
