# Reiskompas v2.0-beta.3

Reiskompas is een persoonlijke stadsverkenner voor één dag of één bezoekmoment.

Geen dag-itinerary. Geen uurplanning. Geen meerdaagse reizen.

## Kern

- Kies stad/regio.
- Kies eventueel buurt, stadsdeel, wijk of POI als focus.
- Kies zoekstraal rondom dat focuspunt.
- Kies of je erheen reist of al in de buurt bent.
- Bekijk weer, bereikbaarheid, POI’s, eten/drinken en verborgen parels.
- Markeer plekken met `+`.
- Bewaar ze als lokaal dossier met notitie.
- Open je dossierbibliotheek direct vanaf het startformulier.

## Nieuw in v2.0-beta.3

- Bibliotheekknop bovenaan het formulier.
- Dossiers zijn zichtbaar zonder eerst een nieuwe zoekopdracht te doen.
- Reset selectie-knop toegevoegd.
- `window.__dossier` wordt expliciet gezet vóór dossier-rendering.
- Dossierweergave toont geselecteerde plekken.
- v2.0-beta.3 richting behouden: stadsverkenner, geen route/itinerary-planner.

## Bewust buiten scope

- Meerdaagse reizen.
- Uurplanning.
- ICS-export.
- Route-optimalisatie.
- Accounts/backend/cloudopslag.


## v2.0-beta.3

- Footer toegevoegd: `door Niels Braakman`.
- Eenvoudige **Over deze app** / README-modal toegevoegd.
- Modal beschrijft doel, bronnen, privacyvriendelijke opzet en bewuste beperkingen.


## v2.0-beta.3

- Custom-gebied flow explicieter gemaakt zodat het select-element lokaal wordt opgehaald bij handmatige gebiedsinvoer.
- Meta-description bijgewerkt naar de nieuwe stadsverkenner-scope.
- `esc()` aangescherpt zodat ook quotes worden escaped.
- Enkele belangrijke stille `catch`-blokken krijgen nu `console.warn()` voor debugbaarheid.


## v2.0-beta.3

- Plaatsherkenning conservatiever gemaakt, zodat `Delft` niet naar objecten zoals `Helft van Delft` springt.
- Kleine aliaslaag toegevoegd voor veelgebruikte plaatsen/focuspunten zoals Delft, Willemstad, Punda en Kissimmee.
- Vertrekpuntveld wordt bij automatische resolutie niet meer overschreven met een rare geocodernaam; de getypte tekst blijft staan.
