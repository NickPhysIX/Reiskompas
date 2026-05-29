# Reiskompas v1.9.10

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

## v1.9.10

Housekeeping-release op basis van v1.9.10.

- README opgeschoond.
- Verouderde documentatie over oude agenda-export verwijderd.
- Terminologie gelijkgetrokken met de huidige functie: logische routevoorstellen.
- Versies en metadata bijgewerkt naar v1.9.10.
- Service-worker cache gebumpt.

Zie `CHANGELOG.md` voor de volledige ontwikkelgeschiedenis.


## v1.9.10

- Routefavorieten worden nu gefilterd op afstand tot het huidige focusgebied.
- Favorieten verder dan 3 km worden genegeerd voor de route.
- Waarschuwing toegevoegd wanneer oude favorieten uit een andere stad/regio worden genegeerd.
- Sanity-warning toegevoegd voor routes langer dan 5 km.


## v1.9.10

- Permanente favorieten vervangen door sessiegebonden **Interessant voor deze trip**.
- Tripselecties worden niet meer opgeslagen in localStorage en vervuilen geen volgende bestemming.
- AI-prompt gebruikt alleen lokale tripselecties binnen het huidige focusgebied.
- Curaçao-labeling verbeterd zodat Willemstad/Jan Thiel niet als Netherlands in de prompt verschijnen.
- 'Laad meer'-knoppen toegevoegd voor bezienswaardigheden, eten en drinken.


## v1.9.10

- Selectie & route polish.
- Route gebruikt standaard alleen plekken die met `+` zijn gekozen voor deze trip.
- Als er nog geen selectie is, toont Reiskompas geen automatische route maar een knop **Gebruik suggesties toch**.
- `+` / `✓`-interface verduidelijkt dat het om tijdelijke tripselectie gaat, niet om permanente favorieten.
- Route-sectie toont nu een overzicht van gekozen plekken en genegeerde plekken buiten het focusgebied.


## v1.9.10

- Startmodus toegevoegd: **Ik reis erheen** / **Ik ben al in de buurt**.
- In lokale modus is vertrekplaats niet meer nodig.
- In lokale modus worden reisadvies en verstoringen vanaf vertrekplaats overgeslagen.
- Logische route start dan vanaf het focusgebied/buurtanker.
- AI-prompt vermeldt de startmodus.


## v1.9.10

- Bugfix: getypte bestemmingen worden nu automatisch herkend zonder dat je verplicht een autocomplete-suggestie hoeft aan te tikken.
- Bestemming wordt opgelost op korte pauze, Enter en blur.
- Buurt-/gebiedslijst laadt daarna automatisch.
- Vertrekplaats krijgt dezelfde robuustere fallback.
- Curaçao-labeling extra robuust gemaakt met coördinatenherkenning.


## v1.9.10

- Hotfix: app-initialisatie robuuster gemaakt voor iOS/Safari/PWA-cachegevallen.
- `app.js` wordt met `defer` geladen.
- Init is idempotent en draait ook wanneer `DOMContentLoaded` al voorbij is.
- Extra `load`-vangnet toegevoegd.
- Formulierbindings zijn null-toleranter gemaakt zodat één ontbrekend element niet de hele app breekt.
- Getypte bestemmingsresolutie iets sneller gemaakt.


## v1.9.10

- Hotfix: ontbrekende `sweepOldCaches()` expliciet hersteld.
- Bugfix: `setupAreaCustom()` gebruikte een niet-bestaande `key`-variabele; handmatige buurtinvoer werkt nu via `resolveCustomArea()`.
- Geocoder/autocomplete-fouten geven nu een hint in plaats van stil te falen.
- Getypte bestemming wordt bij genereren ook netjes teruggeschreven naar het inputveld.
