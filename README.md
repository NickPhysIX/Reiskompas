# Reiskompas v2.0-beta.10

Reiskompas is een persoonlijke stadsverkenner voor één dag of één bezoekmoment.

Geen dag-itinerary. Geen uurplanning. Geen meerdaagse reizen.

## Kern

- Kies stad/regio.
- Kies buurt, wijk, stadsdeel of focuspunt.
- Kies een zoekradius.
- Kies of je erheen reist of al aanwezig bent.
- Bekijk in volgorde: weer, reisadvies + parkeren/laden, verstoringen, kaart, POI's en horeca, dossier.
- Kies zelf je praktische aankomstpunt.
- Open de route in Google Maps of Apple Maps.
- Markeer interessante plekken met +.
- Bekijk je selectie op een aparte dossierkaart.
- Bewaar lokale dossiers met notities.

## Nieuw in beta.10

- Resultaatvolgorde herschikt naar een logischere leesvolgorde: weer → reisadvies (parkeren/laden) → verstoringen → kaart → POI's/horeca → dossier.
- De routekaart is een eigen sectie geworden, ná de verstoringen en vóór de POI-lijst.
- Export naar Apple Maps toegevoegd naast Google Maps; beide respecteren vertrekpunt, gekozen aankomstpunt en vervoersmodus.

## Eerder in beta.8 / beta.9

- beta.9 — Parkeer- en OV-opties tonen nu ook binnenstadsgarages: de fetch-limiet van Overpass is verhoogd zodat als *way* gemapte garages (Marktgarage, Zuidpoort, Phoenix) niet meer worden afgekapt vóór de afstandssortering.
- beta.8 — QA-fixes op de aankomstpuntkeuze: route blijft behouden als herberekening faalt, knop toont een pending-state, race-guard tegen snel wisselen, en het default-aankomstpunt is meteen zichtbaar gekozen.

## Aankomstpuntkeuze (sinds beta.7)

- Auto/EV: parkeerlocaties hebben een knop **Gebruik als aankomstpunt**.
- OV: OV-knooppunten hebben dezelfde keuze.
- Bij keuze wordt alleen route/kaart bijgewerkt; POI's, weer en dossier blijven staan.
- Kaart en Maps-export gebruiken het gekozen aankomstpunt.

## Bewust buiten scope

- Meerdaagse reizen.
- Dag-itineraries.
- ICS-export.
- Accountsystemen.
- Cloudopslag.
